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
import {AEventDispatcher, debounce} from '../../utils';
import {IAnimationContext} from 'lineupengine/src/animation/index';
import KeyFinder from 'lineupengine/src/animation/KeyFinder';
import SelectionManager from './SelectionManager';

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

  fire(type: string | string[], ...args: any[]) {
    super.fire(type, ...args);
  }
  protected createEventList() {
    return super.createEventList().concat([RankingEvents.EVENT_WIDTH_CHANGED, RankingEvents.EVENT_UPDATE_DATA]);
  }
}

export default class EngineRanking extends ACellTableSection<RenderColumn> implements ITableSection {
  static readonly EVENT_WIDTH_CHANGED = RankingEvents.EVENT_WIDTH_CHANGED;
  static readonly EVENT_UPDATE_DATA = RankingEvents.EVENT_UPDATE_DATA;

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

  private readonly delayedUpdate = debounce(() => this.events.fire(EngineRanking.EVENT_UPDATE_DATA), 50);

  constructor(public readonly ranking: Ranking, header: HTMLElement, body: HTMLElement, tableId: string, style: GridStyleManager, private readonly ctx: IEngineRankingContext, options: Partial<IEngineRankingOptions> = {}) {
    super(header, body, tableId, style);
    Object.assign(this.options, options);

    ranking.on(`${Ranking.EVENT_DIRTY_HEADER}.body`, debounce(() => this.updateHeaders(), 50));
    ranking.on(`${Ranking.EVENT_DIRTY_VALUES}.body`, debounce(() => this.updateBody(), 50));
    ranking.on([`${Ranking.EVENT_ADD_COLUMN}.body`, `${Ranking.EVENT_REMOVE_COLUMN}.body`], debounce(() => this.updateAll(), 50));
    ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.body`, () => {
      this.delayedUpdate();
    });

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
      column: nonUniformContext(columns.map((w) => w.width), 100, this.ctx.columnPadding)
    }, uniformContext(0, 20));
  }

  get id() {
    return this.ranking.id;
  }

  protected onVisibilityChanged(visible: boolean) {
    super.onVisibilityChanged(visible);
    if (visible) {
      this.delayedUpdate();
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
    const columns = this.createColumns();

    this._context = Object.assign({},this._context,{
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100, this.ctx.columnPadding)
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
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    this.updateHeader(node, column);
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
    this.forEachRow((node: HTMLElement) => {
      this.selection.update(node, selectedDataIndices);
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
    this.events.fire(EngineRanking.EVENT_WIDTH_CHANGED);
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

  groupData(data: IDataRow[]): (IGroupItem | IGroupData)[] {
    const groups = this.ranking.getGroups();
    const provider = this.ctx.provider;
    const toMeta = (relativeIndex: number, length: number): 'first'|'last'|undefined => {
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

  private static toKey(item: IGroupItem | IGroupData) {
    if (isGroup(item)) {
      return item.name;
    }
    return (<IGroupItem>item).dataIndex.toString();
  }

  private static toGroupLookup(items: (IGroupItem | IGroupData)[]): IGroupLookUp {
    const item2groupIndex = new Map<number, number>();
    const group2firstItemIndex = new Map<string, number>();
    items.forEach((item, i) => {
      if (isGroup(item)) {
        item.rows.forEach((d) => item2groupIndex.set(d.dataIndex, i));
      } else if (item.relativeIndex === 0 && item.group) {
        group2firstItemIndex.set(item.group.name, i);
      }
    });
    return {item2groupIndex, group2firstItemIndex};
  }

  //private static toColor(current: number, previous: number) {
  //  if (current === previous || previous < 0 || current < 0) {
  //    return null;
  //  }
  //  const delta = current - previous;
  //  return `rgba(${delta > 0 ? 255: 0}, ${delta < 0 ? 255: 0}, 0, ${0.25 * Math.min(1,Math.abs(delta) / 10)})`;
  //}

  render(data: (IGroupItem | IGroupData)[], rowContext: IExceptionContext) {
    const previous = this._context;
    const previousData = this.data;
    this.data = data;
    (<any>this.renderCtx).totalNumberOfRows = data.length;

    const columns = this.createColumns();

    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100, this.ctx.columnPadding)
    }, rowContext);

    if (!this.options.animation) {
      return super.recreate();
    }

    const previousKey = (index: number) => EngineRanking.toKey(previousData[index]);
    const currentKey = (index: number) => EngineRanking.toKey(this.data[index]);

    const animCtx: IAnimationContext = {
      previous, previousKey, currentKey
    };

    animCtx.animate = (node: HTMLElement, _currentRowIndex, previousRowIndex, phase) => {
      switch(phase) {
        case 'before':
          node.style.opacity = previousRowIndex < 0 ? '0' : null;
          //node.style.backgroundColor = EngineRanking.toColor(currentRowIndex, previousRowIndex);
          break;
        case 'after':
        case 'cleanup':
          node.style.opacity = null;
          //node.style.backgroundColor = null;
          break;
      }
    };
    animCtx.removeAnimate = (node: HTMLElement, _currentRowIndex, _previousRowIndex, phase) => {
      switch(phase) {
        case 'before':
          //node.style.backgroundColor = EngineRanking.toColor(currentRowIndex, previousRowIndex);
          break;
        case 'after':
          node.style.opacity = '0';
          //node.style.backgroundColor = null;
          break;
        case 'cleanup':
          node.style.opacity = null;
          break;
      }
    };

    if (this.ranking.getGroupCriteria().length > 0) {
      // potential for aggregation changes
      // try to appear where the group was uncollapsed and vice versa
      const prevHelper: IGroupLookUp = EngineRanking.toGroupLookup(previousData);
      const currHelper: IGroupLookUp = EngineRanking.toGroupLookup(this.data);
      animCtx.appearPosition = (currentRowIndex: number, previousFinder: KeyFinder) => {
        const item = this.data[currentRowIndex];
        const referenceIndex = isGroup(item) ? prevHelper.group2firstItemIndex.get(item.name) : prevHelper.item2groupIndex.get(item.dataIndex);
        if (referenceIndex === undefined) {
          return this._context.totalHeight;
        }
        const pos = previousFinder.posByKey(previousKey(referenceIndex));
        return pos.pos >= 0 ? pos.pos : this._context.totalHeight;
      };
      animCtx.removePosition = (previousRowIndex: number, currentFinder: KeyFinder) => {
        const item = previousData[previousRowIndex];
        const referenceIndex = isGroup(item) ? currHelper.group2firstItemIndex.get(item.name) : currHelper.item2groupIndex.get(item.dataIndex);
        if (referenceIndex === undefined) {
          return this._context.totalHeight;
        }
        const pos = currentFinder.posByKey(currentKey(referenceIndex));
        return pos.pos >= 0 ? pos.pos : this._context.totalHeight;
      };
    }
    super.recreate(animCtx);
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

interface IGroupLookUp {
  item2groupIndex: Map<number, number>;
  group2firstItemIndex: Map<string, number>;
}
