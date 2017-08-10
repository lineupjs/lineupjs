/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {IColumn} from 'lineupengine/src';
import Column, {ICategoricalStatistics, IStatistics} from '../../model/Column';
import ADataProvider, {IDataRow} from '../../provider/ADataProvider';
import {IFilterDialog} from '../../dialogs/AFilterDialog';
import {createToolbar, createSummary, dragWidth, handleDnD} from './header';
import {INumberColumn} from '../../model/NumberColumn';
import {ICategoricalColumn} from '../../model/CategoricalColumn';
import {IDOMCellRenderer} from '../../renderer/IDOMCellRenderers';
import {IDOMRenderContext} from '../../renderer/RendererContexts';

export interface IRankingContextContainer extends IDOMRenderContext {
  provider: ADataProvider;
  options: {
    idPrefix: string;
    linkTemplates: string[];
    searchAble(col: Column): boolean;
    autoRotateLabels: boolean;
    filters: { [type: string]: IFilterDialog };
  };

  statsOf(col: (INumberColumn | ICategoricalColumn) & Column): ICategoricalStatistics | IStatistics | null;
  getRow(index: number): IDataRow;
}

export declare type IRankingContext = Readonly<IRankingContextContainer>;


/**
 * utility function to generate the tooltip text with description
 * @param col the column
 */
export function toFullTooltip(col: { label: string, description?: string }) {
  let base = col.label;
  if (col.description != null && col.description !== '') {
    base += `\n${col.description}`;
  }
  return base;
}

export default class RenderColumn implements IColumn {
  constructor(public readonly c: Column, private readonly rendererId: string, private readonly renderer: IDOMCellRenderer, public readonly index: number) {

  }

  get width() {
    return this.c.getActualWidth();
  }

  get id() {
    return this.c.id;
  }

  get frozen() {
    return false;
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = document.createElement('section');
    node.innerHTML = `<div class="lu-toolbar"></div><i class="lu-sort"></i><div class="lu-handle"></div><div class="lu-label">${this.c.label}</div><div class="lu-summary"></div>`;
    createToolbar(<HTMLElement>node.querySelector('div.lu-toolbar')!, this.c, ctx);

    node.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.c.toggleMySorting();
    });

    handleDnD(node, this.c, ctx);

    dragWidth(this.c, node);
    this.updateHeader(node, ctx);
    return node;
  }

  private isSortedByMe(): {asc: 'asc'|'desc'|undefined, priority: string|undefined} {
    const ranker = this.c.findMyRanker();
    if (!ranker) {
      return {asc: undefined, priority: undefined};
    }
    const criterias = ranker.getSortCriterias();
    const index = criterias.findIndex((c) => c.col === this.c);
    if (index < 0) {
      return {asc: undefined, priority: undefined};
    }
    return {
      asc: criterias[index].asc ? 'asc' : 'desc',
      priority: index.toString()
    };
  }

  updateHeader(node: HTMLElement, ctx: IRankingContext) {
    node.querySelector('div.lu-label')!.innerHTML = this.c.label;
    node.title = toFullTooltip(this.c);
    node.className = `${this.c.cssClass ? ` ${this.c.cssClass}` : ''}${(this.c.getCompressed() ? ' lu-compressed' : '')} ${this.c.headerCssClass}${ctx.options.autoRotateLabels ? ' rotateable' : ''}${this.c.isFiltered() ? ' lu-filtered' : ''}`;
    const sort = <HTMLElement>node.querySelector('.lu-sort')!;
    const {asc, priority} = this.isSortedByMe();
    sort.dataset.sort = asc;
    sort.dataset.priority = priority;


    createSummary(<HTMLElement>node.querySelector('div.lu-summary')!, this.c, ctx);
  }

  createCell(index: number, document: Document, ctx: IRankingContext) {
    const node = asElement(document, this.renderer.template);
    this.updateCell(node, index, ctx);
    return node;
  }

  updateCell(node: HTMLElement, index: number, ctx: IRankingContext): HTMLElement|void {
    node.dataset.renderer = this.rendererId;
    this.renderer.update(node, ctx.getRow(index), index);
  }
}

function asElement(doc: Document, html: string): HTMLElement {
  const helper = doc.createElement('div');
  helper.innerHTML = html;
  const s = <HTMLElement>helper.firstElementChild!;
  helper.innerHTML = '';
  return s;
}
