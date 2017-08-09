/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {IColumn} from 'lineupengine/src';
import Column, {ICategoricalStatistics, IStatistics} from '../../model/Column';
import ADataProvider, {IDataRow} from '../../provider/ADataProvider';
import {IFilterDialog} from '../../dialogs/AFilterDialog';
import {createToolbar, createSummary} from './header';
import {INumberColumn} from '../../model/NumberColumn';
import {ICategoricalColumn} from '../../model/CategoricalColumn';
import {IDOMCellRenderer} from '../../renderer/IDOMCellRenderers';
import {IDOMRenderContext} from '../../renderer/RendererContexts';

export interface IRankingContext extends IDOMRenderContext {
  readonly provider: ADataProvider;
  readonly options: {
    idPrefix: string;
    linkTemplates: string[];
    searchAble(col: Column): boolean;
    filters: { [type: string]: IFilterDialog };
  };

  statsOf(col: (INumberColumn | ICategoricalColumn) & Column): ICategoricalStatistics | IStatistics | null;
  getRow(index: number): IDataRow;
}

export default class RenderColumn implements IColumn {
  constructor(public readonly c: Column, private readonly renderer: IDOMCellRenderer, public readonly width: number, public readonly index: number) {

  }

  get id() {
    return this.c.id;
  }

  get frozen() {
    return false;
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = document.createElement('section');
    node.innerHTML = `<div class="lu-toolbar"></div><i class="lu-sort fa"></i><div class="lu-handle"></div><div class="lu-label">${this.c.label}</div><div class="lu-summary"></div>`;
    createToolbar(<HTMLElement>node.querySelector('div.lu-toolbar')!, this.c, ctx);
    createSummary(<HTMLElement>node.querySelector('div.lu-summary')!, this.c, ctx);

    return node;
  }

  updateHeader(node: HTMLElement, ctx: IRankingContext) {
    node.querySelector('div.lu-label')!.innerHTML = this.c.label;
    createSummary(<HTMLElement>node.querySelector('div.lu-summary')!, this.c, ctx);
  }

  createCell(index: number, document: Document, ctx: IRankingContext) {
    return asElement(document, this.renderer.template);
  }

  updateCell(node: HTMLElement, index: number, ctx: IRankingContext): HTMLElement|void {
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
