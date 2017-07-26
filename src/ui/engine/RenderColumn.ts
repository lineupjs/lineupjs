/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {IColumn} from 'lineupengine/src';
import Column, {ICategoricalStatistics, IStatistics} from '../../model/Column';
import ADataProvider from '../../provider/ADataProvider';
import {IFilterDialog} from '../../dialogs/AFilterDialog';
import {createToolbar, createSummary} from './header';
import {INumberColumn} from '../../model/NumberColumn';
import {ICategoricalColumn} from '../../model/CategoricalColumn';

export interface IRankingContext {
  readonly provider: ADataProvider;
  readonly options: {
    idPrefix: string;
    linkTemplates: string[];
    searchAble(col: Column): boolean;
    filters: { [type: string]: IFilterDialog };
  };

  statsOf(col: (INumberColumn | ICategoricalColumn) & Column): ICategoricalStatistics | IStatistics;
}

export default class RenderColumn implements IColumn {
  constructor(public readonly c: Column, public readonly index: number) {

  }

  get id() {
    return this.c.id;
  }

  get width() {
    return this.c.getWidth();
  }

  get frozen() {
    return false;
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = document.createElement('div');
    node.innerHTML = `<div class="lu-toolbar"></div><i class=""/><div class="lu-handle"></div><div class="lu-label">${this.c.label}</div><div class="lu-summary"></div>`;
    createToolbar(<HTMLElement>node.querySelector('div.lu-toolbar')!, this.c, ctx);
    createSummary(<HTMLElement>node.querySelector('div.lu-summary'), this.c, ctx);

    return node;
  }

  updateHeader(node: HTMLElement, ctx: IRankingContext) {
    // TODO
  }

  createCell(index: number, document: Document, ctx: IRankingContext) {
    const node = document.createElement('div');
    node.textContent = `${this.c.label}@${index}`;
    return node;
  }

  updateCell(node: HTMLElement, index: number, ctx: IRankingContext): HTMLElement|void {
    node.textContent = `${this.c.label}@${index}`;
  }
}
