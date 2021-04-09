import { abortAbleAll, IAbortAblePromise, IAsyncUpdate, isAsyncUpdate, StyleManager } from 'lineupengine';
import { round } from '../internal';
import type { Column, IMultiLevelColumn } from '../model';
import type { ISummaryRenderer } from '../renderer';
import { multiLevelGridCSSClass } from '../renderer/utils';
import { COLUMN_PADDING, cssClass } from '../styles';
import { createHeader, updateHeader } from './header';
import RenderColumn from './RenderColumn';

/** @internal */
export default class MultiLevelRenderColumn extends RenderColumn {
  private summaries: ISummaryRenderer[] = [];

  private get mc() {
    return this.c as IMultiLevelColumn & Column;
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

    return this.updateNested(wrapper, r);
  }

  private matchChildren(wrapper: HTMLElement, children: Column[]) {
    function matches(col: Column, i: number) {
      //do both match?
      const n = wrapper.children[i] as HTMLElement;
      return n != null && n.dataset.colId === col.id;
    }

    if (children.every(matches) && children.length === wrapper.childElementCount) {
      // 1:1 match
      return;
    }

    const lookup = new Map(
      (Array.from(wrapper.children) as HTMLElement[]).map(
        (n: HTMLElement, i) =>
          [n.dataset.colId!, { node: n, summary: this.summaries[i] }] as [
            string,
            { node: HTMLElement; summary: ISummaryRenderer }
          ]
      )
    );

    // reset summaries array
    this.summaries = [];

    children.forEach((cc, i) => {
      const existing = lookup.get(cc.id);
      if (existing) {
        // reuse existing
        lookup.delete(cc.id);
        const n = existing.node;
        n.style.gridColumnStart = (i + 1).toString();
        wrapper.appendChild(n);
        this.summaries[i] = existing.summary;
        return;
      }

      const n = createHeader(cc, this.ctx, {
        extraPrefix: 'th',
        mergeDropAble: false,
        dragAble: this.flags.advancedModelFeatures,
        rearrangeAble: this.flags.advancedModelFeatures,
        resizeable: this.flags.advancedModelFeatures,
      });
      n.classList.add(cssClass('header'), cssClass('nested-th'));
      n.style.gridColumnStart = (i + 1).toString();
      wrapper.appendChild(n);

      if (!this.renderers || !this.renderers.summary) {
        return;
      }
      const summary = this.ctx.summaryRenderer(cc, false);
      const summaryNode = this.ctx.asElement(summary.template);
      summaryNode.classList.add(
        cssClass('summary'),
        cssClass('th-summary'),
        cssClass(`renderer-${cc.getSummaryRenderer()}`)
      );
      summaryNode.dataset.renderer = cc.getSummaryRenderer();
      n.appendChild(summaryNode);
      this.summaries[i] = summary;
      summary.update(summaryNode);
    });

    // delete not used ones anymore
    lookup.forEach((v) => v.node.remove());
  }

  updateHeader(node: HTMLElement) {
    const r = super.updateHeader(node);
    node = isAsyncUpdate(r) ? r.item : r;
    const wrapper = node.getElementsByClassName(cssClass('nested'))[0] as HTMLElement;
    if (!wrapper) {
      return r; // too early
    }
    node.appendChild(wrapper); // ensure the last one
    return this.updateNested(wrapper, r);
  }

  hasSummaryLine() {
    return super.hasSummaryLine() || this.mc.children.some((c) => Boolean(c.getMetaData().summary));
  }

  updateWidthRule(style: StyleManager) {
    const mc = this.mc;
    // need this for chrome to work properly
    const widths = mc.children.map((c) => `minmax(0, ${round(c.getWidth())}fr)`);
    const clazz = multiLevelGridCSSClass(this.ctx.idPrefix, this.c);
    style.updateRule(`stacked-${this.c.id}`, `.${clazz}`, {
      display: 'grid',
      gridTemplateColumns: widths.join(' '),
    });
    return clazz;
  }

  private updateNested(wrapper: HTMLElement, r: HTMLElement | IAsyncUpdate<HTMLElement>) {
    const sub = this.mc.isShowNestedSummaries() ? this.mc.children : [];

    this.matchChildren(wrapper, sub);

    const children = Array.from(wrapper.children) as HTMLElement[];

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
      let summary = node.getElementsByClassName(cssClass('summary'))[0] as HTMLElement;
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
      ready: abortAbleAll(toWait) as IAbortAblePromise<void>,
    };
  }
}
