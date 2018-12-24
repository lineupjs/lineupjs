import {Column, isMapAbleColumn, NumberColumn} from '../../model';
import {IAbortAblePromise} from '../../provider';
import {ISummaryRenderer} from '../../renderer';
import {cssClass, engineCssClass} from '../../styles';
import {createShortcutMenuItems, dragAbleColumn, updateHeader} from '../header';
import {IRankingHeaderContext} from '../interfaces';

/** @internal */
export default class SidePanelEntryVis {
  readonly node: HTMLElement;
  private summary: ISummaryRenderer;
  private summaryUpdater: IAbortAblePromise<void> | null = null;

  constructor(public readonly column: Column, private ctx: IRankingHeaderContext, document: Document) {
    this.node = document.createElement('article');
    this.node.classList.add(cssClass('side-panel-entry'));
    this.node.dataset.colId = column.id;
    this.node.dataset.type = column.desc.type;

    this.summary = ctx.summaryRenderer(column, true);

    this.column.on([`${NumberColumn.EVENT_FILTER_CHANGED}.panel`, `${Column.EVENT_DIRTY_HEADER}.panel`], () => {
      this.update();
    });
    this.column.on(`${Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED}.panel`, () => {
      this.recreateSummary();
    });
    this.init();
    this.update();
  }


  private init() {
    this.node.innerHTML = `
      <header class="${cssClass('side-panel-entry-header')}">
        <div class="${cssClass('label')} ${cssClass('typed-icon')} ${cssClass('side-panel-label')}"></div>
        <div class="${cssClass('toolbar')} ${cssClass('side-panel-toolbar')}"></div>
      </header>`;
    createShortcutMenuItems(<HTMLElement>this.node.querySelector(`.${cssClass('toolbar')}`), 0, this.column, this.ctx, false);
    dragAbleColumn(<HTMLElement>this.node.querySelector('header'), this.column, this.ctx);
    this.appendSummary();
  }

  update(ctx: IRankingHeaderContext = this.ctx) {
    this.ctx = ctx;
    updateHeader(this.node, this.column);
    this.updateSummary();
  }

  private updateSummary() {
    const summaryNode = <HTMLElement>this.node.querySelector(`.${cssClass('summary')}`)!;
    if (this.summaryUpdater) {
      this.summaryUpdater.abort();
      summaryNode.classList.remove(engineCssClass('loading'));
      this.summaryUpdater = null;
    }
    const r = this.summary.update(summaryNode);
    if (!r) {
      return;
    }

    this.summaryUpdater = r;
    summaryNode.classList.add(engineCssClass('loading'));
    r.then((a) => {
      if (typeof a === 'symbol') {
        return;
      }
      summaryNode.classList.remove(engineCssClass('loading'));
    });
  }

  private appendSummary() {
    const summary = this.ctx.asElement(this.summary.template);
    summary.classList.add(cssClass('summary'), cssClass('side-panel-summary'), cssClass('renderer'), cssClass(`renderer-${this.column.getSummaryRenderer()}`));
    summary.dataset.renderer = this.column.getSummaryRenderer();
    summary.dataset.interactive = isMapAbleColumn(this.column).toString();
    this.node.appendChild(summary);
  }

  private recreateSummary() {
    // remove old summary
    this.node.removeChild(this.node.querySelector(`.${cssClass('summary')}`)!!);

    this.summary = this.ctx.summaryRenderer(this.column, true);
    this.appendSummary();
    this.updateSummary();
  }

  destroy() {
    this.column.on([`${NumberColumn.EVENT_FILTER_CHANGED}.panel`, `${Column.EVENT_DIRTY_HEADER}.panel`, `${Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED}.panel`], null);
    this.node.remove();
  }
}
