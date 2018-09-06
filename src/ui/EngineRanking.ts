import {IExceptionContext, nonUniformContext, uniformContext, PrefetchMixin, GridStyleManager, ACellTableSection, ITableSection, ICellRenderContext, tableIds} from 'lineupengine';
import {HOVER_DELAY_SHOW_DETAIL} from '../config';
import AEventDispatcher, {IEventContext, IEventHandler, IEventListener} from '../internal/AEventDispatcher';
import debounce from '../internal/debounce';
import {IDataRow, IGroupData, IGroupItem, isGroup, isMultiLevelColumn, ValueColumn, toGroupMeta} from '../model';
import Column from '../model/Column';
import Ranking from '../model/Ranking';
import StackColumn from '../model/StackColumn';
import {IImposer, IRenderContext} from '../renderer';
import {CANVAS_HEIGHT, COLUMN_PADDING, engineCssClass, cssClass} from '../styles';
import {lineupAnimation} from './animation';
import {IRankingBodyContext, IRankingHeaderContextContainer} from './interfaces';
import MultiLevelRenderColumn from './MultiLevelRenderColumn';
import RenderColumn, {IRenderers} from './RenderColumn';
import SelectionManager from './SelectionManager';
import {clear} from '../internal';

export interface IEngineRankingContext extends IRankingHeaderContextContainer, IRenderContext {
  createRenderer(c: Column, imposer?: IImposer): IRenderers;
}


export interface IEngineRankingOptions {
  animation: boolean;
  levelOfDetail: (rowIndex: number) => 'high' | 'low';
  customRowUpdate: (row: HTMLElement, rowIndex: number) => void;
  flags: {
    disableFrozenColumns: boolean;
  };
}

/**
 * emitted when the width of the ranking changed
 * @asMemberOf EngineRanking
 * @event
 */
export declare function widthChanged(): void;
/**
 * emitted when the data of the ranking needs to be updated
 * @asMemberOf EngineRanking
 * @event
 */
export declare function updateData(): void;
/**
 * emitted when the histogram of a column needs to be updated
 * @asMemberOf EngineRanking
 * @param col the column to update the histogram of
 * @event
 */
export declare function updateHist(col: Column): void;
/**
 * emitted when the highlight changes
 * @asMemberOf EngineRanking
 * @param dataIndex the highlghted data index or -1 for none
 * @event
 */
export declare function highlightChanged(dataIndex: number): void;


/** @internal */
class RankingEvents extends AEventDispatcher {
  static readonly EVENT_WIDTH_CHANGED = 'widthChanged';
  static readonly EVENT_UPDATE_DATA = 'updateData';
  static readonly EVENT_UPDATE_HIST = 'updateHist';
  static readonly EVENT_HIGHLIGHT_CHANGED = 'highlightChanged';

  fire(type: string | string[], ...args: any[]) {
    super.fire(type, ...args);
  }

  protected createEventList() {
    return super.createEventList().concat([RankingEvents.EVENT_WIDTH_CHANGED, RankingEvents.EVENT_UPDATE_DATA, RankingEvents.EVENT_UPDATE_HIST, RankingEvents.EVENT_HIGHLIGHT_CHANGED]);
  }
}

const PASSIVE: AddEventListenerOptions = {
  passive: false
};

export default class EngineRanking extends ACellTableSection<RenderColumn> implements ITableSection, IEventHandler {
  static readonly EVENT_WIDTH_CHANGED = RankingEvents.EVENT_WIDTH_CHANGED;
  static readonly EVENT_UPDATE_DATA = RankingEvents.EVENT_UPDATE_DATA;
  static readonly EVENT_UPDATE_HIST = RankingEvents.EVENT_UPDATE_HIST;
  static readonly EVENT_HIGHLIGHT_CHANGED = RankingEvents.EVENT_HIGHLIGHT_CHANGED;

  private _context: ICellRenderContext<RenderColumn>;

  private readonly renderCtx: IRankingBodyContext;
  private data: (IGroupItem | IGroupData)[] = [];
  private readonly selection: SelectionManager;
  private highlight: number = -1;
  private readonly canvasPool: HTMLCanvasElement[] = [];
  private oldLeft: number = 0;

