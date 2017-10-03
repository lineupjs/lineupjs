/**
 * Created by Samuel Gratzl on 27.09.2017.
 */
import {ITableSection} from 'lineupengine/src/table/MultiTableRowRenderer';
import {ACellTableSection, ICellRenderContext} from 'lineupengine/src/table/ACellTableSection';
import GridStyleManager from 'lineupengine/src/style/GridStyleManager';
import Ranking from '../../model/Ranking';
import RenderColumn, {IRenderers} from './RenderColumn';
import Column, {IFlatColumn} from '../../model/Column';
import MultiLevelRenderColumn from './MultiLevelRenderColumn';
import {IExceptionContext, uniformContext} from 'lineupengine/src/logic';
import StackColumn from '../../model/StackColumn';
import {nonUniformContext} from 'lineupengine/src/index';
import {isMultiLevelColumn} from '../../model/CompositeColumn';
import {IGroupData, IGroupItem, IRankingBodyContext, IRankingHeaderContextContainer, isGroup} from './interfaces';
import {IDOMRenderContext} from '../../renderer/RendererContexts';
import {IDataRow} from '../../provider/ADataProvider';
import {debounce} from '../../utils';

export interface IEngineRankingContext extends IRankingHeaderContextContainer, IDOMRenderContext {
  columnPadding: number;

  createRenderer(c: Column): IRenderers;
}

export interface ICallbacks {
  widthChanged(): void;
  updateData(): void;
}

export default class EngineRanking extends ACellTableSection<RenderColumn> implements ITableSection {
  private _context: ICellRenderContext<RenderColumn>;

  private readonly renderCtx: IRankingBodyContext;
  private data: (IGroupItem | IGroupData)[] = [];

