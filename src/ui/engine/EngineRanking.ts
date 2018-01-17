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
import {IExceptionContext, nonUniformContext, uniformContext} from 'lineupengine/src/logic';
import StackColumn from '../../model/StackColumn';
import {isMultiLevelColumn} from '../../model/CompositeColumn';
import {IGroupData, IGroupItem, IRankingBodyContext, IRankingHeaderContextContainer, isGroup} from './interfaces';
import {IDOMRenderContext} from '../../renderer/RendererContexts';
import {IDataRow} from '../../provider/ADataProvider';
import {AEventDispatcher, debounce} from '../../utils';
import SelectionManager from './SelectionManager';
import {lineupAnimation} from './animation';
import PrefetchMixin from 'lineupengine/src/mixin/PrefetchMixin';
import {setColumn} from 'lineupengine/src/style/GridStyleManager';

export interface IEngineRankingContext extends IRankingHeaderContextContainer, IDOMRenderContext {
  columnPadding: number;

  createRenderer(c: Column): IRenderers;
}


export interface IEngineRankingOptions {
  animation: boolean;
  customRowUpdate: (row: HTMLElement, rowIndex: number)=>void;
}



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

  private readonly events = new RankingEvents();
  readonly on = this.events.on.bind(this.events);

  private options: Readonly<IEngineRankingOptions> = {
    animation: true,
    customRowUpdate: () => undefined
  };

  private readonly delayedUpdate: (this: {type: string})=>void;
  private readonly delayedUpdateAll: ()=>void;
  private readonly delayedUpdateColumnWidths: ()=>void;

  constructor(public readonly ranking: Ranking, header: HTMLElement, body: HTMLElement, tableId: string, style: GridStyleManager, private readonly ctx: IEngineRankingContext, options: Partial<IEngineRankingOptions> = {}) {
    super(header, body, tableId, style, PrefetchMixin);
    Object.assign(this.options, options);

    const that = this;
    this.delayedUpdate = debounce((function(this: {type: string, primaryType: string}) {
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
    ranking.on(`${Ranking.EVENT_DIRTY_HEADER}.body`, debounce(() => this.updateHeaders(), 50));
    ranking.on(`${Ranking.EVENT_DIRTY_VALUES}.body`, this.delayedUpdate);
    ranking.on([`${Ranking.EVENT_ADD_COLUMN}.body`, `${Ranking.EVENT_REMOVE_COLUMN}.body`, `${Ranking.EVENT_MOVE_COLUMN}.body`, `${Ranking.EVENT_COLUMN_VISBILITY_CHANGED}.body`], this.delayedUpdateAll);
    ranking.on(`${Ranking.EVENT_ADD_COLUMN}.hist`, (col) => {
      col.on(`${Column.EVENT_DATA_LOADED}.hist`, () => this.updateHist(col));
      this.updateHist(col);
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
    const columns = this.createColumns();
    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100, this.ctx.columnPadding),
      hasFrozenColumns: columns.some((d) => d.frozen)
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

  updateAll() {
    const previous = this._context;
    previous.columns.forEach((c) => this.disableListener(c.c));
    const columns = this.createColumns();

    this._context = Object.assign({},this._context,{
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100, this.ctx.columnPadding),
      hasFrozenColumns: columns.some((d) => d.frozen)
    });

    super.recreate();
    this.events.fire(EngineRanking.EVENT_WIDTH_CHANGED);
  }

  updateBody() {
    if (this.hidden) {
      return;
    }
    this.events.fire(EngineRanking.EVENT_WIDTH_CHANGED);
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

  updateHeaderOfColumn(col: Column) {
    const index = this._context.columns.findIndex((d) => d.c === col);
    if (index >= 0) {
      this.updateHeaderOf(index);
    }
  }

  protected createRow(node: HTMLElement, rowIndex: number): void {
    super.createRow(node, rowIndex);
    const isGroup = this.renderCtx.isGroup(rowIndex);

    this.options.customRowUpdate(node, rowIndex);

    if (isGroup) {
      node.dataset.agg = 'group';
      return;
    }

    const {dataIndex, meta} = this.renderCtx.getRow(rowIndex);
    node.dataset.dataIndex = dataIndex.toString();
    node.dataset.agg = 'detail'; //or 'group'
    node.dataset.meta = meta || '';

    this.selection.updateState(node, dataIndex);
    this.selection.add(node);
  }

  protected updateRow(node: HTMLElement, rowIndex: number): void {
    const isGroup = this.renderCtx.isGroup(rowIndex);
    const wasGroup = node.dataset.agg === 'group';

    this.options.customRowUpdate(node, rowIndex);

    if (isGroup !== wasGroup) {
      // change of mode clear the children to reinitialize them
      node.innerHTML = '';

      // adapt body
      node.dataset.agg = isGroup ? 'group' : 'detail';
      if (isGroup) {
        node.dataset.dataIndex = '';
        this.selection.remove(node);
      } else {
        this.selection.add(node);
      }
    }

    if (!isGroup) {
      const {dataIndex, meta} = this.renderCtx.getRow(rowIndex);
      node.dataset.dataIndex = dataIndex.toString();
      node.dataset.meta = meta || '';
      this.selection.updateState(node, dataIndex);
    }

    super.updateRow(node, rowIndex);
  }

  updateSelection(selectedDataIndices: {has(dataIndex: number): boolean}) {
    this.forEachRow((node: HTMLElement, rowIndex: number) => {
      if(this.renderCtx.isGroup(rowIndex)) {
        this.updateRow(node, rowIndex);
      } else {
        // fast pass for item
        this.selection.update(node, selectedDataIndices);
      }
    }, true);
  }

  updateColumnWidths() {
    // update the column context in place
    (<any>this._context).column = nonUniformContext(this._context.columns.map((w) => w.width), 100, this.ctx.columnPadding);
    super.updateColumnWidths();
    const {columns} = this.context;
    //no data update needed since just width changed
    columns.forEach((column) => {
      if (column instanceof MultiLevelRenderColumn) {
        column.updateWidthRule(this.style);
      }
    });
    this.events.fire(EngineRanking.EVENT_WIDTH_CHANGED);
  }

  private updateHist(col: Column) {
    this.events.fire(EngineRanking.EVENT_UPDATE_HIST, col);
  }

  private updateColumn(index: number) {
    const column = this.context.columns[index];
    this.forEachRow((row, rowIndex) => {
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
    this.ranking.flatColumns.forEach((c) => this.disableListener(c));
  }

  private disableListener(c: Column) {
    c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, null);
    c.on(`${Column.EVENT_DATA_LOADED}.hist`, null);
    c.on([`${Column.EVENT_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_GROUP_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_LABEL_CHANGED}.body`], null);
    if (!(isMultiLevelColumn(c))) {
      return;
    }
    c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, null);
    c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, null);
  }

  groupData(data: IDataRow[]): (IGroupItem | IGroupData)[] {
    const groups = this.ranking.getGroups();
    const provider = this.ctx.provider;
    const toMeta = (relativeIndex: number, length: number): 'first'|'last'|'first last'|undefined => {
      if (length === 1) {
        return 'first last';
      }
      if (relativeIndex === 0) {
        return 'first';
      }
      if (relativeIndex === length -1) {
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
      } else {
        r.push(...groupData.map((r, i) => Object.assign({group, relativeIndex: i, meta: toMeta(i, groupData.length)}, r)));
      }
    });
    return r;
  }

  render(data: (IGroupItem | IGroupData)[], rowContext: IExceptionContext) {
    const previous = this._context;
    previous.columns.forEach((c) => this.disableListener(c.c));
    const previousData = this.data;
    this.data = data;
    (<any>this.renderCtx).totalNumberOfRows = data.length;

    const columns = this.createColumns();

    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100, this.ctx.columnPadding)
    }, rowContext);

    return super.recreate(this.options.animation ? lineupAnimation(previous, previousData, this.data) : undefined);
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
    return cols.map((c, i) => this.createColumn(c, i));
  }

  private createColumn(c: Column, i: number) {
    const renderers = this.ctx.createRenderer(c);

    c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, (oldValue: number, newValue: number) => {
      if (oldValue <= 0 || newValue <= 0) {
        // aka visibility changed, handled by a central unit, see constructor
        return;
      }
      this.delayedUpdateColumnWidths();
    });
    c.on(`${Column.EVENT_DATA_LOADED}.hist`, () => this.updateHist(c));
    c.on([`${Column.EVENT_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_GROUP_RENDERER_TYPE_CHANGED}.body`, `${Column.EVENT_LABEL_CHANGED}.body`], () => {
      // replace myself upon renderer type change
      this.disableListener(c);
      this._context.columns[i] = this.createColumn(c, i);
      this.updateColumn(i);
    });

    if (isMultiLevelColumn(c) && !c.getCollapsed()) {
      const r = new MultiLevelRenderColumn(c, renderers, i, this.ctx.columnPadding);
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, () => {
        r.updateWidthRule(this.style);
      });
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, debounce(() => this.updateColumn(i), 25));

      return r;
    }
    return new RenderColumn(c, renderers, i);
  }
}
