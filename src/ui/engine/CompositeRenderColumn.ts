/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {createHeader, updateHeader} from './header';
import {IRankingContext} from './interfaces';
import RenderColumn, {IRenderers} from './RenderColumn';
import {default as CompositeColumn} from '../../model/CompositeColumn';

export default class CompositeRenderColumn extends RenderColumn {
  constructor(c: CompositeColumn, renderers: IRenderers, index: number) {
    super(c, renderers, index);
  }

  private get mc() {
    return <CompositeColumn>this.c;
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = super.createHeader(document, ctx);

    node.addEventListener('mouseenter', () => {
      this.showOverlay(node);
    });
    node.addEventListener('mouseleave', () => {})
    const wrapper = document.createElement('div');
    wrapper.classList.add('lu-sub-nested');
    node.appendChild(wrapper);
    const mc = this.mc;
    if (mc.getCompressed()) {
      return node;
    }
    mc.children.forEach((c) => {
      const n = createHeader(c, document, ctx);
      n.classList.add('lu-header');
      wrapper.appendChild(n);
    });

    this.updateNested(wrapper, ctx);
    return node;
  }

  updateHeader(node: HTMLElement, ctx: IRankingContext) {
    super.updateHeader(node, ctx);
    const wrapper = <HTMLElement>node.querySelector('.lu-sub-nested');
    if (!wrapper) {
      return; // too early
    }
    this.updateNested(wrapper, ctx);
  }

  private updateNested(wrapper: HTMLElement, ctx: IRankingContext) {
    const mc = this.mc;
    if (mc.getCompressed()) {
      return;
    }
    const sub = this.mc.children;
    const children = <HTMLElement[]>Array.from(wrapper.children);
    sub.forEach((c, i) => {
      const node = children[i];
      node.className = `lu-header ${c.cssClass ? ` ${c.cssClass}` : ''}${this.c.headerCssClass}${this.c.isFiltered() ? ' lu-filtered' : ''}`;
      updateHeader(node, c, ctx);
    });
  }
}
