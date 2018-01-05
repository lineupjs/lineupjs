/**
 * Created by Samuel Gratzl on 27.09.2017.
 */
import {IExceptionContext, nonUniformContext, uniformContext} from 'lineupengine/src/logic';
import PrefetchMixin from 'lineupengine/src/mixin/PrefetchMixin';
import GridStyleManager, {setColumn} from 'lineupengine/src/style/GridStyleManager';
import {ACellTableSection, ICellRenderContext} from 'lineupengine/src/table/ACellTableSection';
import {ITableSection} from 'lineupengine/src/table/MultiTableRowRenderer';
import {HOVER_DELAY_SHOW_DETAIL} from '../config';
import AEventDispatcher from '../internal/AEventDispatcher';
import debounce from '../internal/debounce';
import {IDataRow, IGroupData, IGroupItem, isGroup} from '../model';
import Column from '../model/Column';
import {isMultiLevelColumn} from '../model/CompositeColumn';
import Ranking from '../model/Ranking';
import StackColumn from '../model/StackColumn';
import {IImposer, IRenderContext} from '../renderer';
import {CANVAS_HEIGHT, COLUMN_PADDING} from '../styles';
import {lineupAnimation} from './animation';
import {IRankingBodyContext, IRankingHeaderContextContainer} from './interfaces';
import MultiLevelRenderColumn from './MultiLevelRenderColumn';
import RenderColumn, {IRenderers} from './RenderColumn';
import SelectionManager from './SelectionManager';

export interface IEngineRankingContext extends IRankingHeaderContextContainer, IRenderContext {
  createRenderer(c: Column, imposer?: IImposer): IRenderers;
}


export interface IEngineRankingOptions {
  animation: boolean;
  levelOfDetail: (rowIndex: number) => 'high' | 'low';
  customRowUpdate: (row: HTMLElement, rowIndex: number) => void;
}


const WEIRD_CANVAS_OFFSET = 0.6;

class RankingEvents extends AEventDispatcher {
  static readonly EVENT_WIDTH_CHANGED = 'widthChanged';
  static readonly EVENT_UPDATE_DATA = 'updateData';
  static readonly EVENT_UPDATE_HIST = 'updateHist';

  fire(type: string | string[], ...args: any[]) {
    super.fire(type, ...args);
  }

  protected createEventList() {
    return super.createEventList().concat([RankingEvents.EVENT_WIDTH_CHANGED, RankingEvents.EVENT_UPDATE_DATA, RankingEvents.EVENT_UPDATE_HIST]);
  }
}

export default class EngineRanking extends ACellTableSection<RenderColumn> implements ITableSection {
  static readonly EVENT_WIDTH_CHANGED = RankingEvents.EVENT_WIDTH_CHANGED;
  static readonly EVENT_UPDATE_DATA = RankingEvents.EVENT_UPDATE_DATA;
  static readonly EVENT_UPDATE_HIST = RankingEvents.EVENT_UPDATE_HIST;

  private _context: ICellRenderContext<RenderColumn>;

  private readonly renderCtx: IRankingBodyContext;
  private data: (IGroupItem | IGroupData)[] = [];
  private readonly selection: SelectionManager;
  private readonly canvasPool: HTMLCanvasElement[] = [];

  private readonly events = new RankingEvents();
  readonly on = this.events.on.bind(this.events);

  private options: Readonly<IEngineRankingOptions> = {
    animation: true,
    levelOfDetail: () => 'high',
    customRowUpdate: () => undefined
  };

  private readonly delayedUpdate: (this: { type: string }) => void;
  private readonly columns: RenderColumn[];

