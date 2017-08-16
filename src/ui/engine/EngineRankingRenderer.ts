/**
 * Created by Samuel Gratzl on 18.07.2017.
 */
import {ACellRenderer, ICellRenderContext, nonUniformContext} from 'lineupengine/src';
import RenderColumn, {IRankingContext} from './RenderColumn';
import {IExceptionContext} from 'lineupengine/src/logic';

export default class EngineRankingRenderer extends ACellRenderer<RenderColumn> {
  protected _context: ICellRenderContext<RenderColumn>;

  private initialized: boolean = false;

  constructor(root: HTMLElement, private readonly id: string, private readonly ctx: IRankingContext) {
    super(root);
    root.id = id;
  }

  protected get context() {
    return this._context;
  }

  protected createHeader(document: Document, column: RenderColumn) {
    return column.createHeader(document, this.ctx);
  }

  protected updateHeader(node: HTMLElement, column: RenderColumn) {
    return column.updateHeader(node, this.ctx);
  }

  protected createCell(document: Document, index: number, column: RenderColumn) {
    return column.createCell(index, document, this.ctx);
  }

  protected updateCell(node: HTMLElement, index: number, column: RenderColumn) {
    return column.updateCell(node, index, this.ctx);
  }

  protected createRow(node: HTMLElement, rowIndex: number, ...extras: any[]): void {
    super.createRow(node, rowIndex, ...extras);
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
    super.updateRow(node, rowIndex, ...extras);
    const dataIndex = this.ctx.getRow(rowIndex).dataIndex;
    node.dataset.dataIndex = dataIndex.toString();
    if (this.ctx.provider.isSelected(dataIndex)) {
      node.classList.add('lu-selected');
    } else {
      node.classList.remove('lu-selected');
    }
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

  updateColumnWidths() {
    const context = this.context;
    this.style.update(context.defaultRowHeight, context.columns, context.column.defaultRowHeight);
    //no data update needed since just width changed
  }

  render(columns: RenderColumn[], rowContext: IExceptionContext) {
    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100),
      htmlId: `#${this.id}`
    }, rowContext);

    if (this.initialized) {
      super.recreate();
    } else {
      this.initialized = true;
      setTimeout(() => super.init(), 100);
    }
  }
}
