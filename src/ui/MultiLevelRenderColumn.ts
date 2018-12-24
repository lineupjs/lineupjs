import {abortAbleAll, IAbortAblePromise, IAsyncUpdate, isAsyncUpdate, StyleManager} from 'lineupengine';
import {ILineUpFlags} from '../config';
import {round} from '../internal';
import {Column, IMultiLevelColumn} from '../model';
import {ISummaryRenderer} from '../renderer';
import {multiLevelGridCSSClass} from '../renderer/utils';
import {COLUMN_PADDING, cssClass} from '../styles';
import {createHeader, updateHeader} from './header';
import {IRankingContext} from './interfaces';
import RenderColumn from './RenderColumn';

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
    const r = super.createHeader();
    const wrapper = this.ctx.document.createElement('div');
    wrapper.classList.add(cssClass('nested'));
    wrapper.classList.add(multiLevelGridCSSClass(this.ctx.idPrefix, this.c));

    if (isAsyncUpdate(r)) {
      r.item.appendChild(wrapper);
    } else {
      r.appendChild(wrapper);
    }

    this.summaries.splice(0, this.summaries.length);
    this.mc.children.forEach((cc, i) => {
      const n = createHeader(cc, this.ctx, {
        extraPrefix: 'th',
        mergeDropAble: false,
        dragAble: this.flags.advancedModelFeatures,
        rearrangeAble: this.flags.advancedModelFeatures,
        resizeable: this.flags.advancedModelFeatures
      });
      n.classList.add(cssClass('header'), cssClass('nested-th'));
      (<any>n.style).gridColumnStart = (i + 1).toString();
      wrapper.appendChild(n);

      if (!this.renderers || !this.renderers.summary) {
        return;
      }
      const summary = this.ctx.summaryRenderer(cc, false);
      const summaryNode = this.ctx.asElement(summary.template);
      summaryNode.classList.add(cssClass('summary'), cssClass('th-summary'), cssClass(`renderer-${cc.getSummaryRenderer()}`));
      summaryNode.dataset.renderer = cc.getSummaryRenderer();
      n.appendChild(summaryNode);
      this.summaries.push(summary);
      summary.update(summaryNode);
    });

    return this.updateNested(wrapper, r);
  }

  updateHeader(node: HTMLElement) {
    const r = super.updateHeader(node);
    node = isAsyncUpdate(r) ? r.item : r;
    const wrapper = <HTMLElement>node.getElementsByClassName(cssClass('nested'))[0];
    if (!wrapper) {
      return r; // too early
    }
    node.appendChild(wrapper); // ensure the last one
    return this.updateNested(wrapper, r);
  }

  updateWidthRule(style: StyleManager) {
    const mc = this.mc;
    // need this for chrome to work properly
    const widths = mc.children.map((c) => `minmax(0, ${round(c.getWidth())}fr)`);
    const clazz = multiLevelGridCSSClass(this.ctx.idPrefix, this.c);
    style.updateRule(`stacked-${this.c.id}`, `.${clazz}`, {
      display: 'grid',
      gridTemplateColumns: widths.join(' ')
    });
    return clazz;
  }

  private updateNested(wrapper: HTMLElement, r: HTMLElement | IAsyncUpdate<HTMLElement>) {
    const sub = this.mc.children;
    const children = <HTMLElement[]>Array.from(wrapper.children);

    const toWait: IAbortAblePromise<void>[] = [];
    let header: HTMLElement;
    if (isAsyncUpdate(r)) {
      toWait.push(r.ready);
      header = r.item;
    } else {
      header = r;
    }

    sub.forEach((c, i) => {
      const node = children[i];
      updateHeader(node, c);

      if (!this.renderers || !this.renderers.summary) {
        return;
      }
      let summary = <HTMLElement>node.getElementsByClassName(cssClass('summary'))[0];
      const oldRenderer = summary.dataset.renderer;
      const currentRenderer = c.getSummaryRenderer();
      if (oldRenderer !== currentRenderer) {
        const renderer = this.ctx.summaryRenderer(c, false);
        summary.remove();
        summary = this.ctx.asElement(renderer.template);
        summary.classList.add(cssClass('summary'), cssClass('th-summary'), cssClass(`renderer-${currentRenderer}`));
        summary.dataset.renderer = currentRenderer;
        this.summaries[i] = renderer;
        node.appendChild(summary);
      }
      const ready = this.summaries[i].update(summary);
      if (ready) {
        toWait.push(ready);
      }
    });

    if (toWait.length === 0) {
      return header;
    }
    return {
      item: header,
      ready: <IAbortAblePromise<void>>abortAbleAll(toWait)
    };
  }
}
