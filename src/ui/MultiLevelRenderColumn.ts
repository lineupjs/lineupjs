import {StyleManager} from 'lineupengine/src/style';
import {round} from '../internal';
import Column from '../model/Column';
import {IMultiLevelColumn} from '../model/CompositeColumn';
import {ISummaryRenderer} from '../renderer/interfaces';
import {gridClass} from '../renderer/MultiLevelCellRenderer';
import {COLUMN_PADDING} from '../styles';
import {createHeader, updateHeader} from './header';
import {IRankingContext} from './interfaces';
import RenderColumn from './RenderColumn';


export default class MultiLevelRenderColumn extends RenderColumn {
  private readonly summaries: ISummaryRenderer[] = [];

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

    this.summaries.splice(0, this.summaries.length);
    this.mc.children.forEach((cc, i) => {
      const n = createHeader(cc, this.ctx);
      n.style.marginLeft = i > 0 ? `${COLUMN_PADDING * 2}px` : null;
      n.classList.add('lu-header');
      (<any>n.style).gridColumnStart = (i + 1).toString();
      wrapper.appendChild(n);

      if (!this.renderers.summary) {
        return;
      }
      const summary = this.ctx.summaryRenderer(cc, false);
      n.insertAdjacentHTML('beforeend', summary.template);
      const summaryNode = <HTMLElement>n.lastElementChild!;
      summaryNode.classList.add('lu-summary');
      summaryNode.dataset.renderer = cc.getSummaryRenderer();
      this.summaries.push(summary);
      summary.update(summaryNode, this.ctx.statsOf(<any>cc));
    });

    this.updateNested(wrapper);

    return node;
  }

  updateHeader(node: HTMLElement) {
    super.updateHeader(node);

    const wrapper = <HTMLElement>node.querySelector('.lu-nested');
    if (!wrapper) {
      return node; // too early
    }
    node.appendChild(wrapper); // ensure the last one
    this.updateNested(wrapper);
    return node;
  }

  updateWidthRule(style: StyleManager) {
    const mc = this.mc;
    const total = this.width;
    const widths = mc.children.map((c) => `${round(100 * c.getWidth() / total, 2)}%`);
    const clazz = gridClass(this.c);
    style.updateRule(`stacked-${this.c.id}`, `.lineup-engine .${clazz} {
      display: grid;
      grid-template-columns: ${widths.join(' ')};
      grid-template-rows: auto;
      grid-auto-columns: 0;
    }`);
    return clazz;
  }

  private updateNested(wrapper: HTMLElement) {
    const sub = this.mc.children;
    const children = <HTMLElement[]>Array.from(wrapper.children);
    sub.forEach((c, i) => {
      const node = children[i];
      updateHeader(node, c);
      node.classList.toggle('lu-filtered', c.isFiltered());

      if (!this.renderers.summary) {
        return;
      }
      let summary = <HTMLElement>node.querySelector('.lu-summary')!;
      const oldRenderer = summary.dataset.renderer;
      const currentRenderer = c.getSummaryRenderer();
      if (oldRenderer !== currentRenderer) {
        const renderer = this.ctx.summaryRenderer(c, false);
        summary.remove();
        summary.innerHTML = renderer.template;
        summary = <HTMLElement>summary.firstElementChild!;
        summary.classList.add('lu-summary');
        summary.dataset.renderer = currentRenderer;
        this.summaries[i] = renderer;
        node.appendChild(summary);
      }
      this.summaries[i].update(summary, this.ctx.statsOf(<any>c));
    });
  }
}
