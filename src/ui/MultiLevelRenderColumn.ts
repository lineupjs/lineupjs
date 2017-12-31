/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../model/Column';
import {createHeader, updateHeader} from './header';
import {IRankingContext, ISummaryUpdater} from './interfaces';
import RenderColumn from './RenderColumn';
import {IMultiLevelColumn} from '../model/CompositeColumn';
import {round} from '../internal/math';
import {isEdge, StyleManager} from 'lineupengine/src/style';
import {gridClass} from '../renderer/MultiLevelCellRenderer';
import {COLUMN_PADDING} from '../styles';
import {findTypeLike} from '../model/utils';


export default class MultiLevelRenderColumn extends RenderColumn {
  private readonly summaries: (ISummaryUpdater|null)[] = [];

  constructor(c: IMultiLevelColumn & Column, index: number, ctx: IRankingContext) {
    super(c, index, ctx);
  }

  private get mc() {
    return <IMultiLevelColumn & Column>this.c;
  }

  get width() {
    return this.c.getWidth() + COLUMN_PADDING * this.mc.length;
  }

  createHeader() {
    const node = super.createHeader();
    const wrapper = this.ctx.document.createElement('div');
    wrapper.classList.add('lu-nested');
    wrapper.classList.add(gridClass(this.c));
    node.appendChild(wrapper);

    this.mc.children.forEach((cc, i) => {
      const n = createHeader(cc, this.ctx);
      n.style.marginLeft = i > 0 ? `${COLUMN_PADDING * 2}px`: null;
      n.classList.add('lu-header');
      if (isEdge) {
        n.style.msGridColumn = (i + 1).toString();
      } else {
        (<any>n.style).gridColumnStart = (i + 1).toString();
      }

      const summary = findTypeLike(cc, this.ctx.summaries);
      this.summaries.push(!summary ? null : new summary(cc, <HTMLElement>n.querySelector('.lu-summary')!, false));
      wrapper.appendChild(n);
    });

    return node;
  }

  updateHeader(node: HTMLElement) {
    super.updateHeader(node);

    const wrapper = <HTMLElement>node.querySelector('.lu-nested');
    if (!wrapper) {
      return node; // too early
    }
    this.updateNested(wrapper);
    return node;
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

  private updateNested(wrapper: HTMLElement) {
    const sub = this.mc.children;
    const children = <HTMLElement[]>Array.from(wrapper.children);
    sub.forEach((c, i) => {
      const node = children[i];
      node.classList.toggle('lu-filtered', c.isFiltered());
      updateHeader(node, c);
      if (this.summaries[i]) {
        this.summaries[i]!.update(this.ctx);
      }
    });
  }
}