  private readonly canvasMouseHandler = {
    timer: -1,
    enter: (evt: MouseEvent) => {
      const c = this.canvasMouseHandler;
      if (c.timer > 0) {
        self.clearTimeout(c.timer);
      }
      const row = <HTMLElement>evt.currentTarget;
      row.addEventListener('mouseleave', c.leave);
      c.timer = self.setTimeout(() => this.updateHoveredRow(row, true), HOVER_DELAY_SHOW_DETAIL);
    },
    leave: (evt: MouseEvent) => {
      const c = this.canvasMouseHandler;
      if (c.timer > 0) {
        self.clearTimeout(c.timer);
        c.timer = -1;
      }
      const row = <HTMLElement>evt.currentTarget;
      if (!EngineRanking.isCanvasRenderedRow(row)) {
        setTimeout(() => this.updateHoveredRow(row, false));
      }
      // remove self
      row.removeEventListener('mouseleave', c.leave);
    }
  };

  constructor(public readonly ranking: Ranking, header: HTMLElement, body: HTMLElement, tableId: string, style: GridStyleManager, private readonly ctx: IEngineRankingContext, options: Partial<IEngineRankingOptions> = {}) {
    super(header, body, tableId, style, PrefetchMixin);
    Object.assign(this.options, options);
    body.classList.add('lu-row-body');

    const that = this;
    this.delayedUpdate = debounce((function (this: { type: string, primaryType: string }) {
      if (this.type !== Ranking.EVENT_DIRTY_VALUES) {
        that.events.fire(EngineRanking.EVENT_UPDATE_DATA);
        return;
      }
      if (this.primaryType !== Column.EVENT_RENDERER_TYPE_CHANGED && this.primaryType !== Column.EVENT_GROUP_RENDERER_TYPE_CHANGED && this.primaryType !== Column.EVENT_LABEL_CHANGED) { // just the single column will be updated
        that.updateBody();
      }
    }), 50, (current, next) => {
      const currentEvent = current.self.type;
      // order changed is more important
      return currentEvent === Ranking.EVENT_ORDER_CHANGED ? current : next;
    });

    const updateAll = debounce(() => this.updateAll(), 50);
    ranking.on(`${Ranking.EVENT_ADD_COLUMN}.hist`, (col: Column, index: number) => {
      this.columns.splice(index, 0, this.createCol(col, index));
      updateAll();
    });
    ranking.on(`${Ranking.EVENT_REMOVE_COLUMN}.body`, (col: Column, index: number) => {
      EngineRanking.disableListener(col);
      this.columns.splice(index, 1);
      updateAll();
    });
    ranking.on(`${Ranking.EVENT_MOVE_COLUMN}.body`, (col: Column, index: number, old: number) => {
      //delete first
      const c = this.columns.splice(old, 1)[0];
      console.assert(c.c === col);
      // adapt target index based on previous index, i.e shift by one
      this.columns.splice(old < index ? index - 1 : index, 0, c);
      updateAll();
    });
    ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.body`, this.delayedUpdate);

    this.selection = new SelectionManager(this.ctx, body);
    this.selection.on(SelectionManager.EVENT_SELECT_RANGE, (from: number, to: number, additional: boolean) => {
      this.selection.selectRange(this.data.slice(from, to + 1), additional);
    });

    this.renderCtx = Object.assign({
      isGroup: (index: number) => isGroup(this.data[index]),
      getRow: (index: number) => <IGroupItem>this.data[index],
      getGroup: (index: number) => <IGroupData>this.data[index]
    }, ctx);

    // default context
    this.columns = ranking.children.filter((c) => !c.isHidden()).map((c, i) => this.createCol(c, i));
    this.updateCanvasRule();
    this._context = Object.assign({
      columns: this.columns,
      column: nonUniformContext(this.columns.map((w) => w.width), 100, COLUMN_PADDING)
    }, uniformContext(0, 20));
  }

  get id() {
    return this.ranking.id;
  }

  protected onVisibilityChanged(visible: boolean) {
    super.onVisibilityChanged(visible);
    if (visible) {
      this.delayedUpdate.call({type: Ranking.EVENT_ORDER_CHANGED});
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

  protected createHeader(_document: Document, column: RenderColumn) {
    return column.createHeader();
  }

  protected updateHeader(node: HTMLElement, column: RenderColumn) {
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    return column.updateHeader(node);
  }

  protected createCell(_document: Document, index: number, column: RenderColumn) {
    return column.createCell(index);
  }

  protected updateCell(node: HTMLElement, index: number, column: RenderColumn) {
    return column.updateCell(node, index);
  }

  private selectCanvas() {
    if (this.canvasPool.length > 0) {
      return this.canvasPool.pop()!;
    }
    return this.body.ownerDocument.createElement('canvas');
  }

  private renderRow(canvas: HTMLCanvasElement, index: number) {
    canvas.width = this.width;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    this.columns.forEach((c) => {
      c.renderCell(ctx, index);
      const shift = c.width + COLUMN_PADDING + WEIRD_CANVAS_OFFSET; // no idea why this magic 0.5;
      ctx.translate(shift, 0);
    });
    ctx.restore();
  }

  protected updateCanvasCell(canvas: HTMLCanvasElement, index: number, column: RenderColumn, x: number) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(x, 0, column.width, canvas.height);
    ctx.save();
    ctx.translate(x, 0);
    column.renderCell(ctx, index);
    ctx.restore();
  }

  updateAll() {
    this.columns.forEach((c, i) => {
      c.index = i;
      c.renderers = this.ctx.createRenderer(c.c);
    });

    this.updateCanvasRule();

    this._context = Object.assign({}, this._context, {
      column: nonUniformContext(this.columns.map((w) => w.width), 100, COLUMN_PADDING)
    });

    super.recreate();
    this.events.fire(EngineRanking.EVENT_WIDTH_CHANGED);
  }

  private updateCanvasRule() {
    this.style.updateRule(`__canvas_gap${this.tableId}`, `
      ${this.style.id}_B${this.tableId} > .lu-row > canvas {
        grid-column-start: span ${this.columns.length};
      }`);
  }

  updateBody() {
    if (this.hidden) {
      return;
    }
    super.forEachRow((row, rowIndex) => this.updateRow(row, rowIndex));
  }

  updateHeaderOf(i: number) {
    const node = <HTMLElement>this.header.children[i]!;
    const column = this._context.columns[i];
    this.updateHeader(node, column);
  }

  protected createRow(node: HTMLElement, rowIndex: number): void {
    node.classList.add('lu-row');
    this.options.customRowUpdate(node, rowIndex);

    const isGroup = this.renderCtx.isGroup(rowIndex);

    if (isGroup) {
      node.dataset.agg = 'group';
      super.createRow(node, rowIndex);
      return;
    }

    const {i, meta} = this.renderCtx.getRow(rowIndex);
    node.dataset.i = i.toString();
    node.dataset.agg = 'detail'; //or 'group'
    if (!meta) {
      delete node.dataset.meta;
    } else {
      node.dataset.meta = meta;
    }

    this.selection.updateState(node, i);
    this.selection.add(node);

    const lod = this.options.levelOfDetail(rowIndex);

    if (lod === 'high' || meta) {
      super.createRow(node, rowIndex);
      return;
    }
    // use canvas
    node.dataset.lod = lod;

    const canvas = this.selectCanvas();
    node.appendChild(canvas);
    this.renderRow(canvas, rowIndex);
    node.addEventListener('mouseenter', this.canvasMouseHandler.enter);
  }

  protected updateRow(node: HTMLElement, rowIndex: number, forcedLod?: 'high'|'low'): void {
    this.options.customRowUpdate(node, rowIndex);

    const computedLod = this.options.levelOfDetail(rowIndex);
    const lod = forcedLod ? forcedLod : computedLod;
    const wasLod = node.dataset.lod || 'high';
    const isGroup = this.renderCtx.isGroup(rowIndex);
    const wasGroup = node.dataset.agg === 'group';

    if (computedLod === 'high') {
      delete node.dataset.lod;
    } else {
      node.dataset.lod = computedLod;
    }

    node.removeEventListener('mouseenter', this.canvasMouseHandler.enter);

    if (isGroup !== wasGroup) {
      // change of mode clear the children to reinitialize them
      node.innerHTML = '';

      // adapt body
      node.dataset.agg = isGroup ? 'group' : 'detail';
      if (isGroup) {
        node.dataset.i = '';
        this.selection.remove(node);
      } else {
        this.selection.add(node);
      }
    }

    if (isGroup) {
      super.updateRow(node, rowIndex);
      return;
    }

    const {i, meta} = this.renderCtx.getRow(rowIndex);
    node.dataset.i = i.toString();
    if (!meta) {
      delete node.dataset.meta;
    } else {
      node.dataset.meta = meta;
    }
    this.selection.updateState(node, i);

    const canvas = <HTMLCanvasElement>Array.from(node.children).find((d) => d.nodeName.toLowerCase() === 'canvas');
    if (lod === 'high' || meta) {
      if (canvas) {
        this.canvasPool.push(canvas);
        canvas.remove();
      }
      super.updateRow(node, rowIndex);
      return;
    }

    node.addEventListener('mouseenter', this.canvasMouseHandler.enter);
    // use canvas
    if (wasLod !== 'high' && canvas) {
      this.renderRow(canvas, rowIndex);
      return;
    }
    // clear old
    node.innerHTML = '';
    node.dataset.agg = 'detail';
    const canvas2 = this.selectCanvas();
    node.appendChild(canvas2);
    this.renderRow(canvas2, rowIndex);
  }

  private updateHoveredRow(row: HTMLElement, hover: boolean) {
    const isCanvas = EngineRanking.isCanvasRenderedRow(row);
    if (isCanvas !== hover) {
      return; // good nothing to do
    }
    const index = parseInt(row.dataset.index!, 10);
    this.updateRow(row, index, hover ? 'high': 'low');
  }

  protected forEachRow(callback: (row: HTMLElement, rowIndex: number) => void, inplace: boolean = false) {
    const adapter = (row: HTMLElement, rowIndex: number) => {
      if (EngineRanking.isCanvasRenderedRow(row)) {
        // skip canvas
        return;
      }
      callback(row, rowIndex);
    };
    return super.forEachRow(adapter, inplace);
  }

  updateSelection(selectedDataIndices: { has(i: number): boolean }) {
    super.forEachRow((node: HTMLElement, rowIndex: number) => {
      if (this.renderCtx.isGroup(rowIndex)) {
        this.updateRow(node, rowIndex);
      } else {
        // fast pass for item
        this.selection.update(node, selectedDataIndices);
      }
    }, true);
  }

  updateColumnWidths() {
    // update the column context in place
    (<any>this._context).column = nonUniformContext(this._context.columns.map((w) => w.width), 100, COLUMN_PADDING);
    super.updateColumnWidths();
    const {columns} = this.context;
    //no data update needed since just width changed
    columns.forEach((column) => {
      if (column instanceof MultiLevelRenderColumn) {
        column.updateWidthRule(this.style);
      }
      column.renderers = this.ctx.createRenderer(column.c);
    });
    this.events.fire(EngineRanking.EVENT_WIDTH_CHANGED);
  }

  private updateHist(col: Column) {
    this.events.fire(EngineRanking.EVENT_UPDATE_HIST, col);
  }

  private updateColumn(index: number) {
    const columns = this.context.columns;
    const column = columns[index];
    let x = 0;
    for (let i = 0; i < index; ++i) {
      x += columns[i].width + COLUMN_PADDING + WEIRD_CANVAS_OFFSET;
    }
    super.forEachRow((row, rowIndex) => {
      if (EngineRanking.isCanvasRenderedRow(row)) {
        this.updateCanvasCell(row.querySelector('canvas')!, rowIndex, column, x);
        return;
      }
      const before = <HTMLElement>row.children[index];
      const after = this.updateCell(before, rowIndex, column);
      if (before !== after && after) {
        setColumn(after, column);
        row.replaceChild(after, before);
      }
    });
  }

  destroy() {
    super.destroy();
    this.ranking.flatColumns.forEach((c) => EngineRanking.disableListener(c));
  }

  groupData(data: IDataRow[]): (IGroupItem | IGroupData)[] {
    const groups = this.ranking.getGroups();
    const provider = this.ctx.provider;
    const toMeta = (relativeIndex: number, length: number): 'first' | 'last' | 'first last' | undefined => {
      if (length === 1) {
        return 'first last';
      }
      if (relativeIndex === 0) {
        return 'first';
      }
      if (relativeIndex === length - 1) {
        return 'last';
      }
      return undefined;
    };
    if (groups.length === 1) {
      // simple case
      if (provider.isAggregated(this.ranking, groups[0])) {
        // just a single row
        return [Object.assign({rows: data}, groups[0])];
      }
      // simple ungrouped case
      return data.map((r, i) => Object.assign({group: groups[0], relativeIndex: i, meta: toMeta(i, data.length)}, r));
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
        return;
      }
      r.push(...groupData.map((r, i) => Object.assign({
        group,
        relativeIndex: i,
        meta: toMeta(i, groupData.length)
      }, r)));
    });
    return r;
  }

  render(data: (IGroupItem | IGroupData)[], rowContext: IExceptionContext) {
    const previous = this._context;
    const previousData = this.data;
    this.data = data;
    (<any>this.renderCtx).totalNumberOfRows = data.length;

    this.columns.forEach((c, i) => {
      c.index = i;
      c.renderers = this.ctx.createRenderer(c.c);
    });
    this._context = Object.assign({
      columns: this.columns,
      column: nonUniformContext(this.columns.map((w) => w.width), 100, COLUMN_PADDING)
    }, rowContext);

    return super.recreate(this.options.animation ? lineupAnimation(previous, previousData, this.data) : undefined);
  }

  fakeHover(dataIndex: number) {
    const old = this.body.querySelector(`[data-i].lu-hovered`);
    if (old) {
      old.classList.remove('lu-hovered');
    }
    const item = this.body.querySelector(`[data-i="${dataIndex}"]`);
    if (item) {
      item.classList.add('lu-hovered');
    }
  }

  private createCol(c: Column, index: number) {
    const col = (isMultiLevelColumn(c) && !c.getCollapsed()) ? new MultiLevelRenderColumn(c, index, this.renderCtx) : new RenderColumn(c, index, this.renderCtx);

    c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, () => {
      this.updateColumnWidths();
    });
    c.on(`${Column.EVENT_DATA_LOADED}.hist`, () => this.updateHist(c));
    const debounceUpdate = debounce(() => this.updateColumn(col.index), 25);
    c.on([`${Column.EVENT_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_GROUP_RENDERER_TYPE_CHANGED}.body`], () => {
      // replace myself upon renderer type change
      col.renderers = this.ctx.createRenderer(c);
      debounceUpdate();
    });
    c.on(`${Column.EVENT_DIRTY_HEADER}.body`, () => this.updateHeaderOf(col.index));
    c.on(`${Column.EVENT_DIRTY_VALUES}.body`, debounceUpdate);

    if (isMultiLevelColumn(c) && !c.getCollapsed()) {
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, () => {
        (<MultiLevelRenderColumn>col).updateWidthRule(this.style);
      });
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, debounceUpdate);
    }

    return col;
  }

  private static isCanvasRenderedRow(row: HTMLElement) {
    return row.dataset.lod === 'low' && row.childElementCount === 1 && row.firstElementChild!.nodeName.toLowerCase() === 'canvas';
  }

  private static disableListener(c: Column) {
    c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, null);
    c.on(`${Column.EVENT_DATA_LOADED}.hist`, null);
    c.on([`${Column.EVENT_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_GROUP_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_LABEL_CHANGED}.body`], null);
    c.on(`${Ranking.EVENT_DIRTY_HEADER}.body`, null);
    c.on(`${Ranking.EVENT_DIRTY_VALUES}.body`, null);

    if (!(isMultiLevelColumn(c))) {
      return;
    }
    c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, null);
    c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, null);
  }
}