  private readonly events = new RankingEvents();

  private roptions: Readonly<IEngineRankingOptions> = {
    animation: true,
    levelOfDetail: () => 'high',
    customRowUpdate: () => undefined,
    flags: {
      disableFrozenColumns: false
    }
  };

  private readonly delayedUpdate: (this: { type: string }) => void;
  private readonly delayedUpdateAll: () => void;
  private readonly delayedUpdateColumnWidths: () => void;
  private readonly columns: RenderColumn[];

  private readonly canvasMouseHandler = {
    timer: -1,
    enter: (evt: MouseEvent) => {
      const c = this.canvasMouseHandler;
      if (c.timer > 0) {
        self.clearTimeout(c.timer);
      }
      const row = <HTMLElement>evt.currentTarget;
      row.addEventListener('mouseleave', c.leave, PASSIVE);
      c.timer = self.setTimeout(() => this.updateHoveredRow(row, true), HOVER_DELAY_SHOW_DETAIL);
    },
    leave: (evt: MouseEvent) => {
      // on row to survive canvas removal
      const c = this.canvasMouseHandler;
      if (c.timer > 0) {
        self.clearTimeout(c.timer);
        c.timer = -1;
      }
      const row = <HTMLElement>evt.currentTarget;
      if (!EngineRanking.isCanvasRenderedRow(row)) {
        self.setTimeout(() => this.updateHoveredRow(row, false));
      }
      // remove self
      row.removeEventListener('mouseleave', c.leave);
    }
  };

  private readonly highlightHandler = {
    enabled: false,
    enter: (evt: MouseEvent) => {
      if (this.highlight >= 0) {
        const old = this.body.querySelector(`.${engineCssClass('highlighted')}`);
        if (old) {
          old.classList.remove(engineCssClass('highlighted'));
        }
        this.highlight = -1;
      }
      const row = <HTMLElement>evt.currentTarget;
      const dataIndex = parseInt(row.dataset.i || '-1', 10);
      this.events.fire(EngineRanking.EVENT_HIGHLIGHT_CHANGED, dataIndex);
    },
    leave: () => {
      if (this.highlight >= 0) {
        const old = this.body.querySelector(`.${engineCssClass('highlighted')}`);
        if (old) {
          old.classList.remove(engineCssClass('highlighted'));
        }
        this.highlight = -1;
      }
      this.events.fire(EngineRanking.EVENT_HIGHLIGHT_CHANGED, -1);
    }
  };

