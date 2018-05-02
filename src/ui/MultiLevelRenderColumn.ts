import {StyleManager} from 'lineupengine';
import {round} from '../internal';
import Column from '../model/Column';
import {IMultiLevelColumn} from '../model';
import {ISummaryRenderer} from '../renderer/interfaces';
import {gridClass} from '../renderer/MultiLevelCellRenderer';
import {COLUMN_PADDING} from '../styles';
import {createHeader, updateHeader} from './header';
import {IRankingContext} from './interfaces';
import RenderColumn from './RenderColumn';
import {ILineUpFlags} from '../interfaces';

/** @internal */
export default class MultiLevelRenderColumn extends RenderColumn {
  private readonly summaries: ISummaryRenderer[] = [];

  constructor(c: IMultiLevelColumn & Column, index: number, ctx: IRankingContext, flags: ILineUpFlags) {
    super(c, index, ctx, flags);
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
      const n = createHeader(cc, this.ctx, {
        mergeDropAble: false
      });
      n.classList.add('lu-header');
      (<any>n.style).gridColumnStart = (i + 1).toString();
      wrapper.appendChild(n);

      if (!this.renderers || !this.renderers.summary) {
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
    // need this for chrome to work properly
    const widths = mc.children.map((c) => `minmax(0, ${round(c.getWidth())}fr)`);
    const clazz = gridClass(this.c);
    style.updateRule(`stacked-${this.c.id}`, `.lineup-engine .${clazz} {
      display: grid;
      grid-template-columns: ${widths.join(' ')};
    }`);
    return clazz;
  }

  private updateNested(wrapper: HTMLElement) {
    const sub = this.mc.children;
    const children = <HTMLElement[]>Array.from(wrapper.children);
    sub.forEach((c, i) => {
      const node = children[i];
      updateHeader(node, c);

      if (!this.renderers || !this.renderers.summary) {
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
