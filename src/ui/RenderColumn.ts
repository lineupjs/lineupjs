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

  createHeader() {
    const node = createHeader(this.c, this.ctx);
    node.className = `lu-header`;
    node.classList.toggle('frozen', this.frozen);

    if (this.renderers && this.renderers.summary) {
      node.insertAdjacentHTML('beforeend', this.renderers.summary.template);
      const summary = <HTMLElement>node.lastElementChild!;
      summary.dataset.renderer = this.renderers.summaryId;
      summary.classList.add('lu-summary');
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
      summary.innerHTML = this.renderers.summary.template;
      summary = <HTMLElement>summary.firstElementChild!;
      summary.classList.add('lu-summary');
      summary.dataset.renderer = currentRenderer;
      node.appendChild(summary);
    }
    this.renderers.summary.update(summary, this.ctx.statsOf(<any>this.c));
  }

  createCell(index: number) {
    const isGroup = this.ctx.isGroup(index);
    const node = asElement(this.ctx.document, isGroup ? this.renderers!.group.template : this.renderers!.single.template);
    node.dataset.renderer = isGroup ? this.renderers!.groupId : this.renderers!.singleId;
    node.dataset.group = isGroup ? 'g' : 'd';
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
      node.innerHTML = isGroup ? this.renderers!.group.template : this.renderers!.single.template;
      node = <HTMLElement>node.firstElementChild!;
      node.dataset.renderer = currentRenderer;
      node.dataset.group = currentGroup;
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
