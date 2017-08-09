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
