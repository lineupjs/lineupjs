/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../../model/Column';
import {createHeader, updateHeader} from './header';
import {IRankingContext} from './interfaces';
import RenderColumn, {IRenderers} from './RenderColumn';
import {IMultiLevelColumn} from '../../model/CompositeColumn';
import {round} from '../../utils';


export default class MultiLevelRenderColumn extends RenderColumn {
  constructor(c: IMultiLevelColumn & Column, renderers: IRenderers, index: number, private readonly columnPadding: number) {
    super(c, renderers, index);
  }

  private get mc() {
    return <IMultiLevelColumn & Column>this.c;
  }

  get width() {
    return this.c.getActualWidth() + this.columnPadding * this.mc.length;
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = super.createHeader(document, ctx);

    const wrapper = document.createElement('div');
    wrapper.classList.add('lu-nested');
    node.appendChild(wrapper);
    const mc = this.mc;
    if (mc.getCollapsed() || mc.getCompressed()) {
      return node;
    }
    mc.children.forEach((c, i) => {
      const n = createHeader(c, document, ctx);
      n.style.marginLeft = i > 0 ? `${this.columnPadding * 2}px`: null;
      wrapper.appendChild(n);
    });

    this.updateNested(wrapper, ctx);
    return node;
  }

  updateHeader(node: HTMLElement, ctx: IRankingContext) {
    super.updateHeader(node, ctx);

    const wrapper = <HTMLElement>node.querySelector('.lu-nested');
    if (!wrapper) {
      return; // too early
    }
    this.updateNested(wrapper, ctx);
  }

  private updateNested(wrapper: HTMLElement, ctx: IRankingContext) {
    const mc = this.mc;
    if (mc.getCollapsed() || mc.getCompressed()) {
      return;
    }
    // TODO change changes
    const sub = this.mc.children;
    const children = <HTMLElement[]>Array.from(wrapper.children);
    const total = this.width;

    sub.forEach((c, i) => {
      const node = children[i];
      node.style.width = `${round(100 * c.getActualWidth() / total, 2)}%`;
      node.className = `${c.cssClass ? ` ${c.cssClass}` : ''}${this.c.headerCssClass}${this.c.isFiltered() ? ' lu-filtered' : ''}`;
      updateHeader(node, c, ctx);
    });
  }
}