  constructor(public readonly ranking: Ranking, header: HTMLElement, body: HTMLElement, tableId: string, style: GridStyleManager, private readonly ctx: IEngineRankingContext, roptions: Partial<IEngineRankingOptions> = {}) {
    super(header, body, tableId, style, {mixins: [PrefetchMixin], batchSize: 20});
    Object.assign(this.roptions, roptions);
    body.dataset.ranking = ranking.id;

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

    this.delayedUpdateAll = debounce(() => this.updateAll(), 50);
    this.delayedUpdateColumnWidths = debounce(() => this.updateColumnWidths(), 50);
    ranking.on(`${Ranking.EVENT_ADD_COLUMN}.hist`, (col: Column, index: number) => {
      this.columns.splice(index, 0, this.createCol(col, index));
      this.reindex();
      this.updateHist(col);
      this.delayedUpdateAll();
    });
    ranking.on(`${Ranking.EVENT_REMOVE_COLUMN}.body`, (col: Column, index: number) => {
      EngineRanking.disableListener(col);
      this.columns.splice(index, 1);
      this.reindex();
      this.delayedUpdateAll();
    });
    ranking.on(`${Ranking.EVENT_MOVE_COLUMN}.body`, (col: Column, index: number, old: number) => {
      //delete first
      const c = this.columns.splice(old, 1)[0];
      console.assert(c.c === col);
      // adapt target index based on previous index, i.e shift by one
      this.columns.splice(old < index ? index - 1 : index, 0, c);
      this.reindex();
      this.delayedUpdateAll();
    });
    ranking.on(`${Ranking.EVENT_COLUMN_VISIBILITY_CHANGED}.body`, (col: Column, _oldValue: boolean, newValue: boolean) => {
      if (newValue) {
        // become visible
        const index = ranking.children.indexOf(col);
        this.columns.splice(index, 0, this.createCol(col, index));
        this.updateHist(col);
      } else {
        // hide
        const index = this.columns.findIndex((d) => d.c === col);
        EngineRanking.disableListener(col);
        this.columns.splice(index, 1);
      }
      this.reindex();
      this.delayedUpdateAll();
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
    this.columns = ranking.children.filter((c) => c.isVisible()).map((c, i) => this.createCol(c, i));
    this._context = Object.assign({
      columns: this.columns,
      column: nonUniformContext(this.columns.map((w) => w.width), 100, COLUMN_PADDING)
    }, uniformContext(0, 20));

    this.columns.forEach((column) => {
      if (column instanceof MultiLevelRenderColumn) {
        column.updateWidthRule(this.style);
      }
      column.renderers = this.ctx.createRenderer(column.c);
    });

    this.style.updateRule(`hoverOnly${this.tableId}`, `
      #${tableIds(this.tableId).tbody}:hover > .${engineCssClass('tr')}:hover .${cssClass('hover-only')},
      #${tableIds(this.tableId).tbody} > .${engineCssClass('tr')}.${cssClass('selected')} .${cssClass('hover-only')},
      #${tableIds(this.tableId).tbody} > .${engineCssClass('tr')}.${engineCssClass('highlighted')} .${cssClass('hover-only')}`, {
        visibility: 'visible'
    });
  }

  on(type: typeof EngineRanking.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof EngineRanking.EVENT_UPDATE_DATA, listener: typeof updateData | null): this;
  on(type: typeof EngineRanking.EVENT_UPDATE_HIST, listener: typeof updateHist | null): this;
  on(type: typeof EngineRanking.EVENT_HIGHLIGHT_CHANGED, listener: typeof highlightChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    this.events.on(type, listener);
    return this;
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

  get context(): ICellRenderContext<RenderColumn> {
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

  private rowFlags(row: HTMLElement) {
    const rowany: any = row;
    const v = rowany.__lu__;
    if (v == null) {
      return rowany.__lu__ = {};
    }
    return v;
  }

  private visibleRenderedWidth() {
    let width = 0;
    for (const col of this.visibleColumns.frozen) {
      width += this.columns[col].width + COLUMN_PADDING;
    }
    for(let col = this.visibleColumns.first; col <= this.visibleColumns.last; ++col) {
      width += this.columns[col].width + COLUMN_PADDING;
    }
    if (width > 0) {
      width -= COLUMN_PADDING; // for the last one
    }
    return width;
  }

  private renderRow(canvas: HTMLCanvasElement, node: HTMLElement, index: number, width = this.visibleRenderedWidth()) {
    canvas.width = width;
    canvas.style.width = `${width}px`;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const domColumns = <RenderColumn[]>[];

    for (const col of this.visibleColumns.frozen) {
      const c = this.columns[col];
      if (c.renderCell(ctx, index)) {
        domColumns.push(c);
      }
      const shift = c.width + COLUMN_PADDING;
      ctx.translate(shift, 0);
    }
    for(let col = this.visibleColumns.first; col <= this.visibleColumns.last; ++col) {
      const c = this.columns[col];
      if (c.renderCell(ctx, index)) {
        domColumns.push(c);
      }
      const shift = c.width + COLUMN_PADDING;
      ctx.translate(shift, 0);
    }
    ctx.restore();

    const length = node.childElementCount - 1; // for canvas

    if (domColumns.length === 0) {
      while (node.lastElementChild !== node.firstElementChild) {
        node.removeChild(node.lastElementChild!);
      }
      return;
    }
    if (domColumns.length === 1) {
      const first = domColumns[0];
      if (length === 0) {
        const c = first.createCell(index);
        c.classList.add(cssClass('low'));
        this.initCellClasses(c, first.id);
        node.appendChild(c);
        return;
      }
      if (length === 1 && (<HTMLElement>node.lastElementChild!).dataset.colId === first.id) {
        this.updateCellImpl(first, <HTMLElement>node.lastElementChild, index);
        return;
      }
    }

    const existing = new Map((<HTMLElement[]>Array.from(node.children)).slice(1).map((d) => <[string, HTMLElement]>[d.dataset.col, d]));
    for (const col of domColumns) {
      const elem = existing.get(col.id);
      if (elem) {
        existing.delete(col.id);
        this.updateCellImpl(col, elem, index);
      } else {
        const c = col.createCell(index);
        c.classList.add(cssClass('low'));
        this.initCellClasses(c, col.id);
        node.appendChild(c);
      }
    }
    existing.forEach((v) => v.remove());
  }

  protected updateCanvasCell(canvas: HTMLCanvasElement, node: HTMLElement, index: number, column: RenderColumn, x: number) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(x - 1, 0, column.width + 2, canvas.height);
    ctx.save();
    ctx.translate(x, 0);
    const needDOM = column.renderCell(ctx, index);
    ctx.restore();

    if (!needDOM && node.childElementCount === 1) { // just canvas
      return;
    }
    const elem = <HTMLElement>node.querySelector(`[data-col-id="${column.id}"]`);
    if (elem && !needDOM) {
      elem.remove();
      return;
    }
    if (elem) {
      this.updateCellImpl(column, elem, index);
      return;
    }

    const c = column.createCell(index);
    c.classList.add(cssClass('low'));
    this.initCellClasses(c, column.id);
    node.appendChild(c);
  }

  private reindex() {
    this.columns.forEach((c, i) => {
      c.index = i;
    });
  }

  updateAll() {
    this.columns.forEach((c, i) => {
      c.index = i;
      c.renderers = this.ctx.createRenderer(c.c);
    });

    this._context = Object.assign({}, this._context, {
      column: nonUniformContext(this.columns.map((w) => w.width), 100, COLUMN_PADDING)
    });

    super.recreate();
    this.events.fire(EngineRanking.EVENT_WIDTH_CHANGED);
  }

  updateBody() {
    if (this.hidden) {
      return;
    }
    this.events.fire(EngineRanking.EVENT_WIDTH_CHANGED);
    super.forEachRow((row, rowIndex) => this.updateRow(row, rowIndex));
  }

  updateHeaderOf(col: Column) {
    const i = this._context.columns.findIndex((d) => d.c === col);
    if (i < 0) {
      return false;
    }
    const node = <HTMLElement>this.header.children[i]!;
    const column = this._context.columns[i];
    if (node && column) {
      this.updateHeader(node, column);
    }
    return node && column;
  }

  protected createRow(node: HTMLElement, rowIndex: number): void {
    node.classList.add(this.style.cssClasses.tr);
    this.roptions.customRowUpdate(node, rowIndex);
    if (this.highlightHandler.enabled) {
      node.addEventListener('mouseenter', this.highlightHandler.enter, PASSIVE);
      this.rowFlags(node).highlight = true;
    }

    const isGroup = this.renderCtx.isGroup(rowIndex);

    if (isGroup) {
      node.dataset.agg = 'group';
      super.createRow(node, rowIndex);
      return;
    }

    const {i, meta} = this.renderCtx.getRow(rowIndex);
    node.classList.toggle(engineCssClass('highlighted'), this.highlight === i);
    node.dataset.i = i.toString();
    node.dataset.agg = 'detail'; //or 'group'
    if (!meta) {
      delete node.dataset.meta;
    } else {
      node.dataset.meta = meta;
    }

    this.selection.updateState(node, i);
    this.selection.add(node);

    const low = this.roptions.levelOfDetail(rowIndex) === 'low';
    node.classList.toggle(cssClass('low'), low);

    if (!low || this.ctx.provider.isSelected(i)) {
      super.createRow(node, rowIndex);
      return;
    }

    const canvas = this.selectCanvas();
    node.appendChild(canvas);
    node.addEventListener('mouseenter', this.canvasMouseHandler.enter, PASSIVE);
    this.renderRow(canvas, node, rowIndex);
  }

  protected updateRow(node: HTMLElement, rowIndex: number, hoverLod?: 'high' | 'low'): void {
    this.roptions.customRowUpdate(node, rowIndex);

    const computedLod = this.roptions.levelOfDetail(rowIndex);
    const low = (hoverLod ? hoverLod : computedLod) === 'low';
    const wasLow = node.classList.contains(cssClass('low'));
    const isGroup = this.renderCtx.isGroup(rowIndex);
    const wasGroup = node.dataset.agg === 'group';

    node.classList.toggle(cssClass('low'), computedLod === 'low');

    if (this.highlightHandler.enabled && !this.rowFlags(node).highlight) {
      node.addEventListener('mouseenter', this.highlightHandler.enter, PASSIVE);
      this.rowFlags(node).highlight = true;
    }

    if (isGroup !== wasGroup) {
      // change of mode clear the children to reinitialize them
      clear(node);

      // adapt body
      node.dataset.agg = isGroup ? 'group' : 'detail';
      if (isGroup) {
        node.dataset.i = '';
        this.selection.remove(node);
      } else {
        this.selection.add(node);
      }
    }

    if (wasLow && (!computedLod || isGroup)) {
      node.removeEventListener('mouseenter', this.canvasMouseHandler.enter);
    }

    if (isGroup) {
      node.classList.remove(engineCssClass('highlighted'));
      super.updateRow(node, rowIndex);
      return;
    }

    const {i, meta} = this.renderCtx.getRow(rowIndex);
    node.classList.toggle(engineCssClass('highlighted'), this.highlight === i);
    node.dataset.i = i.toString();
    if (!meta) {
      delete node.dataset.meta;
    } else {
      node.dataset.meta = meta;
    }
    this.selection.updateState(node, i);

    const canvas = (wasLow && node.firstElementChild!.nodeName.toLowerCase() === 'canvas') ? <HTMLCanvasElement>node.firstElementChild! : null;
    if (!low || this.ctx.provider.isSelected(i)) {
      if (canvas) {
        this.canvasPool.push(canvas);
        clear(node);
        node.removeEventListener('mouseenter', this.canvasMouseHandler.enter);
      }
      super.updateRow(node, rowIndex);
      return;
    }

    // use canvas
    if (wasLow && canvas) {
      this.renderRow(canvas, node, rowIndex);
      return;
    }
    // clear old
    clear(node);
    node.dataset.agg = 'detail';
    const canvas2 = this.selectCanvas();
    node.appendChild(canvas2);
    node.addEventListener('mouseenter', this.canvasMouseHandler.enter, PASSIVE);
    this.renderRow(canvas2, node, rowIndex);
  }

  private updateCanvasBody() {
    const width = this.visibleRenderedWidth();
    super.forEachRow((row, index) => {
      if (EngineRanking.isCanvasRenderedRow(row)) {
        this.renderRow(row.querySelector('canvas')!, row, index, width);
      }
    });
  }

  protected updateShifts(top: number, left: number) {
    super.updateShifts(top, left);

    if (left === this.oldLeft) {
      return;
    }
    this.oldLeft = left;
    this.updateCanvasBody();
  }

  enableHighlightListening(enable: boolean) {
    if (this.highlightHandler.enabled === enable) {
      return;
    }

    this.highlightHandler.enabled = enable;

    if (enable) {
      this.body.addEventListener('mouseleave', this.highlightHandler.leave, PASSIVE);
      super.forEachRow((row) => {
        row.addEventListener('mouseenter', this.highlightHandler.enter, PASSIVE);
        this.rowFlags(row).highlight = true;
      });
      return;
    }

    this.body.removeEventListener('mouseleave', this.highlightHandler.leave);

    super.forEachRow((row) => {
      row.removeEventListener('mouseenter', this.highlightHandler.enter);
      this.rowFlags(row).highlight = false;
    });
  }

  private updateHoveredRow(row: HTMLElement, hover: boolean) {
    const isCanvas = EngineRanking.isCanvasRenderedRow(row);
    if (isCanvas !== hover) {
      return; // good nothing to do
    }
    const index = parseInt(row.dataset.index!, 10);
    this.updateRow(row, index, hover ? 'high' : 'low');
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
    if (!column) {
      return false;
    }
    let x = 0;
    for (let i = this.visibleColumns.first; i < index; ++i) {
      x += columns[i].width + COLUMN_PADDING;
    }
    super.forEachRow((row, rowIndex) => {
      if (EngineRanking.isCanvasRenderedRow(row)) {
        this.updateCanvasCell(<HTMLCanvasElement>row.firstElementChild!, row, rowIndex, column, x);
        return;
      }
      this.updateCellImpl(column, <HTMLElement>row.children[index], rowIndex);
    });
    return true;
  }

  private updateCellImpl(column: RenderColumn, before: HTMLElement, rowIndex: number) {
    if (!before) {
      return; // race condition
    }
    const after = this.updateCell(before, rowIndex, column);
    if (before === after || !after) {
      return;
    }
    this.initCellClasses(after, column.id);
    before.parentElement!.replaceChild(after, before);
  }

  private initCellClasses(node: HTMLElement, id: string) {
    node.dataset.id = id;
    node.classList.add(engineCssClass('td'), this.style.cssClasses.td, engineCssClass(`td-${this.tableId}`));
  }

  destroy() {
    super.destroy();
    this.style.deleteRule(`hoverOnly${this.tableId}`);
    this.ranking.flatColumns.forEach((c) => EngineRanking.disableListener(c));
  }

  groupData(data: IDataRow[]): (IGroupItem | IGroupData)[] {
    const groups = this.ranking.getGroups();
    const provider = this.ctx.provider;
    if (groups.length === 1) {
      // simple case
      if (provider.isAggregated(this.ranking, groups[0])) {
        // just a single row
        return [Object.assign({rows: data}, groups[0])];
      }
      // simple ungrouped case
      return data.map((r, i) => Object.assign({group: groups[0], relativeIndex: i, meta: toGroupMeta(i, data.length)}, r));
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
        meta: toGroupMeta(i, groupData.length)
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

    return super.recreate(this.roptions.animation ? lineupAnimation(previous, previousData, this.data) : undefined);
  }

  setHighlight(dataIndex: number) {
    this.highlight = dataIndex;
    const old = this.body.querySelector(`[data-i].${engineCssClass('highlighted')}`);
    if (old) {
      old.classList.remove(engineCssClass('highlighted'));
    }
    if (dataIndex < 0) {
      return;
    }
    const item = this.body.querySelector(`[data-i="${dataIndex}"]`);
    if (item) {
      item.classList.add(engineCssClass('highlighted'));
    }
    return item != null;
  }

  findNearest(dataIndices: number[]) {
    // find the nearest visible data index
    // first check if already visible
    const index = dataIndices.find((d) => Boolean(this.body.querySelectorAll(`[data-i="${d}"]`)));
    if (index != null) {
      return index; // visible one
    }
    const visible = this.visible;
    const lookFor = new Set(dataIndices);
    let firstBeforePos = -1;
    let firstAfterPos = -1;
    for (let i = visible.first; i >= 0; --i) {
      const d = this.data[i];
      if (!isGroup(d) && lookFor.has(d.i)) {
        firstBeforePos = i;
        break;
      }
    }
    for (let i = visible.last; i < this.data.length; ++i) {
      const d = this.data[i];
      if (!isGroup(d) && lookFor.has(d.i)) {
        firstAfterPos = i;
        break;
      }
    }

    if (firstBeforePos < 0 && firstBeforePos < 0) {
      return -1; // not found at all
    }
    const nearestPos = (firstBeforePos >= 0 && (visible.first - firstBeforePos) < (firstAfterPos - visible.last)) ? firstBeforePos : firstAfterPos;
    return (<IGroupItem>this.data[nearestPos]).i;
  }

  scrollIntoView(dataIndex: number) {
    const item = this.body.querySelector(`[data-i="${dataIndex}"]`);
    if (item) {
      item.scrollIntoView(true);
      return true;
    }
    const index = this.data.findIndex((d) => !isGroup(d) && d.i === dataIndex);
    if (index < 0) {
      return false; // part of a group?
    }

    const posOf = () => {
      const c = this._context;
      if (c.exceptions.length === 0 || index < c.exceptions[0].index) {
        // fast pass
        return index * c.defaultRowHeight;
      }
      const before = c.exceptions.reverse().find((d) => d.index <= index);
      if (!before) {
        return -1;
      }
      if (before.index === index) {
        return before.y;
      }
      const regular = index - before.index - 1;
      return before.y2 + regular * c.defaultRowHeight;
    };
    const pos = posOf();
    if (pos < 0) {
      return false;
    }
    const scroller = this.bodyScroller;
    const top = scroller.scrollTop;
    scroller.scrollTop = Math.min(pos, scroller.scrollHeight - scroller.clientHeight);
    this.onScrolledVertically(scroller.scrollTop, scroller.clientHeight, top < scroller.scrollTop);

    const found = this.body.querySelector(`[data-i="${dataIndex}"]`);
    if (found) {
      found.scrollIntoView(true);
      return true;
    }
    return false;
  }

  getHighlight() {
    const item = <HTMLElement>this.body.querySelector(`[data-i]:hover, [data-i].${engineCssClass('highlighted')}`);
    if (item) {
      return parseInt(item.dataset.i!, 10);
    }
    return this.highlight;
  }

  private createCol(c: Column, index: number) {
    const col = (isMultiLevelColumn(c) && !c.getCollapsed()) ? new MultiLevelRenderColumn(c, index, this.renderCtx, this.roptions.flags) : new RenderColumn(c, index, this.renderCtx, this.roptions.flags);

    c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, () => {
      this.delayedUpdateColumnWidths();
    });
    c.on(`${ValueColumn.EVENT_DATA_LOADED}.hist`, () => this.updateHist(c));
    const debounceUpdate = debounce(() => {
      const valid = this.updateColumn(col.index);
      if (!valid) {
        EngineRanking.disableListener(c); // destroy myself
      }
    }, 25);
    c.on([`${Column.EVENT_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_GROUP_RENDERER_TYPE_CHANGED}.body`], () => {
      // replace myself upon renderer type change
      col.renderers = this.ctx.createRenderer(c);
      debounceUpdate();
    });
    const that = this;
    c.on(`${Column.EVENT_DIRTY_HEADER}.body`, function (this: IEventContext) {
      const valid = that.updateHeaderOf(col.c);
      if (!valid) {
        EngineRanking.disableListener(c); // destroy myself
      }
      if (this.primaryType === Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED || this.primaryType === Column.EVENT_LABEL_CHANGED || this.primaryType === Column.EVENT_METADATA_CHANGED) {
        return;
      }
      self.setTimeout(() => that.updateHist(col.c), 50);
    });
    c.on(`${Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED}.body`, () => {
      // replace myself upon renderer type change
      col.renderers = this.ctx.createRenderer(c);
      const valid = this.updateHeaderOf(col.c);
      if (!valid) {
        EngineRanking.disableListener(c); // destroy myself
      }
    });
    c.on(`${Column.EVENT_DIRTY_VALUES}.body`, debounceUpdate);

    if (isMultiLevelColumn(c) && !c.getCollapsed()) {
      (<MultiLevelRenderColumn>col).updateWidthRule(this.style);
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, () => {
        (<MultiLevelRenderColumn>col).updateWidthRule(this.style);
      });
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, debounceUpdate);
    }

    return col;
  }

  private static isCanvasRenderedRow(row: HTMLElement) {
    return row.classList.contains(cssClass('low')) && row.childElementCount >= 1 && row.firstElementChild!.nodeName.toLowerCase() === 'canvas';
  }

  private static disableListener(c: Column) {
    c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, null);
    c.on(`${ValueColumn.EVENT_DATA_LOADED}.hist`, null);
    c.on([`${Column.EVENT_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_GROUP_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_LABEL_CHANGED}.body`], null);
    c.on(`${Ranking.EVENT_DIRTY_HEADER}.body`, null);
    c.on(`${Ranking.EVENT_DIRTY_VALUES}.body`, null);

    if (!(isMultiLevelColumn(c))) {
      return;
    }
    c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, null);
    c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, null);
  }
}
