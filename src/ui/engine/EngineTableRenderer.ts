/**
 * Created by Samuel Gratzl on 18.07.2017.
 */
import {nonUniformContext} from 'lineupengine/src';
import RenderColumn from './RenderColumn';
import {IRankingContext} from './interfaces';
import {IExceptionContext} from 'lineupengine/src/logic';
import MultiLevelRenderColumn from './MultiLevelRenderColumn';
import {debounce} from '../../utils';
import StackColumn from '../../model/StackColumn';
import Column from '../../model/Column';
import MultiTableRowRenderer from 'lineupengine/src/table/MultiTableRowRenderer';
import EngineRankingRenderer from './EngineRankingRenderer';

export default class EngineTableRenderer {
  private initialized: 'ready'|'waiting'|'no' = 'no';

  private readonly table: MultiTableRowRenderer;
  private readonly rankings: EngineRankingRenderer[] = [];

  constructor(root: HTMLElement, id: string, private readonly ctx: IRankingContext, private readonly extraRowUpdate?: (row: HTMLElement, rowIndex: number) => void) {
    root.id = id;
    this.table = new MultiTableRowRenderer(root, `#${id}`);
  }

  get node() {
    return this.table.node;
  }

  updateHeaders() {
    this.rankings.forEach((r) => r.updateHeaders());
  }

  updateSelection(dataIndices: number[]) {
    const selected = new Set(dataIndices);
    this.rankings.forEach((r) => r.updateSelection(selected));
  }

  get style() {
    return this.table.style;
  }

  updateColumnWidths() {
    this.rankings.forEach((r) => r.updateColumnWidths());
    this.table.widthChanged();
  }

  setZoomFactor(zoomFactor: number) {
    if (this.initialized !== 'ready') {
      return;
    }
    (<HTMLElement>this.node.querySelector('main')!).style.fontSize = `${zoomFactor * 100}%`;
  }

  destroy() {
    this.table.destroy();
  }

  render(columns: RenderColumn[], rowContext: IExceptionContext) {

    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100)
    }, rowContext);

    columns.forEach((c, i) => {
      c.c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, () => {
        this.updateColumnWidths();
      });
      if (!(c instanceof MultiLevelRenderColumn)) {
        return;
      }
      c.c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, () => {
        c.updateWidthRule(this.getStyleManager());
      });
      c.c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, debounce(() => this.updateColumn(i), 25));
    });

    if (this.initialized === 'ready') {
      super.recreate();
    } else if (this.initialized !== 'waiting') {
      this.initialized = 'waiting';
      setTimeout(() => {
          super.init();
          this.initialized = 'ready';
        }, 100);
    }
  }
}
