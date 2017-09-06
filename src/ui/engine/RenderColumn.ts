/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {IColumn} from 'lineupengine/src';
import Column from '../../model/Column';
import {createToolbar, dragWidth, handleDnD, updateHeader} from './header';
import {IDOMCellRenderer, IDOMGroupRenderer} from '../../renderer/IDOMCellRenderers';
import {IRankingContext} from './interfaces';


export interface IRenderers {
  singleId: string;
  single: IDOMCellRenderer;
  groupId: string;
  group: IDOMGroupRenderer;
}

export default class RenderColumn implements IColumn {
  constructor(public readonly c: Column, private readonly renderers: IRenderers, public readonly index: number) {

  }

  get width() {
    return this.c.getActualWidth();
  }

  get id() {
    return this.c.id;
  }

  get frozen() {
    return false;
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = document.createElement('section');
    node.innerHTML = `<div class="lu-toolbar"></div><i class="lu-sort"></i><div class="lu-handle"></div><div class="lu-label">${this.c.label}</div><div class="lu-summary"></div>`;
    createToolbar(<HTMLElement>node.querySelector('div.lu-toolbar')!, this.c, ctx);

    node.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.c.toggleMySorting();
    });

    handleDnD(node, this.c, ctx);

    dragWidth(this.c, node);
    this.updateHeader(node, ctx);
    return node;
  }


  updateHeader(node: HTMLElement, ctx: IRankingContext) {
    node.className = `${this.c.cssClass ? ` ${this.c.cssClass}` : ''}${(this.c.getCompressed() ? ' lu-compressed' : '')} ${this.c.headerCssClass}${ctx.autoRotateLabels ? ' rotateable' : ''}${this.c.isFiltered() ? ' lu-filtered' : ''}`;
    updateHeader(node, this.c, ctx);
  }

  createCell(index: number, document: Document, ctx: IRankingContext) {
    const isGroup = ctx.isGroup(index);
    const node = asElement(document, isGroup ? this.renderers.group.template : this.renderers.single.template);
    node.dataset.renderer = isGroup ? this.renderers.groupId : this.renderers.singleId;
    node.dataset.group = isGroup ? 'g' : 'd';
    this.updateCell(node, index, ctx);
    return node;
  }

  updateCell(node: HTMLElement, index: number, ctx: IRankingContext): HTMLElement | void {
    const isGroup = ctx.isGroup(index);
    // assert that we have the template of the right mode
    const oldRenderer = node.dataset.renderer;
    const currentRenderer = isGroup ? this.renderers.groupId : this.renderers.singleId;
    const oldGroup = node.dataset.group;
    const currentGroup = (isGroup ? 'g' : 'd');
    if (oldRenderer !== currentRenderer || oldGroup !== currentGroup) {
      node = asElement(document, isGroup ? this.renderers.group.template : this.renderers.single.template);
      node.dataset.renderer = currentRenderer;
      node.dataset.group = currentGroup;
    }
    if (isGroup) {
      const g = ctx.getGroup(index);
      this.renderers.group.update(node, g, g.rows, ctx.statsOf(<any>this.c));
    } else {
      const r = ctx.getRow(index);
      this.renderers.single.update(node, r, r.relativeIndex, r.group);
    }
    return node;
  }
}

function asElement(doc: Document, html: string): HTMLElement {
  const helper = doc.createElement('div');
  helper.innerHTML = html;
  const s = <HTMLElement>helper.firstElementChild!;
  helper.innerHTML = '';
  return s;
}
