/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../../model/Column';
import {createHeader, updateHeader} from './header';
import {IRankingContext} from './interfaces';
import RenderColumn, {IRenderers} from './RenderColumn';
import {IMultiLevelColumn} from '../../model/CompositeColumn';
import {round} from '../../utils';
import {isEdge, StyleManager} from 'lineupengine/src/style';
import {gridClass} from '../../renderer/MultiLevelCellRenderer';


export default class MultiLevelRenderColumn extends RenderColumn {
  constructor(c: IMultiLevelColumn & Column, renderers: IRenderers, index: number, private readonly columnPadding: number) {
    super(c, renderers, index);
  }

  private get mc() {
    return <IMultiLevelColumn & Column>this.c;
  }

  get width() {
    return this.c.getWidth() + this.columnPadding * this.mc.length;
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = super.createHeader(document, ctx);

    const wrapper = document.createElement('div');
    wrapper.classList.add('lu-nested');
    wrapper.classList.add(gridClass(this.c));
    node.appendChild(wrapper);
    const mc = this.mc;
    if (mc.getCollapsed()) {
      return node;
    }
    mc.children.forEach((c, i) => {
      const n = createHeader(c, document, ctx);
      n.style.marginLeft = i > 0 ? `${this.columnPadding * 2}px`: null;
      n.classList.add('lu-header');
      if (isEdge) {
        n.style.msGridColumn = (i + 1).toString();
      } else {
        (<any>n.style).gridColumnStart = (i + 1).toString();
      }
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

  updateWidthRule(style: StyleManager) {
    const mc = this.mc;
    const total = this.width;
    const widths = mc.children.map((c) => `${round(100 * c.getWidth() / total, 2)}%`);
    const clazz = gridClass(this.c);
    style.updateRule(`stacked-${this.c.id}`, `.lineup-engine .${clazz} {
      display: ${isEdge ? '-ms-grid' : 'grid'};
      ${isEdge ? '-ms-grid-columns' : 'grid-template-columns'}: ${widths.join(' ')};
    }`);
    return clazz;
  }

  private updateNested(wrapper: HTMLElement, ctx: IRankingContext) {
    const mc = this.mc;
    if (mc.getCollapsed()) {
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
