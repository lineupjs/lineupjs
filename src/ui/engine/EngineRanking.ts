/**
 * Created by Samuel Gratzl on 27.09.2017.
 */
import {ITableSection} from 'lineupengine/src/table/MultiTableRowRenderer';
import {ACellTableSection, ICellRenderContext} from 'lineupengine/src/table/ACellTableSection';
import GridStyleManager from 'lineupengine/src/style/GridStyleManager';
import Ranking from '../../model/Ranking';
import RenderColumn from './RenderColumn';
import {debounce} from '../../utils';
import Column, {IFlatColumn} from '../../model/Column';
import MultiLevelRenderColumn from './MultiLevelRenderColumn';
import {IExceptionContext} from 'lineupengine/src/logic';
import StackColumn from '../../model/StackColumn';
import {nonUniformContext} from 'lineupengine/src/index';
import {isMultiLevelColumn} from '../../model/CompositeColumn';
import {IGroupData, IGroupItem, IRankingBodyContext, IRankingHeaderContextContainer, isGroup} from './interfaces';
import {IDOMRenderContext} from '../../renderer/RendererContexts';
import {createDOM, createDOMGroup} from '../../renderer/index';
import ICellRendererFactory from '../../renderer/ICellRendererFactory';

export default class EngineRanking extends ACellTableSection<RenderColumn> implements ITableSection {
  private _context: ICellRenderContext<RenderColumn>;
  private readonly ctx: IRankingBodyContext;
  private data: (IGroupItem|IGroupData)[];

  constructor(public readonly ranking: Ranking, header: HTMLElement, body: HTMLElement, tableId: string, style: GridStyleManager, ctx: IRankingHeaderContextContainer & IDOMRenderContext) {
    super(header, body, tableId, style);

    this.ctx = Object.assign({
      isGroup: (index: number) => isGroup(this.data[index]),
      getRow: (index: number) => <IGroupItem>this.data[index],
      getGroup: (index: number) => <IGroupData>this.data[index]
    }, ctx);
  }

  protected get context() {
    return this._context;
  }

  protected createHeader(document: Document, column: RenderColumn) {
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    return column.createHeader(document, this.ctx);
  }

  protected updateHeader(node: HTMLElement, column: RenderColumn) {
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    return column.updateHeader(node, this.ctx);
  }

  protected createCell(document: Document, index: number, column: RenderColumn) {
    return column.createCell(index, document, this.ctx);
  }

  protected updateCell(node: HTMLElement, index: number, column: RenderColumn) {
    return column.updateCell(node, index, this.ctx);
  }

  updateHeaders() {
    if (!this._context) {
      return;
    }
    super.updateHeaders();
  }

  updateHeaderOf(i: number) {
    const node = <HTMLElement>this.header.children[i]!;
    const column = this._context.columns[i];
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    this.updateHeader(node, column);
  }

  protected createRow(node: HTMLElement, rowIndex: number, ...extras: any[]): void {
    super.createRow(node, rowIndex, ...extras);
    const isGroup = this.ctx.isGroup(rowIndex);

    if (isGroup) {
      node.dataset.agg = 'group';
      return;
    }

    const dataIndex = this.ctx.getRow(rowIndex).dataIndex;
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

  protected updateRow(node: HTMLElement, rowIndex: number, ...extras: any[]): void {
    const isGroup = this.ctx.isGroup(rowIndex);
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
      const dataIndex = this.ctx.getRow(rowIndex).dataIndex;
      node.dataset.dataIndex = dataIndex.toString();
      if (this.ctx.provider.isSelected(dataIndex)) {
        node.classList.add('lu-selected');
      } else {
        node.classList.remove('lu-selected');
      }
    }

    super.updateRow(node, rowIndex, ...extras);
  }

  updateSelection(dataIndices: number[]) {
    const selected = new Set(dataIndices);
    this.forEachRow((node: HTMLElement) => {
      const dataIndex = parseInt(node.dataset.dataIndex!, 10);
      if (selected.has(dataIndex)) {
        node.classList.add('lu-selected');
      } else {
        node.classList.remove('lu-selected');
      }
    }, true);
  }

  private updateColumnWidth() {
    const context = this.context;
    this.style.update(context.defaultRowHeight, context.columns, context.column.defaultRowHeight);
    //no data update needed since just width changed
    context.columns.forEach((column) => {
      if (column instanceof MultiLevelRenderColumn) {
        column.updateWidthRule(this.style);
      }
    });
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

  render(data: (IGroupItem|IGroupData)[], rowContext: IExceptionContext) {
    this.data = data;
    (<any>this.ctx).totalNumberOfRows = data.length;

    const columns = this.createColumns();

    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100)
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

  private createColumns(rendererMap: { [key: string]: ICellRendererFactory }, columnPadding: number) {
    const flatCols: IFlatColumn[] = [];
    this.ranking.flatten(flatCols, 0, 1, 0);
    const cols = flatCols.map((c) => c.col);
    return cols.map((c, i) => {
      const single = createDOM(c, rendererMap, this.ctx);
      const group = createDOMGroup(c, rendererMap, this.ctx);
      const renderers = {single, group, singleId: c.getRendererType(), groupId: c.getGroupRenderer()};

      if (isMultiLevelColumn(c)) {
        return new MultiLevelRenderColumn(c, renderers, i, columnPadding);
      }
      return new RenderColumn(c, renderers, i);
    });
  }
}