  constructor(public readonly ranking: Ranking, header: HTMLElement, body: HTMLElement, tableId: string, style: GridStyleManager, private readonly ctx: IEngineRankingContext, private readonly callbacks: ICallbacks) {
    super(header, body, tableId, style);

    ranking.on(`${Ranking.EVENT_DIRTY_HEADER}.body`, debounce(() => this.updateHeaders(), 50));
    ranking.on(`${Ranking.EVENT_DIRTY_VALUES}.body`, debounce(() => this.updateBody(), 50));
    ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.body`, () => {
      this.callbacks.updateData();
    });

    this.renderCtx = Object.assign({
      isGroup: (index: number) => isGroup(this.data[index]),
      getRow: (index: number) => <IGroupItem>this.data[index],
      getGroup: (index: number) => <IGroupData>this.data[index]
    }, ctx);

    // default context
    const columns = this.createColumns();
    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100, this.ctx.columnPadding)
    }, uniformContext(0, 20));
  }

  get id() {
    return this.ranking.id;
  }

  protected onVisibilityChanged(visible: boolean) {
    super.onVisibilityChanged(visible);
    if (visible) {
      this.callbacks.updateData();
    }
  }

  updateHeaders() {
    return super.updateHeaders();
  }

  get currentData() {
    return this.data;
  }

  get context() {
    return this._context;
  }

  protected createHeader(document: Document, column: RenderColumn) {
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    return column.createHeader(document, this.renderCtx);
  }

  protected updateHeader(node: HTMLElement, column: RenderColumn) {
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    return column.updateHeader(node, this.renderCtx);
  }

  protected createCell(document: Document, index: number, column: RenderColumn) {
    return column.createCell(index, document, this.renderCtx);
  }

  protected updateCell(node: HTMLElement, index: number, column: RenderColumn) {
    return column.updateCell(node, index, this.renderCtx);
  }

  updateBody() {
    if (this.hidden) {
      return;
    }
    this.forEachRow((row, rowIndex) => this.updateRow(row, rowIndex));
  }

  updateHeaderOf(i: number) {
    const node = <HTMLElement>this.header.children[i]!;
    const column = this._context.columns[i];
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    this.updateHeader(node, column);
  }

  protected createRow(node: HTMLElement, rowIndex: number): void {
    super.createRow(node, rowIndex);
    const isGroup = this.renderCtx.isGroup(rowIndex);

    if (isGroup) {
      node.dataset.agg = 'group';
      return;
    }

    const dataIndex = this.renderCtx.getRow(rowIndex).dataIndex;
    node.dataset.dataIndex = dataIndex.toString();
    node.dataset.agg = 'detail'; //or 'group'
    if (this.ctx.provider.isSelected(dataIndex)) {
      node.classList.add('lu-selected');
    } else {
      node.classList.remove('lu-selected');
    }
    node.onclick = (evt) => {
      const dataIndex = parseInt(node.dataset.dataIndex!, 10);
      this.ctx.provider.toggleSelection(dataIndex, evt.ctrlKey);
    };
  }

  protected updateRow(node: HTMLElement, rowIndex: number): void {
    const isGroup = this.renderCtx.isGroup(rowIndex);
    const wasGroup = node.dataset.agg === 'group';

    if (isGroup !== wasGroup) {
      // change of mode clear the children to reinitialize them
      node.innerHTML = '';

      // adapt body
      node.dataset.agg = isGroup ? 'group' : 'detail';
      if (isGroup) {
        node.dataset.dataIndex = '';
        node.onclick = <any>undefined;
      } else {
        node.onclick = (evt) => {
          const dataIndex = parseInt(node.dataset.dataIndex!, 10);
          this.ctx.provider.toggleSelection(dataIndex, evt.ctrlKey);
        };
      }
    }

    if (!isGroup) {
      const dataIndex = this.renderCtx.getRow(rowIndex).dataIndex;
      node.dataset.dataIndex = dataIndex.toString();
      if (this.ctx.provider.isSelected(dataIndex)) {
        node.classList.add('lu-selected');
      } else {
        node.classList.remove('lu-selected');
      }
    }

    super.updateRow(node, rowIndex);
  }

  updateSelection(selectedDataIndices: Set<number>) {
    this.forEachRow((node: HTMLElement) => {
      const dataIndex = parseInt(node.dataset.dataIndex!, 10);
      if (selectedDataIndices.has(dataIndex)) {
        node.classList.add('lu-selected');
      } else {
        node.classList.remove('lu-selected');
      }
    }, true);
  }

  updateColumnWidths() {
    super.updateColumnWidths();
    const {columns} = this.context;
    //no data update needed since just width changed
    columns.forEach((column) => {
      if (column instanceof MultiLevelRenderColumn) {
        column.updateWidthRule(this.style);
      }
    });
    this.callbacks.widthChanged();
  }

  private updateColumn(index: number) {
    const column = this.context.columns[index];
    this.forEachRow((row, rowIndex) => {
      this.updateCell(<HTMLElement>row.children[index], rowIndex, column);
    });
  }

  destroy() {
    super.destroy();
    this.ranking.flatColumns.forEach((c) => {
      c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, null);
      if (!(isMultiLevelColumn(c))) {
        return;
      }
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, null);
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, null);
    });
  }

  groupData(data: IDataRow[]) {
    const groups = this.ranking.getGroups();
    const provider = this.ctx.provider;
    if (groups.length === 1) {
      // simple case
      if (provider.isAggregated(this.ranking, groups[0])) {
        // just a single row
        return [Object.assign({rows: data}, groups[0])];
      }
      // simple ungrouped case
      return data.map((r, i) => Object.assign({group: groups[0], relativeIndex: i}, r));
    }

    //multiple groups
    let offset = 0;
    const r = <(IGroupItem | IGroupData)[]>[];
    groups.forEach((group) => {
      const length = group.order.length;
      const groupData = data.slice(offset, offset + length);
      offset += length;

      if (provider.isAggregated(this.ranking, group)) {
        r.push(Object.assign({rows: groupData}, group));
      } else {
        r.push(...groupData.map((r, i) => Object.assign({group, relativeIndex: i}, r)));
      }
    });
    return r;
  }

  render(data: (IGroupItem | IGroupData)[], rowContext: IExceptionContext) {
    this.data = data;
    (<any>this.renderCtx).totalNumberOfRows = data.length;

    const columns = this.createColumns();

    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100, this.ctx.columnPadding)
    }, rowContext);

    super.recreate();
  }

  fakeHover(dataIndex: number) {
    const old = this.body.querySelector(`[data-data-index].lu-hovered`);
    if (old) {
      old.classList.remove('lu-hovered');
    }
    const item = this.body.querySelector(`[data-data-index="${dataIndex}"]`);
    if (item) {
      item.classList.add('lu-hovered');
    }
  }

  private createColumns() {
    const flatCols: IFlatColumn[] = [];
    this.ranking.flatten(flatCols, 0, 1, 0);
    const cols = flatCols.map((c) => c.col);
    return cols.map((c, i) => {
      const renderers = this.ctx.createRenderer(c);

      c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, () => {
        this.updateColumnWidths();
      });

      if (isMultiLevelColumn(c)) {
        const r = new MultiLevelRenderColumn(c, renderers, i, this.ctx.columnPadding);
        c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, () => {
          r.updateWidthRule(this.style);
        });
        c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, debounce(() => this.updateColumn(i), 25));

        return r;
      }
      return new RenderColumn(c, renderers, i);
    });
  }
}
