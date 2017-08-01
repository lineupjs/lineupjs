/**
 * Created by Samuel Gratzl on 18.07.2017.
 */
import {ACellRenderer, ICellRenderContext, nonUniformContext} from 'lineupengine/src';
import RenderColumn, {IRankingContext} from './RenderColumn';
import {IExceptionContext} from 'lineupengine/src/logic';

export default class EngineRankingRenderer extends ACellRenderer<RenderColumn> {
  protected readonly _context: ICellRenderContext<RenderColumn>;

  constructor(root: HTMLElement, id: string, columns: RenderColumn[], rowContext: IExceptionContext, private readonly ctx: IRankingContext) {
    super(root);
    root.id = id;

    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100),
      htmlId: `#${id}`
    }, rowContext);

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

  build() {
    return super.init();
  }

  update() {
    super.update();
  }
}
