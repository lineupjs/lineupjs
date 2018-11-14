import {IColumn} from 'lineupengine';
import Column from '../model/Column';
import {ICellRenderer, IGroupCellRenderer} from '../renderer';
import {ISummaryRenderer} from '../renderer/interfaces';
import {createHeader, updateHeader} from './header';
import {IRankingContext} from './interfaces';
import {ILineUpFlags} from '../interfaces';
import {cssClass, engineCssClass} from '../styles/index';

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

  constructor(public readonly c: Column, public index: number, protected ctx: IRankingContext, protected readonly flags: ILineUpFlags) {

  }

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
    if (this.renderers.singleTemplate)  {
      return <HTMLElement>this.renderers.singleTemplate.cloneNode(true);
    }
    const elem = this.ctx.asElement(this.renderers.single.template);
    elem.classList.add(cssClass(`renderer-${this.renderers.singleId}`), cssClass('detail'));
    elem.dataset.renderer = this.renderers.singleId;
    elem.dataset.group = 'd';

    this.renderers.singleTemplate = <HTMLElement>elem.cloneNode(true);
    return elem;
  }

  private groupRenderer() {
    if (!this.renderers || !this.renderers.group) {
      return null;
    }
    if (this.renderers.groupTemplate)  {
      return <HTMLElement>this.renderers.groupTemplate.cloneNode(true);
    }
    const elem = this.ctx.asElement(this.renderers.group.template);
    elem.classList.add(cssClass(`renderer-${this.renderers.groupId}`), cssClass('group'));
    elem.dataset.renderer = this.renderers.groupId;
    elem.dataset.group = 'g';

    this.renderers.groupTemplate = <HTMLElement>elem.cloneNode(true);
    return elem;
  }

  private summaryRenderer() {
    if (!this.renderers || !this.renderers.summary) {
      return null;
    }
    if (this.renderers.summaryTemplate)  {
      return <HTMLElement>this.renderers.summaryTemplate.cloneNode(true);
    }
    const elem = this.ctx.asElement(this.renderers.summary.template);
    elem.classList.add(cssClass('summary'), cssClass('th-summary'), cssClass(`renderer-${this.renderers.summaryId}`));
    elem.dataset.renderer = this.renderers.summaryId;

    this.renderers.summaryTemplate = <HTMLElement>elem.cloneNode(true);
    return elem;
  }

  createHeader() {
    const node = createHeader(this.c, this.ctx, {
      extraPrefix: 'th',
      dragAble: this.flags.advancedUIFeatures,
      mergeDropAble: this.flags.advancedModelFeatures,
      rearrangeAble: this.flags.advancedUIFeatures,
      resizeable: this.flags.advancedUIFeatures
    });
    node.classList.add(cssClass('header'));
    if (!this.flags.disableFrozenColumns) {
      node.classList.toggle(engineCssClass('frozen'), this.frozen);
    }

    if (this.renderers && this.renderers.summary) {
      const summary = this.summaryRenderer()!;
      node.appendChild(summary);
    }
    this.updateHeader(node);
    return node;
  }

  updateHeader(node: HTMLElement) {
    updateHeader(node, this.c);
    if (!this.renderers || !this.renderers.summary) {
      return;
    }
    let summary = <HTMLElement>node.querySelector(`.${cssClass('summary')}`)!;
    const oldRenderer = summary.dataset.renderer;
    const currentRenderer = this.renderers.summaryId;
    if (oldRenderer !== currentRenderer) {
      summary.remove();
      summary = this.summaryRenderer()!;
      node.appendChild(summary);
    }
    this.renderers.summary.update(summary, this.ctx.statsOf(<any>this.c));
  }

  createCell(index: number) {
    const isGroup = this.ctx.isGroup(index);
    const node = isGroup ? this.groupRenderer()! : this.singleRenderer()!;
    this.updateCell(node, index);
    return node;
  }

  updateCell(node: HTMLElement, index: number): HTMLElement | void {
    if (!this.flags.disableFrozenColumns) {
      node.classList.toggle(engineCssClass('frozen'), this.frozen);
    }
    const isGroup = this.ctx.isGroup(index);
    // assert that we have the template of the right mode
    // FIXME
    const oldRenderer = node.dataset.renderer;
    const currentRenderer = isGroup ? this.renderers!.groupId : this.renderers!.singleId;
    const oldGroup = node.dataset.group;
    const currentGroup = (isGroup ? 'g' : 'd');
    if (oldRenderer !== currentRenderer || oldGroup !== currentGroup) {
      node = isGroup ? this.groupRenderer()! : this.singleRenderer()!;
    }
    if (isGroup) {
      const g = this.ctx.getGroup(index);
      this.renderers!.group.update(node, g, g.rows);
    } else {
      const r = this.ctx.getRow(index);
      this.renderers!.single.update(node, r, r.relativeIndex, r.group, r.meta);
    }
    return node;
  }

  renderCell(ctx: CanvasRenderingContext2D, index: number) {
    const r = this.ctx.getRow(index);
    const s = this.renderers!.single;
    return s.render && s.render(ctx, r, r.relativeIndex, r.group, r.meta);
  }
}
