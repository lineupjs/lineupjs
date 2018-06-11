import {IColumn} from 'lineupengine';
import Column from '../model/Column';
import {ICellRenderer, IGroupCellRenderer} from '../renderer';
import {ISummaryRenderer} from '../renderer/interfaces';
import {createHeader, updateHeader} from './header';
import {IRankingContext} from './interfaces';
import {ILineUpFlags} from '../interfaces';


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

  constructor(public readonly c: Column, public index: number, protected ctx: IRankingContext, private readonly flags: ILineUpFlags) {

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
    const elem = asElement(this.ctx.document, this.renderers.single.template);
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
    const elem = asElement(this.ctx.document, this.renderers.group.template);
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
    const elem = asElement(this.ctx.document, this.renderers.summary.template);
    elem.dataset.renderer = this.renderers.summaryId;
    elem.classList.add('lu-summary');
    this.renderers.summaryTemplate = <HTMLElement>elem.cloneNode(true);
    return elem;
  }

  createHeader() {
    const node = createHeader(this.c, this.ctx);
    node.className = `lu-header`;
    node.classList.toggle('frozen', this.frozen);

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
    let summary = <HTMLElement>node.querySelector('.lu-summary')!;
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
    node.classList.toggle('frozen', this.frozen);
    const isGroup = this.ctx.isGroup(index);
    // assert that we have the template of the right mode
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
      this.renderers!.single.update(node, r, r.relativeIndex, r.group);
    }
    return node;
  }

  renderCell(ctx: CanvasRenderingContext2D, index: number) {
    const r = this.ctx.getRow(index);
    this.renderers!.single.render(ctx, r, r.relativeIndex, r.group);
  }
}

function asElement(doc: Document, html: string): HTMLElement {
  const helper = doc.createElement('div');
  helper.innerHTML = html;
  const s = <HTMLElement>helper.firstElementChild!;
  helper.innerHTML = '';
  return s;
}
