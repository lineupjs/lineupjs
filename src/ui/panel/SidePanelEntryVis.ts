import Column from '../../model/Column';
import {ISummaryRenderer} from '../../renderer/interfaces';
import {createToolbar, dragAbleColumn, updateHeader} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import {NumberColumn} from '../../model';
import {cssClass} from '../../styles';

/** @internal */
export default class SidePanelEntryVis {
  readonly node: HTMLElement;
  private readonly summary: ISummaryRenderer;

  constructor(public readonly column: Column, private ctx: IRankingHeaderContext, document: Document) {
    this.node = document.createElement('article');
    this.node.classList.add(cssClass('side-panel-entry'));
    this.node.dataset.colId = column.id;
    this.node.dataset.type = column.desc.type;

    this.summary = ctx.summaryRenderer(column, true);

    this.column.on([`${NumberColumn.EVENT_FILTER_CHANGED}.panel`, `${Column.EVENT_DIRTY_HEADER}.panel`], () => {
      this.update();
    });
    this.init();
    this.update();
  }

  private init() {
    this.node.innerHTML = `
      <header class="${cssClass('side-panel-entry-header')}"><div class="${cssClass('label')}"></div><div class="${cssClass('toolbar')}"></div></header>${this.summary.template}`;
    createToolbar(<HTMLElement>this.node.querySelector(`.${cssClass('toolbar')}`), 0, this.column, this.ctx);
    dragAbleColumn(<HTMLElement>this.node.querySelector('header'), this.column, this.ctx);

    const summary = <HTMLElement>this.node.lastElementChild!;
    summary.classList.add(cssClass('summary'));
    summary.dataset.renderer = this.column.getSummaryRenderer();
    summary.dataset.interactive = '';
  }

  update(ctx: IRankingHeaderContext = this.ctx) {
    this.ctx = ctx;
    updateHeader(this.node, this.column);
    this.summary.update(<HTMLElement>this.node.querySelector(`.${cssClass('summary')}`)!, ctx.statsOf(<any>this.column));
  }

  destroy() {
    this.column.on([`${NumberColumn.EVENT_FILTER_CHANGED}.panel`, `${Column.EVENT_DIRTY_HEADER}.panel`], null);
    this.node.remove();
  }
}
