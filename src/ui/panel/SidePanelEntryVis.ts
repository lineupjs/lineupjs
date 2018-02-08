import Column from '../../model/Column';
import {ISummaryRenderer} from '../../renderer/interfaces';
import {createToolbar, dragAbleColumn, updateHeader} from '../header';
import {IRankingHeaderContext} from '../interfaces';

/** @internal */
export default class SidePanelEntryVis {
  readonly node: HTMLElement;
  private readonly summary: ISummaryRenderer;

  constructor(public readonly column: Column, private ctx: IRankingHeaderContext, document: Document) {
    this.node = document.createElement('article');
    this.node.classList.add('lu-side-panel-entry');
    this.node.dataset.colId = column.id;
    this.node.dataset.type = column.desc.type;

    this.summary = ctx.summaryRenderer(column, true);

    this.column.on([`${Column.EVENT_FILTER_CHANGED}.panel`, `${Column.EVENT_DIRTY_HEADER}.panel`], () => {
      this.update();
    });
    this.init();
    this.update();
  }

  private init() {
    this.node.innerHTML = `
      <header><div class="lu-label"></div><div class="lu-toolbar"></div></header>${this.summary.template}`;
    createToolbar(<HTMLElement>this.node.querySelector('.lu-toolbar'), 0, this.column, this.ctx);
    dragAbleColumn(<HTMLElement>this.node.querySelector('header'), this.column, this.ctx);

    const summary = <HTMLElement>this.node.lastElementChild!;
    summary.classList.add('lu-summary');
    summary.dataset.renderer = this.column.getSummaryRenderer();
    summary.dataset.interactive = '';
  }

  update(ctx: IRankingHeaderContext = this.ctx) {
    this.ctx = ctx;
    updateHeader(this.node, this.column);
    this.summary.update(<HTMLElement>this.node.querySelector('.lu-summary')!, ctx.statsOf(<any>this.column));
  }

  destroy() {
    this.column.on([`${Column.EVENT_FILTER_CHANGED}.panel`, `${Column.EVENT_DIRTY_HEADER}.panel`], null);
    this.node.remove();
  }
}
