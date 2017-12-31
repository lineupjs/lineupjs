/**
 * Created by Samuel Gratzl on 27.09.2017.
 */
import {IExceptionContext, nonUniformContext, uniformContext} from 'lineupengine/src/logic';
import PrefetchMixin from 'lineupengine/src/mixin/PrefetchMixin';
import GridStyleManager, {setColumn} from 'lineupengine/src/style/GridStyleManager';
import {ACellTableSection, ICellRenderContext} from 'lineupengine/src/table/ACellTableSection';
import {ITableSection} from 'lineupengine/src/table/MultiTableRowRenderer';
import AEventDispatcher from '../internal/AEventDispatcher';
import debounce from '../internal/debounce';
import {IDataRow, IGroupData, IGroupItem, isGroup} from '../model';
import Column from '../model/Column';
import {isMultiLevelColumn} from '../model/CompositeColumn';
import Ranking from '../model/Ranking';
import StackColumn from '../model/StackColumn';
import {IRenderContext} from '../renderer';
import {COLUMN_PADDING} from '../styles';
import {lineupAnimation} from './animation';
import {IRankingBodyContext, IRankingHeaderContextContainer} from './interfaces';
import MultiLevelRenderColumn from './MultiLevelRenderColumn';
import RenderColumn, {IRenderers} from './RenderColumn';
import SelectionManager from './SelectionManager';

export interface IEngineRankingContext extends IRankingHeaderContextContainer, IRenderContext {
  createRenderer(c: Column): IRenderers;
}


export interface IEngineRankingOptions {
  animation: boolean;
  levelOfDetail: (rowIndex: number) => 'high'|'false';
  customRowUpdate: (row: HTMLElement, rowIndex: number) => void;
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
    levelOfDetail: () => 'high',
    customRowUpdate: () => undefined
  };

  private readonly delayedUpdate: (this: { type: string }) => void;
  private readonly columns: RenderColumn[];

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
    this.forEachRow((row, rowIndex) => this.updateRow(row, rowIndex));
  }

  updateHeaderOf(i: number) {
    const node = <HTMLElement>this.header.children[i]!;
    const column = this._context.columns[i];
    this.updateHeader(node, column);
  }

  protected createRow(node: HTMLElement, rowIndex: number): void {
    node.classList.add('lu-row');
    const lod = this.options.levelOfDetail(rowIndex);
    if (lod === 'high') {
      delete node.dataset.lod;
    } else {
      node.dataset.lod = lod;
    }
    super.createRow(node, rowIndex);

    this.options.customRowUpdate(node, rowIndex);

    if (this.renderCtx.isGroup(rowIndex)) {
      node.dataset.agg = 'group';
      return;
    }

    const {i, meta} = this.renderCtx.getRow(rowIndex);
    node.dataset.i = i.toString();
    node.dataset.agg = 'detail'; //or 'group'
    node.dataset.meta = meta || '';

    this.selection.updateState(node, i);
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
        node.dataset.i = '';
        this.selection.remove(node);
      } else {
        this.selection.add(node);
      }
    }

    if (!isGroup) {
      const {i, meta} = this.renderCtx.getRow(rowIndex);
      node.dataset.i = i.toString();
      node.dataset.meta = meta || '';
      this.selection.updateState(node, i);
    }

    super.updateRow(node, rowIndex);
  }

  updateSelection(selectedDataIndices: { has(i: number): boolean }) {
    this.forEachRow((node: HTMLElement, rowIndex: number) => {
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
    c.on(`${Ranking.EVENT_DIRTY_HEADER}.body`, () => this.updateHeaderOf(col.index));
    c.on(`${Ranking.EVENT_DIRTY_VALUES}.body`, debounceUpdate);

    if (isMultiLevelColumn(c) && !c.getCollapsed()) {
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, () => {
        (<MultiLevelRenderColumn>col).updateWidthRule(this.style);
      });
      c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, debounceUpdate);
    }

    return col;
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
