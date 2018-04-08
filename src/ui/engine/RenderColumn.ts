/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {IColumn} from 'lineupengine/src';
import Column from '../../model/Column';
import {createHeader, updateHeader} from './header';
import {IDOMCellRenderer, IDOMGroupRenderer} from '../../renderer/IDOMCellRenderers';
import {IRankingContext} from './interfaces';
import {isSupportType} from '../../model/Ranking';


export interface IRenderers {
  singleId: string;
  single: IDOMCellRenderer;
  groupId: string;
  group: IDOMGroupRenderer;
}

const isOldFirefox = navigator.userAgent.indexOf('Firefox/52') >= 0;

export default class RenderColumn implements IColumn {
  constructor(public readonly c: Column, private readonly renderers: IRenderers, public readonly index: number) {

  }

  get width() {
    return this.c.getWidth();
  }

  get id() {
    return this.c.id;
  }

  get frozen() {
    return !isOldFirefox && (isSupportType(this.c.desc) || (<any>this.c.desc).frozen === true);
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = createHeader(this.c, document, ctx);
    this.updateHeader(node, ctx);
    return node;
  }

  updateHeader(node: HTMLElement, ctx: IRankingContext) {
    node.className = `lu-header ${this.c.cssClass ? ` ${this.c.cssClass}` : ''} ${this.c.headerCssClass}${ctx.autoRotateLabels ? ' rotateable' : ''}${this.c.isFiltered() ? ' lu-filtered' : ''}`;
    node.classList.toggle('frozen', this.frozen);
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
    node.classList.toggle('frozen', this.frozen);
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
      this.renderers.single.update(node, r, r.relativeIndex, r.group, ctx.statsOf(<any>this.c));
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
