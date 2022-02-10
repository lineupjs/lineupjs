import { IColumn, IAbortAblePromise, IAsyncUpdate, isAbortAble } from 'lineupengine';
import type { Column } from '../model';
import type { ICellRenderer, IGroupCellRenderer } from '../renderer';
import type { ISummaryRenderer, IRenderCallback } from '../renderer';
import { createHeader, updateHeader } from './header';
import type { IRankingContext } from './interfaces';
import type { ILineUpFlags } from '../config';
import { cssClass, engineCssClass } from '../styles';
import { isPromiseLike } from '../internal';

export interface IRenderers {
  singleId: string;
  single: ICellRenderer;
  groupId: string;
  group: IGroupCellRenderer;
  summaryId: string;
  summary: ISummaryRenderer | null;
  singleTemplate: HTMLElement | null;
  groupTemplate: HTMLElement | null;
  summaryTemplate: HTMLElement | null;
}

export default class RenderColumn implements IColumn {
  renderers: IRenderers | null = null;

  constructor(
    public readonly c: Column,
    public index: number,
    protected ctx: IRankingContext,
    protected readonly flags: ILineUpFlags
  ) {}

  get width() {
    return this.c.getWidth();
  }

  get id() {
    return this.c.id;
  }

  get frozen() {
    return this.flags.disableFrozenColumns ? false : this.c.frozen;
  }

  private singleRenderer() {
    if (!this.renderers || !this.renderers.single) {
      return null;
    }
    if (this.renderers.singleTemplate) {
      return this.renderers.singleTemplate.cloneNode(true) as HTMLElement;
    }
    const elem = this.ctx.asElement(this.renderers.single.template);
    elem.classList.add(cssClass(`renderer-${this.renderers.singleId}`), cssClass('detail'));
    elem.dataset.renderer = this.renderers.singleId;
    elem.dataset.group = 'd';

    this.renderers.singleTemplate = elem.cloneNode(true) as HTMLElement;
    return elem;
  }

  private groupRenderer() {
    if (!this.renderers || !this.renderers.group) {
      return null;
    }
    if (this.renderers.groupTemplate) {
      return this.renderers.groupTemplate.cloneNode(true) as HTMLElement;
    }
    const elem = this.ctx.asElement(this.renderers.group.template);
    elem.classList.add(cssClass(`renderer-${this.renderers.groupId}`), cssClass('group'));
    elem.dataset.renderer = this.renderers.groupId;
    elem.dataset.group = 'g';

    this.renderers.groupTemplate = elem.cloneNode(true) as HTMLElement;
    return elem;
  }

  private summaryRenderer() {
    if (!this.renderers || !this.renderers.summary) {
      return null;
    }
    if (this.renderers.summaryTemplate) {
      return this.renderers.summaryTemplate.cloneNode(true) as HTMLElement;
    }
    const elem = this.ctx.asElement(this.renderers.summary.template);
    elem.classList.add(cssClass('summary'), cssClass('th-summary'), cssClass(`renderer-${this.renderers.summaryId}`));
    elem.dataset.renderer = this.renderers.summaryId;

    this.renderers.summaryTemplate = elem.cloneNode(true) as HTMLElement;
    return elem;
  }

  createHeader(): HTMLElement | IAsyncUpdate<HTMLElement> {
    const node = createHeader(this.c, this.ctx, {
      extraPrefix: 'th',
      dragAble: this.flags.advancedUIFeatures,
      mergeDropAble: this.flags.advancedModelFeatures,
      rearrangeAble: this.flags.advancedUIFeatures,
      resizeable: this.flags.advancedUIFeatures,
    });
    node.classList.add(cssClass('header'));
    if (!this.flags.disableFrozenColumns) {
      node.classList.toggle(engineCssClass('frozen'), this.frozen);
    }

    if (this.renderers && this.renderers.summary) {
      const summary = this.summaryRenderer()!;
      node.appendChild(summary);
    }
    return this.updateHeader(node);
  }

  hasSummaryLine() {
    return Boolean(this.c.getMetaData().summary);
  }

  updateHeader(node: HTMLElement): HTMLElement | IAsyncUpdate<HTMLElement> {
    updateHeader(node, this.c);
    if (!this.renderers || !this.renderers.summary) {
      return node;
    }
    let summary = node.getElementsByClassName(cssClass('summary'))[0]! as HTMLElement;
    summary.remove();
    summary = this.summaryRenderer()!;
    node.appendChild(summary);
    const ready = this.renderers.summary.update(summary);
    if (ready) {
      return { item: node, ready };
    }
    return node;
  }

  createCell(index: number): HTMLElement | IAsyncUpdate<HTMLElement> {
    const isGroup = this.ctx.isGroup(index);
    const node = isGroup ? this.groupRenderer()! : this.singleRenderer()!;
    return this.updateCell(node, index);
  }

  updateCell(node: HTMLElement, index: number): HTMLElement | IAsyncUpdate<HTMLElement> {
    if (!this.flags.disableFrozenColumns) {
      node.classList.toggle(engineCssClass('frozen'), this.frozen);
    }
    const isGroup = this.ctx.isGroup(index);
    // assert that we have the template of the right mode
    const oldRenderer = node.dataset.renderer;
    const currentRenderer = isGroup ? this.renderers!.groupId : this.renderers!.singleId;
    const oldGroup = node.dataset.group;
    const currentGroup = isGroup ? 'g' : 'd';
    if (oldRenderer !== currentRenderer || oldGroup !== currentGroup) {
      node = isGroup ? this.groupRenderer()! : this.singleRenderer()!;
    }
    let ready: IAbortAblePromise<void> | void | null;
    if (isGroup) {
      const g = this.ctx.getGroup(index);
      ready = this.renderers!.group.update(node, g);
    } else {
      const r = this.ctx.getRow(index);
      const row = this.ctx.provider.getRow(r.dataIndex);
      if (!isPromiseLike(row)) {
        ready = this.renderers!.single.update(node, row, r.relativeIndex, r.group);
      } else {
        ready = chainAbortAble(row, (row) => this.renderers!.single.update(node, row, r.relativeIndex, r.group));
      }
    }
    if (ready) {
      return { item: node, ready };
    }
    return node;
  }

  renderCell(ctx: CanvasRenderingContext2D, index: number): boolean | IAbortAblePromise<IRenderCallback> {
    const r = this.ctx.getRow(index);
    const s = this.renderers!.single;
    if (!s.render) {
      return false;
    }
    const row = this.ctx.provider.getRow(r.dataIndex);
    if (!isPromiseLike(row)) {
      return s.render(ctx, row, r.relativeIndex, r.group) || false;
    }
    return chainAbortAble(row, (row) => s.render!(ctx, row, r.relativeIndex, r.group) || false);
  }
}

function chainAbortAble<T, U, V>(
  toWait: Promise<T>,
  mapper: (value: T) => IAbortAblePromise<U> | V
): IAbortAblePromise<U> | V {
  let aborted = false;
  const p: any = new Promise<IAbortAblePromise<U> | null | void>((resolve) => {
    if (aborted) {
      return;
    }
    toWait.then((r) => {
      if (aborted) {
        return;
      }
      const mapped = mapper(r);
      if (isAbortAble(mapped as any)) {
        p.abort = (mapped as IAbortAblePromise<U>).abort.bind(mapped);
        return p.then(resolve);
      }
      return resolve(mapped as any);
    });
  });

  p.abort = () => {
    aborted = true;
  };
  return p;
}
