/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {IColumn} from 'lineupengine/src';
import Column from '../../model/Column';
import ADataProvider from '../../provider/ADataProvider';
import {IFilterDialog} from '../../dialogs/AFilterDialog';
import {createToolbar} from './header';
import StringColumn from '../../model/StringColumn';
import {summaryCategorical, summaryNumerical, summarySelection, summaryString} from './summary';
import {ICategoricalColumn, isCategoricalColumn} from '../../model/CategoricalColumn';
import {INumberColumn, isNumberColumn} from '../../model/NumberColumn';
import SelectionColumn from '../../model/SelectionColumn';

export interface IRankingContext {
  readonly provider: ADataProvider;
  readonly options: {
    idPrefix: string;
    linkTemplates: string[];
    searchAble(col: Column): boolean;
    filters: { [type: string]: IFilterDialog };
  };
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
    const summary = <HTMLElement>node.querySelector('div.lu-summary');
    if (this.c instanceof StringColumn) {
      summaryString(this.c, summary);
    } else if (isCategoricalColumn(this.c)) {
      summaryCategorical(<ICategoricalColumn&Column>this.c, summary, null); //TODO
    } else if (isNumberColumn(this.c)) {
      summaryNumerical(<INumberColumn&Column>this.c, summary, null);
    } else if (this.c instanceof SelectionColumn) {
      summarySelection(this.c, summary, ctx.provider);
    }
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
