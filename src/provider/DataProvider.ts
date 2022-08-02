import {
  AEventDispatcher,
  createIndexArray,
  debounce,
  IDebounceContext,
  IEventContext,
  IEventListener,
  isComplexAccessor,
  ISequence,
  lazySeq,
  OrderedSet,
  rowComplexGetter,
  rowGetter,
  rowGuessGetter,
  sortComplex,
  suffix,
} from '../internal';
import {
  AggregateGroupColumn,
  Column,
  CompositeColumn,
  createAggregateDesc,
  createRankDesc,
  createSelectionDesc,
  defaultGroup,
  EAggregationState,
  EDirtyReason,
  IAggregateGroupColumnDesc,
  IColorMappingFunctionConstructor,
  IColumnConstructor,
  IColumnDesc,
  IColumnDump,
  ICompareValue,
  IDataRow,
  IGroup,
  IMappingFunctionConstructor,
  IndicesArray,
  INumberColumn,
  IOrderedGroup,
  IRankingDump,
  ISelectionColumnDesc,
  isSupportType,
  ITypeFactory,
  RankColumn,
  Ranking,
  ValueColumn,
} from '../model';
import { restoreCategoricalColorMapping } from '../model/CategoricalColorMappingFunction';
import { colorMappingFunctions, createColorMappingFunction } from '../model/ColorMappingFunction';
import {
  duplicateGroup,
  everyIndices,
  forEachIndices,
  joinGroups,
  mapIndices,
  toGroupID,
  unifyParents,
} from '../model/internal';
import { createMappingFunction, mappingFunctions } from '../model/MappingFunction';
import { models } from '../model/models';
import ADataProvider from './DataProvider';
import { DirectRenderTasks } from './DirectRenderTasks';
import { IDataProvider, IDataProviderDump, DataProviderOptions, IExportOptions, SCHEMA_REF } from './interfaces';
import { convertAggregationState } from './internal';
import { CompareLookup } from './sort';
import { exportRanking, exportTable, isPromiseLike, map2Object, object2Map } from './utils';

interface ISortHelper {
  group: IGroup;
  rows: IndicesArray;
}
/**
 * emitted when a column has been added
 * @asMemberOf ADataProvider
 * @event
 */
export declare function addColumn(col: Column, index: number): void;

/**
 * emitted when a column has been moved within this composite column
 * @asMemberOf ADataProvider
 * @event
 */
export declare function moveColumn(col: Column, index: number, oldIndex: number): void;

/**
 * emitted when a column has been removed
 * @asMemberOf ADataProvider
 * @event
 */
export declare function removeColumn(col: Column, index: number): void;
/**
 * @asMemberOf ADataProvider
 * @event
 */
export declare function orderChanged(
  previous: number[],
  current: number[],
  previousGroups: IOrderedGroup[],
  currentGroups: IOrderedGroup[],
  dirtyReason: EDirtyReason[]
): void;

/**
 * emitted when state of the column is dirty
 * @asMemberOf ADataProvider
 * @event
 */
export declare function dirty(): void;

/**
 * emitted when state of the column related to its header is dirty
 * @asMemberOf ADataProvider
 * @event
 */
export declare function dirtyHeader(): void;

/**
 * emitted when state of the column related to its values is dirty
 * @asMemberOf ADataProvider
 * @event
 */
export declare function dirtyValues(): void;

/**
 * emitted when state of the column related to cached values (hist, compare, ...) is dirty
 * @asMemberOf ADataProvider
 * @event
 */
export declare function dirtyCaches(): void;

/**
 * emitted when the data changes
 * @asMemberOf ADataProvider
 * @param rows the new data rows
 * @event
 */
export declare function dataChanged(rows: IDataRow[]): void;

/**
 * emitted when the selection changes
 * @asMemberOf ADataProvider
 * @param dataIndices the selected data indices
 * @event
 */
export declare function selectionChanged(dataIndices: number[]): void;
/**
 * @asMemberOf ADataProvider
 * @event
 */
export declare function addRanking(ranking: Ranking, index: number): void;
/**
 * @asMemberOf ADataProvider
 * @param ranking if null all rankings are removed else just the specific one
 * @event
 */
export declare function removeRanking(ranking: Ranking | null, index: number): void;

/**
 * @asMemberOf ADataProvider
 * @event
 */
export declare function addDesc(desc: IColumnDesc): void;
/**
 * @asMemberOf ADataProvider
 * @event
 */
export declare function removeDesc(desc: IColumnDesc): void;
/**
 * @asMemberOf ADataProvider
 * @event
 */
export declare function clearDesc(): void;

/**
 * @asMemberOf ADataProvider
 * @event
 */
export declare function showTopNChanged(previous: number, current: number): void;

/**
 * emitted when the selection changes
 * @asMemberOf ADataProvider
 * @param dataIndices the selected data indices
 * @event
 */
export declare function jumpToNearest(dataIndices: number[]): void;
/**
 * @asMemberOf ADataProvider
 * @event
 */
export declare function aggregate(
  ranking: Ranking,
  group: IGroup | IGroup[],
  previousTopN: number | number[],
  currentTopN: number | number[]
): void;

/**
 * @asMemberOf ADataProvider
 * @event
 */
export declare function busy(busy: boolean): void;

function injectAccessor(d: any) {
  d.accessor = d.accessor || (d.column ? (isComplexAccessor(d.column) ? rowComplexGetter : rowGetter) : rowGuessGetter);
  d.label = d.label || d.column;
  return d;
}

function toDirtyReason(ctx: IEventContext) {
  const primary = ctx.primaryType;
  switch (primary || '') {
    case Ranking.EVENT_DIRTY_ORDER:
      return ctx.args[0] || [EDirtyReason.UNKNOWN];
    case Ranking.EVENT_SORT_CRITERIA_CHANGED:
      return [EDirtyReason.SORT_CRITERIA_CHANGED];
    case Ranking.EVENT_GROUP_CRITERIA_CHANGED:
      return [EDirtyReason.GROUP_CRITERIA_CHANGED];
    case Ranking.EVENT_GROUP_SORT_CRITERIA_CHANGED:
      return [EDirtyReason.GROUP_SORT_CRITERIA_CHANGED];
    default:
      return [EDirtyReason.UNKNOWN];
  }
}

function mergeDirtyOrderContext(current: IDebounceContext, next: IDebounceContext) {
  const currentReason = toDirtyReason(current.self);
  const nextReason = toDirtyReason(next.self);
  const combined = new Set(currentReason);
  for (const r of nextReason) {
    combined.add(r);
  }
  const args = [Array.from(combined)];
  return {
    self: {
      primaryType: Ranking.EVENT_DIRTY_ORDER,
      args,
    },
    args,
  };
}

/**
 * a basic data provider holding the data and rankings
 */
export default class DataProvider extends AEventDispatcher implements IDataProvider {
  static readonly EVENT_SELECTION_CHANGED = 'selectionChanged';
  static readonly EVENT_DATA_CHANGED = 'dataChanged';
  static readonly EVENT_ADD_COLUMN = Ranking.EVENT_ADD_COLUMN;
  static readonly EVENT_MOVE_COLUMN = Ranking.EVENT_MOVE_COLUMN;
  static readonly EVENT_REMOVE_COLUMN = Ranking.EVENT_REMOVE_COLUMN;
  static readonly EVENT_ADD_RANKING = 'addRanking';
  static readonly EVENT_REMOVE_RANKING = 'removeRanking';
  static readonly EVENT_DIRTY = Ranking.EVENT_DIRTY;
  static readonly EVENT_DIRTY_HEADER = Ranking.EVENT_DIRTY_HEADER;
  static readonly EVENT_DIRTY_VALUES = Ranking.EVENT_DIRTY_VALUES;
  static readonly EVENT_DIRTY_CACHES = Ranking.EVENT_DIRTY_CACHES;
  static readonly EVENT_ORDER_CHANGED = Ranking.EVENT_ORDER_CHANGED;
  static readonly EVENT_SHOWTOPN_CHANGED = 'showTopNChanged';
  static readonly EVENT_ADD_DESC = 'addDesc';
  static readonly EVENT_CLEAR_DESC = 'clearDesc';
  static readonly EVENT_REMOVE_DESC = 'removeDesc';
  static readonly EVENT_JUMP_TO_NEAREST = 'jumpToNearest';
  static readonly EVENT_GROUP_AGGREGATION_CHANGED = AggregateGroupColumn.EVENT_AGGREGATE;
  static readonly EVENT_BUSY = 'busy';

  private static readonly FORWARD_RANKING_EVENTS = suffix(
    '.provider',
    Ranking.EVENT_ADD_COLUMN,
    Ranking.EVENT_REMOVE_COLUMN,
    Ranking.EVENT_DIRTY,
    Ranking.EVENT_DIRTY_HEADER,
    Ranking.EVENT_MOVE_COLUMN,
    Ranking.EVENT_ORDER_CHANGED,
    Ranking.EVENT_DIRTY_VALUES,
    Ranking.EVENT_DIRTY_CACHES
  );

  /**
   * all rankings
   * @type {Array}
   * @private
   */
  private readonly rankings: Ranking[] = [];

  /**
   * the current selected indices
   * @type {OrderedSet}
   */
  private readonly selection = new OrderedSet<number>();

  //Map<ranking.id@group.name, -1=expand,0=collapse,N=topN>
  private readonly aggregations = new Map<string, number>(); // not part of = show all

  private uid = 0;
  private readonly typeFactory: ITypeFactory;

  private readonly options: Readonly<DataProviderOptions> = {
    columnTypes: {},
    colorMappingFunctionTypes: {},
    mappingFunctionTypes: {},
    singleSelection: false,
    showTopN: 10,
    aggregationStrategy: 'item',
    propagateAggregationState: true,
    /**
     * whether the filter should be applied to all rankings regardless where they are
     */
    filterGlobally: false,
    jumpToSearchResult: false,
    stringTopNCount: 10,
  };

  private readonly reorderAll: () => void;

  private _dataRows: IDataRow[];
  private filter: ((row: IDataRow) => boolean) | null = null;
  private readonly tasks: DirectRenderTasks;

  /**
   * lookup map of a column type to its column implementation
   */
  readonly columnTypes: { [columnType: string]: IColumnConstructor };
  readonly colorMappingFunctionTypes: { [colorMappingFunctionType: string]: IColorMappingFunctionConstructor };
  readonly mappingFunctionTypes: { [mappingFunctionType: string]: IMappingFunctionConstructor };

  private showTopN: number;

  private rankingIndex = 0;

  constructor(private _data: any[], private columns: IColumnDesc[] = [], options: Partial<DataProviderOptions> = {}) {
    super();
    Object.assign(this.options, options);
    this.columnTypes = Object.assign(models(), this.options.columnTypes);
    this.colorMappingFunctionTypes = Object.assign(colorMappingFunctions(), this.options.colorMappingFunctionTypes);
    this.mappingFunctionTypes = Object.assign(mappingFunctions(), this.options.mappingFunctionTypes);
    this.showTopN = this.options.showTopN;

    this.typeFactory = this.createTypeFactory();
    //generate the accessor
    columns.forEach(injectAccessor);

    this._dataRows = toRows(_data);
    this.tasks = new DirectRenderTasks(this.options);
    this.tasks.setData(this._dataRows);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    this.reorderAll = function (this: { source?: Ranking; type: string }) {
      //fire for all other rankings a dirty order event, too
      const ranking = this.source;
      const type = this.type;
      for (const r of that.getRankings()) {
        if (r !== ranking) {
          r.dirtyOrder(type === Ranking.EVENT_FILTER_CHANGED ? [EDirtyReason.FILTER_CHANGED] : [EDirtyReason.UNKNOWN]);
        }
      }
    };
  }

  private createTypeFactory() {
    const factory = ((d: IColumnDump) => {
      const desc = this.fromDescRef(d.desc);
      if (!desc || !desc.type) {
        console.warn('cannot restore column dump', d);
        return new Column(d.id || '', d.desc || {});
      }
      this.fixDesc(desc);
      const type = this.columnTypes[desc.type];
      if (type == null) {
        console.warn('invalid column type in column dump using column', d);
        return new Column(d.id || '', desc);
      }
      const c = this.instantiateColumn(type, '', desc, this.typeFactory);
      c.restore(d, factory);
      return this.patchColumn(c);
    }) as ITypeFactory;
    factory.colorMappingFunction = createColorMappingFunction(this.colorMappingFunctionTypes, factory);
    factory.mappingFunction = createMappingFunction(this.mappingFunctionTypes);
    factory.categoricalColorMappingFunction = restoreCategoricalColorMapping;
    return factory;
  }

  getTypeFactory() {
    return this.typeFactory;
  }

  /**
   * events:
   *  * column changes: addColumn, removeColumn
   *  * ranking changes: addRanking, removeRanking
   *  * dirty: dirty, dirtyHeder, dirtyValues
   *  * selectionChanged
   * @returns {string[]}
   */
  protected createEventList() {
    return super
      .createEventList()
      .concat([
        ADataProvider.EVENT_DATA_CHANGED,
        ADataProvider.EVENT_BUSY,
        ADataProvider.EVENT_SHOWTOPN_CHANGED,
        ADataProvider.EVENT_ADD_COLUMN,
        ADataProvider.EVENT_REMOVE_COLUMN,
        ADataProvider.EVENT_MOVE_COLUMN,
        ADataProvider.EVENT_ADD_RANKING,
        ADataProvider.EVENT_REMOVE_RANKING,
        ADataProvider.EVENT_DIRTY,
        ADataProvider.EVENT_DIRTY_HEADER,
        ADataProvider.EVENT_DIRTY_VALUES,
        ADataProvider.EVENT_DIRTY_CACHES,
        ADataProvider.EVENT_ORDER_CHANGED,
        ADataProvider.EVENT_SELECTION_CHANGED,
        ADataProvider.EVENT_ADD_DESC,
        ADataProvider.EVENT_CLEAR_DESC,
        ADataProvider.EVENT_JUMP_TO_NEAREST,
        ADataProvider.EVENT_GROUP_AGGREGATION_CHANGED,
      ]);
  }

  on(type: typeof ADataProvider.EVENT_BUSY, listener: typeof busy | null): this;
  on(type: typeof ADataProvider.EVENT_DATA_CHANGED, listener: typeof dataChanged | null): this;
  on(type: typeof ADataProvider.EVENT_SHOWTOPN_CHANGED, listener: typeof showTopNChanged | null): this;
  on(type: typeof ADataProvider.EVENT_ADD_COLUMN, listener: typeof addColumn | null): this;
  on(type: typeof ADataProvider.EVENT_MOVE_COLUMN, listener: typeof moveColumn | null): this;
  on(type: typeof ADataProvider.EVENT_REMOVE_COLUMN, listener: typeof removeColumn | null): this;
  on(type: typeof ADataProvider.EVENT_ADD_RANKING, listener: typeof addRanking | null): this;
  on(type: typeof ADataProvider.EVENT_REMOVE_RANKING, listener: typeof removeRanking | null): this;
  on(type: typeof ADataProvider.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof ADataProvider.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof ADataProvider.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof ADataProvider.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof ADataProvider.EVENT_ORDER_CHANGED, listener: typeof orderChanged | null): this;
  on(type: typeof ADataProvider.EVENT_ADD_DESC, listener: typeof addDesc | null): this;
  on(type: typeof ADataProvider.EVENT_REMOVE_DESC, listener: typeof removeDesc | null): this;
  on(type: typeof ADataProvider.EVENT_CLEAR_DESC, listener: typeof clearDesc | null): this;
  on(type: typeof ADataProvider.EVENT_JUMP_TO_NEAREST, listener: typeof jumpToNearest | null): this;
  on(type: typeof ADataProvider.EVENT_GROUP_AGGREGATION_CHANGED, listener: typeof aggregate | null): this;
  on(type: typeof ADataProvider.EVENT_SELECTION_CHANGED, listener: typeof selectionChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  /**
   * adds a new ranking
   * @param existing an optional existing ranking to clone
   * @return the new ranking
   */
  pushRanking(existing?: Ranking): Ranking {
    const r = this.cloneRanking(existing);

    this.insertRanking(r);
    return r;
  }

  protected fireBusy(busy: boolean) {
    this.fire(ADataProvider.EVENT_BUSY, busy);
  }

  takeSnapshot(col: Column): Ranking {
    this.fireBusy(true);
    const r = this.cloneRanking();
    const ranking = col.findMyRanker();
    // by convention copy all support types and the first string column
    let hasString = col.desc.type === 'string';
    let hasColumn = false;
    const toClone = !ranking
      ? [col]
      : ranking.children.filter((c) => {
          if (c === col) {
            hasColumn = true;
            return true;
          }
          if (!hasString && c.desc.type === 'string') {
            hasString = true;
            return true;
          }
          return isSupportType(c);
        });

    if (!hasColumn) {
      // maybe a nested one thus not in the top level
      toClone.push(col);
    }

    toClone.forEach((c) => {
      const clone = this.clone(c);
      r.push(clone);
      if (c === col) {
        clone.sortByMe();
      }
    });
    this.insertRanking(r);
    this.fireBusy(false);
    return r;
  }

  insertRanking(r: Ranking, index = this.rankings.length) {
    this.rankings.splice(index, 0, r);
    this.forward(r, ...ADataProvider.FORWARD_RANKING_EVENTS);
    //delayed reordering per ranking
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    r.on(
      `${Ranking.EVENT_DIRTY_ORDER}.provider`,
      debounce(
        function (this: IEventContext) {
          that.triggerReorder(r, toDirtyReason(this));
        },
        100,
        mergeDirtyOrderContext
      )
    );
    this.fire(
      [
        ADataProvider.EVENT_ADD_RANKING,
        ADataProvider.EVENT_DIRTY_HEADER,
        ADataProvider.EVENT_DIRTY_VALUES,
        ADataProvider.EVENT_DIRTY,
      ],
      r,
      index
    );
    this.triggerReorder(r);
  }

  private triggerReorder(ranking: Ranking, dirtyReason?: EDirtyReason[]) {
    this.fireBusy(true);
    const reason = dirtyReason || [EDirtyReason.UNKNOWN];
    Promise.resolve(this.sort(ranking, reason)).then(({ groups, index2pos }) => {
      if (ranking.getGroupSortCriteria().length === 0) {
        groups = unifyParents(groups);
      }
      this.initAggregateState(ranking, groups);
      ranking.setGroups(groups, index2pos, reason);
      this.fireBusy(false);
    });
  }

  /**
   * removes a ranking from this data provider
   * @param ranking
   * @returns {boolean}
   */
  removeRanking(ranking: Ranking) {
    const i = this.rankings.indexOf(ranking);
    if (i < 0) {
      return false;
    }
    this.unforward(ranking, ...ADataProvider.FORWARD_RANKING_EVENTS);
    this.rankings.splice(i, 1);
    ranking.on(`${Ranking.EVENT_DIRTY_ORDER}.provider`, null);
    this.cleanUpRanking(ranking);
    this.fire(
      [
        ADataProvider.EVENT_REMOVE_RANKING,
        ADataProvider.EVENT_DIRTY_HEADER,
        ADataProvider.EVENT_DIRTY_VALUES,
        ADataProvider.EVENT_DIRTY,
      ],
      ranking,
      i
    );
    return true;
  }

  /**
   * removes all rankings
   */
  clearRankings() {
    this.rankings.forEach((ranking) => {
      this.unforward(ranking, ...ADataProvider.FORWARD_RANKING_EVENTS);
      ranking.on(`${Ranking.EVENT_DIRTY_ORDER}.provider`, null);
      this.cleanUpRanking(ranking);
    });
    // clear
    this.rankings.splice(0, this.rankings.length);
    this.fire(
      [
        ADataProvider.EVENT_REMOVE_RANKING,
        ADataProvider.EVENT_DIRTY_HEADER,
        ADataProvider.EVENT_DIRTY_VALUES,
        ADataProvider.EVENT_DIRTY,
      ],
      null,
      -1
    );
  }

  clearFilters() {
    this.rankings.forEach((ranking) => ranking.clearFilters());
  }

  /**
   * returns a list of all current rankings
   * @returns {Ranking[]}
   */
  getRankings() {
    return this.rankings.slice();
  }

  /**
   * returns the last ranking for quicker access
   * @returns {Ranking}
   */
  getFirstRanking() {
    return this.rankings[0] || null;
  }

  /**
   * returns the last ranking for quicker access
   * @returns {Ranking}
   */
  getLastRanking() {
    return this.rankings[this.rankings.length - 1];
  }

  ensureOneRanking() {
    if (this.rankings.length === 0) {
      const r = this.pushRanking();
      this.push(r, createRankDesc());
    }
  }

  /**
   * adds a column to a ranking described by its column description
   * @param ranking the ranking to add the column to
   * @param desc the description of the column
   * @return {Column} the newly created column or null
   */
  push(ranking: Ranking, desc: IColumnDesc): Column | null {
    const r = this.create(desc);
    if (r) {
      ranking.push(r);
      return r;
    }
    return null;
  }

  /**
   * adds a column to a ranking described by its column description
   * @param ranking the ranking to add the column to
   * @param index the position to insert the column
   * @param desc the description of the column
   * @return {Column} the newly created column or null
   */
  insert(ranking: Ranking, index: number, desc: IColumnDesc) {
    const r = this.create(desc);
    if (r) {
      ranking.insert(r, index);
      return r;
    }
    return null;
  }

  /**
   * creates a new unique id for a column
   * @returns {string}
   */
  private nextId() {
    return `col${this.uid++}`;
  }

  private fixDesc(desc: IColumnDesc) {
    //hacks for provider dependent descriptors
    if (desc.type === 'selection') {
      (desc as ISelectionColumnDesc).accessor = (row: IDataRow) => this.isSelected(row.i);
      (desc as ISelectionColumnDesc).setter = (index: number, value: boolean) =>
        value ? this.select(index) : this.deselect(index);
      (desc as ISelectionColumnDesc).setterAll = (indices: IndicesArray, value: boolean) =>
        value ? this.selectAll(indices) : this.deselectAll(indices);
    } else if (desc.type === 'aggregate') {
      (desc as IAggregateGroupColumnDesc).isAggregated = (ranking: Ranking, group: IGroup) =>
        this.getAggregationState(ranking, group);
      (desc as IAggregateGroupColumnDesc).setAggregated = (ranking: Ranking, group: IGroup, value: EAggregationState) =>
        this.setAggregationState(ranking, group, value);
    }
    return desc;
  }

  protected cleanDesc(desc: IColumnDesc) {
    //hacks for provider dependent descriptors
    if (desc.type === 'selection') {
      delete (desc as ISelectionColumnDesc).accessor;
      delete (desc as ISelectionColumnDesc).setter;
      delete (desc as ISelectionColumnDesc).setterAll;
    } else if (desc.type === 'aggregate') {
      delete (desc as IAggregateGroupColumnDesc).isAggregated;
      delete (desc as IAggregateGroupColumnDesc).setAggregated;
    }
    return desc;
  }

  /**
   * creates an internal column model out of the given column description
   * @param desc
   * @returns {Column} the new column or null if it can't be created
   */
  create(desc: IColumnDesc): Column | null {
    this.fixDesc(desc);
    //find by type and instantiate
    const type = this.columnTypes[desc.type];
    if (type) {
      return this.patchColumn(this.instantiateColumn(type, this.nextId(), desc, this.typeFactory));
    }
    return null;
  }

  protected patchColumn(column: Column): Column {
    if (column instanceof ValueColumn && column.isLoaded()) {
      column.onDataUpdate(this._dataRows);
    }
    return column;
  }

  protected instantiateColumn(type: IColumnConstructor, id: string, desc: IColumnDesc, typeFactory: ITypeFactory) {
    return new type(id, desc, typeFactory);
  }

  /**
   * clones a column by dumping and restoring
   * @param col
   * @returns {Column}
   */
  clone(col: Column) {
    const dump = this.dumpColumn(col);
    return this.restoreColumn(dump);
  }

  /**
   * restores a column from a dump
   * @param dump
   * @returns {Column}
   */
  restoreColumn(dump: any): Column {
    const c = this.typeFactory(dump);
    c.assignNewId(this.nextId.bind(this));
    return c;
  }

  /**
   * finds a column in all rankings returning the first match
   * @param idOrFilter by id or by a filter function
   * @returns {Column}
   */
  find(idOrFilter: string | ((col: Column) => boolean)): Column | null {
    //convert to function
    const filter = typeof idOrFilter === 'string' ? (col: Column) => col.id === idOrFilter : idOrFilter;

    for (const ranking of this.rankings) {
      const r = ranking.find(filter);
      if (r) {
        return r;
      }
    }
    return null;
  }

  /**
   * dumps this whole provider including selection and the rankings
   * @returns {{uid: number, selection: number[], rankings: *[]}}
   */
  dump(): IDataProviderDump {
    return {
      $schema: SCHEMA_REF,
      uid: this.uid,
      selection: this.getSelection(),
      aggregations: map2Object(this.aggregations),
      rankings: this.rankings.map((r) => r.dump(this.toDescRef.bind(this))),
      showTopN: this.showTopN,
    };
  }

  /**
   * dumps a specific column
   */
  dumpColumn(col: Column): IColumnDump {
    return col.dump(this.toDescRef.bind(this));
  }

  restoreRanking(dump: IRankingDump) {
    const ranking = this.cloneRanking();
    ranking.restore(dump, this.typeFactory);
    const idGenerator = this.nextId.bind(this);
    ranking.children.forEach((c) => c.assignNewId(idGenerator));
    return ranking;
  }

  restore(dump: IDataProviderDump) {
    //clean old
    this.clearRankings();

    //restore selection
    this.uid = dump.uid || 0;
    if (dump.selection) {
      dump.selection.forEach((s: number) => this.selection.add(s));
    }
    if (dump.showTopN != null) {
      this.showTopN = dump.showTopN;
    }
    if (dump.aggregations) {
      this.aggregations.clear();
      if (Array.isArray(dump.aggregations)) {
        dump.aggregations.forEach((a: string) => this.aggregations.set(a, 0));
      } else {
        object2Map(dump.aggregations).forEach((v, k) => this.aggregations.set(k, v));
      }
    }

    //restore rankings
    if (dump.rankings) {
      dump.rankings.forEach((r: any) => {
        const ranking = this.cloneRanking();
        ranking.restore(r, this.typeFactory);
        //if no rank column add one
        if (!ranking.children.some((d) => d instanceof RankColumn)) {
          ranking.insert(this.create(createRankDesc())!, 0);
        }
        this.insertRanking(ranking);
      });
    }

    //assign new ids
    const idGenerator = this.nextId.bind(this);
    this.rankings.forEach((r) => {
      r.children.forEach((c) => c.assignNewId(idGenerator));
    });

    this.rankingIndex = 1 + Math.max(...this.getRankings().map((r) => +r.id.substring(4)));
  }

  /**
   * generates a default ranking by using all column descriptions ones
   */
  deriveDefault(addSupportType = true) {
    const r = this.pushRanking();
    if (addSupportType) {
      r.push(this.create(createAggregateDesc())!);
      r.push(this.create(createRankDesc())!);
      if (this.options.singleSelection !== true) {
        r.push(this.create(createSelectionDesc())!);
      }
    }
    this.getColumns().forEach((col) => {
      const c = this.create(col);
      if (!c || isSupportType(c)) {
        return;
      }
      r.push(c);
    });
    return r;
  }

  isAggregated(ranking: Ranking, group: IGroup) {
    return this.getTopNAggregated(ranking, group) >= 0;
  }

  getAggregationState(ranking: Ranking, group: IGroup) {
    const n = this.getTopNAggregated(ranking, group);
    return n < 0 ? EAggregationState.EXPAND : n === 0 ? EAggregationState.COLLAPSE : EAggregationState.EXPAND_TOP_N;
  }

  setAggregated(ranking: Ranking, group: IGroup | IGroup[], value: boolean) {
    return this.setAggregationState(ranking, group, value ? EAggregationState.COLLAPSE : EAggregationState.EXPAND);
  }

  setAggregationState(ranking: Ranking, group: IGroup | IGroup[], value: EAggregationState) {
    this.setTopNAggregated(
      ranking,
      group,
      value === EAggregationState.COLLAPSE ? 0 : value === EAggregationState.EXPAND_TOP_N ? this.showTopN : -1
    );
  }

  getTopNAggregated(ranking: Ranking, group: IGroup) {
    let g: IGroup | undefined | null = group;
    while (g) {
      const key = `${ranking.id}@${toGroupID(g)}`;
      if (this.aggregations.has(key)) {
        // propagate to leaf
        const v = this.aggregations.get(key)!;
        if (this.options.propagateAggregationState && group !== g) {
          this.aggregations.set(`${ranking.id}@${toGroupID(group)}`, v);
        }
        return v;
      }
      g = g.parent;
    }
    return -1;
  }

  private unaggregateParents(ranking: Ranking, group: IGroup) {
    let g: IGroup | undefined | null = group.parent;
    let changed = false;
    while (g) {
      changed = this.aggregations.delete(`${ranking.id}@${toGroupID(g)}`) || changed;
      g = g.parent;
    }
    return changed;
  }

  getAggregationStrategy() {
    return this.options.aggregationStrategy;
  }

  private initAggregateState(ranking: Ranking, groups: IGroup[]) {
    let initial = -1;
    switch (this.getAggregationStrategy()) {
      case 'group':
        initial = 0;
        break;
      case 'item':
      case 'group+item':
      case 'group+item+top':
        initial = -1;
        break;
      case 'group+top+item':
        initial = this.showTopN;
        break;
    }

    for (const group of groups) {
      const key = `${ranking.id}@${toGroupID(group)}`;
      if (!this.aggregations.has(key) && initial >= 0) {
        this.aggregations.set(key, initial);
      }
    }
  }

  setTopNAggregated(ranking: Ranking, group: IGroup | IGroup[], value: number | number[]) {
    const groups = Array.isArray(group) ? group : [group];
    const changed: IGroup[] = [];
    const previous: number[] = [];

    let changedParents = false;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const target = typeof value === 'number' ? value : value[i];
      changedParents = this.unaggregateParents(ranking, group) || changedParents;
      const current = this.getTopNAggregated(ranking, group);
      if (current === target) {
        continue;
      }
      changed.push(group);
      previous.push(current);
      const key = `${ranking.id}@${toGroupID(group)}`;
      if (target >= 0) {
        this.aggregations.set(key, target);
      } else {
        this.aggregations.delete(key);
      }
    }
    if (!changedParents && changed.length === 0) {
      // no change
      return;
    }
    if (!Array.isArray(group)) {
      // single change
      this.fire(
        [ADataProvider.EVENT_GROUP_AGGREGATION_CHANGED, ADataProvider.EVENT_DIRTY_VALUES, ADataProvider.EVENT_DIRTY],
        ranking,
        group,
        previous.length === 0 ? value : previous[0],
        value
      );
    } else {
      this.fire(
        [ADataProvider.EVENT_GROUP_AGGREGATION_CHANGED, ADataProvider.EVENT_DIRTY_VALUES, ADataProvider.EVENT_DIRTY],
        ranking,
        group,
        previous,
        value
      );
    }
  }

  aggregateAllOf(ranking: Ranking, aggregateAll: boolean | number | EAggregationState, groups = ranking.getGroups()) {
    const value = convertAggregationState(aggregateAll, this.showTopN);
    this.setTopNAggregated(ranking, groups, value);
  }

  getShowTopN() {
    return this.showTopN;
  }

  setShowTopN(value: number) {
    if (this.showTopN === value) {
      return;
    }
    // update entries
    for (const [k, v] of Array.from(this.aggregations.entries())) {
      if (v === this.showTopN) {
        this.aggregations.set(k, value);
      }
    }
    this.fire(
      [ADataProvider.EVENT_SHOWTOPN_CHANGED, ADataProvider.EVENT_DIRTY_VALUES, ADataProvider.EVENT_DIRTY],
      this.showTopN,
      (this.showTopN = value)
    );
  }

  /**
   * is the given row selected
   * @param index
   * @return {boolean}
   */
  isSelected(index: number) {
    return this.selection.has(index);
  }

  /**
   * also select the given row
   * @param index
   */
  select(index: number) {
    if (this.selection.has(index)) {
      return; //no change
    }
    if (this.options.singleSelection === true && this.selection.size > 0) {
      this.selection.clear();
    }
    this.selection.add(index);
    this.fire(ADataProvider.EVENT_SELECTION_CHANGED, this.getSelection());
  }

  jumpToNearest(indices: number[]) {
    if (indices.length === 0) {
      return;
    }
    this.fire(ADataProvider.EVENT_JUMP_TO_NEAREST, indices);
  }

  /**
   * also select all the given rows
   * @param indices
   */
  selectAll(indices: IndicesArray) {
    if (everyIndices(indices, (i) => this.selection.has(i))) {
      return; //no change
    }
    if (this.options.singleSelection === true) {
      this.selection.clear();
      if (indices.length > 0) {
        this.selection.add(indices[0]);
      }
    } else {
      forEachIndices(indices, (index) => {
        this.selection.add(index);
      });
    }
    this.fire(ADataProvider.EVENT_SELECTION_CHANGED, this.getSelection());
  }

  selectAllOf(ranking: Ranking) {
    this.setSelection(Array.from(ranking.getOrder()));
  }

  /**
   * set the selection to the given rows
   * @param indices
   */
  setSelection(indices: number[]) {
    if (indices.length === 0) {
      return this.clearSelection();
    }
    if (this.selection.size === indices.length && indices.every((i) => this.selection.has(i))) {
      return; //no change
    }
    this.selection.clear();
    this.selectAll(indices);
  }

  /**
   * toggles the selection of the given data index
   * @param index
   * @param additional just this element or all
   * @returns {boolean} whether the index is currently selected
   */
  toggleSelection(index: number, additional = false) {
    if (this.isSelected(index)) {
      if (additional) {
        this.deselect(index);
      } else {
        this.clearSelection();
      }
      return false;
    }
    if (additional) {
      this.select(index);
    } else {
      this.setSelection([index]);
    }
    return true;
  }

  /**
   * deselect the given row
   * @param index
   */
  deselect(index: number) {
    if (!this.selection.has(index)) {
      return; //no change
    }
    this.selection.delete(index);
    this.fire(ADataProvider.EVENT_SELECTION_CHANGED, this.getSelection());
  }

  /**
   * also select all the given rows
   * @param indices
   */
  deselectAll(indices: IndicesArray) {
    if (everyIndices(indices, (i) => !this.selection.has(i))) {
      return; //no change
    }
    forEachIndices(indices, (index) => {
      this.selection.delete(index);
    });
    this.fire(ADataProvider.EVENT_SELECTION_CHANGED, this.getSelection());
  }

  /**
   * returns a promise containing the selected rows
   * @return {Promise<any[]>}
   */
  selectedRows(): Promise<any[]> | any[] {
    if (this.selection.size === 0) {
      return [];
    }
    return this.view(this.getSelection());
  }

  /**
   * returns the currently selected indices
   * @returns {Array}
   */
  getSelection() {
    return Array.from(this.selection);
  }

  /**
   * clears the selection
   */
  clearSelection() {
    if (this.selection.size === 0) {
      return; //no change
    }
    this.selection.clear();
    this.fire(ADataProvider.EVENT_SELECTION_CHANGED, [], false);
  }

  /**
   * utility to export a ranking to a table with the given separator
   * @param ranking
   * @param options
   * @returns {Promise<string>}
   */
  exportTable(ranking: Ranking, options: Partial<IExportOptions> = {}): Promise<string> | string {
    const data = this.view(ranking.getOrder());
    if (isPromiseLike(data)) {
      return data.then((dataImpl) => exportRanking(ranking, dataImpl, options));
    }
    return exportRanking(ranking, data, options);
  }
  /**
   * utility to export the selection within the given ranking to a table with the given separator
   * @param ranking
   * @param options
   * @returns {Promise<string>}
   */
  exportSelection(options: Partial<IExportOptions> & { ranking?: Ranking } = {}): Promise<string> | string {
    const selection = this.getSelection();
    const ranking = options.ranking || this.getFirstRanking();
    if (!ranking) {
      return '';
    }
    const rows = selection.map((s) => this.getRow(s));
    if (rows.some((row) => isPromiseLike(row))) {
      return Promise.all(rows).then((data) => {
        return exportTable(ranking, data, options);
      });
    }
    return exportTable(ranking, rows as IDataRow[], options);
  }

  /**
   * adds another column description to this data provider
   * @param column
   */
  pushDesc(column: IColumnDesc) {
    injectAccessor(column);
    this.columns.push(column);
    this.fire(ADataProvider.EVENT_ADD_DESC, column);
  }

  clearColumns() {
    this.clearRankings();
    this.columns.splice(0, this.columns.length);
    this.fire(ADataProvider.EVENT_CLEAR_DESC);
  }

  /**
   * Remove the given column description from the data provider.
   * Column descriptions that are in use (i.e., has column instances in a ranking) cannot be removed by default.
   * Skip the check by setting the `ignoreBeingUsed` parameter to `true`.
   *
   * @param column Column description
   * @param ignoreBeingUsed Flag whether to ignore the usage of the column descriptions in rankings
   */
  removeDesc(column: IColumnDesc, ignoreBeingUsed = false): boolean {
    const i = this.columns.indexOf(column);
    if (i < 0) {
      return false;
    }
    const isUsed = ignoreBeingUsed
      ? false
      : this.getRankings().some((d) => d.flatColumns.some((c) => c.desc === column));
    if (isUsed) {
      return false;
    }
    this.columns.splice(i, 1);
    this.fire(ADataProvider.EVENT_REMOVE_DESC, column);
    return true;
  }

  getColumns(): IColumnDesc[] {
    return this.columns.slice();
  }

  findDesc(ref: string) {
    return this.columns.filter((c) => (c as any).column === ref)[0];
  }

  /**
   * identify by the tuple type@columnname
   * @param desc
   * @returns {string}
   */
  toDescRef(desc: any): any {
    return typeof desc.column !== 'undefined' ? `${desc.type}@${desc.column}` : this.cleanDesc(Object.assign({}, desc));
  }

  fromDescRef(descRef: any): any {
    if (typeof descRef === 'string') {
      return this.columns.find((d: any) => `${d.type}@${d.column}` === descRef || d.type === descRef);
    }
    const existing = this.columns.find(
      (d) => descRef.column === (d as any).column && descRef.label === d.label && descRef.type === d.type
    );
    if (existing) {
      return existing;
    }
    return descRef;
  }

  nextRankingId() {
    return `rank${this.rankingIndex++}`;
  }

  /**
   * set a globally applied filter to all data without changing the data source itself
   * @param {((row: IDataRow) => boolean) | null} filter
   */
  setFilter(filter: ((row: IDataRow) => boolean) | null) {
    this.filter = filter;
    this.reorderAll.call({ type: Ranking.EVENT_FILTER_CHANGED });
  }

  getFilter() {
    return this.filter;
  }

  getTotalNumberOfRows() {
    return this.data.length;
  }

  getTaskExecutor() {
    return this.tasks;
  }

  get data() {
    return this._data;
  }

  destroy() {
    this.tasks.terminate();
  }

  /**
   * replaces the dataset rows with a new one
   * @param data
   */
  setData(data: any[]) {
    this._data = data;
    this._dataRows = toRows(data);
    this.dataChanged();
  }

  private dataChanged() {
    this.tasks.setData(this._dataRows);

    for (const ranking of this.getRankings()) {
      for (const col of ranking.flatColumns) {
        if (col instanceof ValueColumn && col.isLoaded()) {
          col.onDataUpdate(this._dataRows);
        }
      }
    }

    this.fire(ADataProvider.EVENT_DATA_CHANGED, this._dataRows);
    this.reorderAll.call({ type: 'data' });
  }

  clearData() {
    this.setData([]);
  }

  /**
   * append rows to the dataset
   * @param data
   */
  appendData(data: any[]) {
    for (const d of data) {
      this._data.push(d);
      this._dataRows.push({ v: d, i: this._dataRows.length });
    }
    this.dataChanged();
  }

  cloneRanking(existing?: Ranking) {
    const id = this.nextRankingId();
    const ranking = new Ranking(id);

    if (existing) {
      //copy the ranking of the other one
      //TODO better cloning
      existing.children.forEach((child) => {
        this.push(ranking, child.desc);
      });
    }

    if (this.options.filterGlobally) {
      ranking.on(`${Ranking.EVENT_FILTER_CHANGED}.reorderAll`, this.reorderAll);
    }

    this.trackRanking(ranking, existing);
    return ranking;
  }

  private trackRanking(ranking: Ranking, existing?: Ranking) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    ranking.on(`${Column.EVENT_DIRTY_CACHES}.cache`, function (this: IEventContext) {
      let col: any = this.origin;
      while (col instanceof Column) {
        // console.log(col.label, 'dirty data');
        that.tasks.dirtyColumn(col, 'data');
        col = col.parent;
      }
    });

    const cols = ranking.flatColumns;
    const addKey = `${Ranking.EVENT_ADD_COLUMN}.cache`;
    const removeKey = `${Ranking.EVENT_REMOVE_COLUMN}.cache`;
    const loadedKey = `${ValueColumn.EVENT_DATA_LOADED}.cache`;

    const removeCol = (col: Column) => {
      this.tasks.dirtyColumn(col, 'data');
      if (col instanceof CompositeColumn) {
        col.on(addKey, null);
        col.on(removeKey, null);
      }
      if (col instanceof ValueColumn) {
        col.on(loadedKey, null);
      }
    };

    const addCol = (col: Column) => {
      if (col instanceof CompositeColumn) {
        col.on(addKey, addCol);
        col.on(removeKey, removeCol);
      }
      if (col instanceof ValueColumn) {
        col.on(loadedKey, dataLoaded);
      }
    };

    function dataLoaded(this: IEventContext, _, loaded: boolean) {
      if (!loaded) {
        return;
      }
      if (this.origin instanceof ValueColumn) {
        this.origin.onDataUpdate(that._dataRows);
      }
    }

    ranking.on(addKey, addCol);
    ranking.on(removeKey, removeCol);
    for (const col of cols) {
      if (col instanceof CompositeColumn) {
        col.on(addKey, addCol);
        col.on(removeKey, removeCol);
      }
      if (col instanceof ValueColumn) {
        col.on(loadedKey, dataLoaded);
      }
    }

    if (existing) {
      const copy = existing.flatColumns;
      for (let i = 0; i < cols.length; ++i) {
        this.tasks.copyCache(cols[i], copy[i]);
      }
    }
  }

  cleanUpRanking(ranking: Ranking) {
    if (this.options.filterGlobally) {
      ranking.on(`${Ranking.EVENT_FILTER_CHANGED}.reorderAll`, null);
    }

    const cols = ranking.flatColumns;
    const addKey = `${Ranking.EVENT_ADD_COLUMN}.cache`;
    const removeKey = `${Ranking.EVENT_REMOVE_COLUMN}.cache`;
    ranking.on(addKey, null);
    ranking.on(removeKey, null);
    for (const col of cols) {
      if (col instanceof CompositeColumn) {
        col.on(addKey, null);
        col.on(removeKey, null);
      }
    }

    this.tasks.dirtyRanking(ranking, 'data');
  }

  private resolveFilter(ranking: Ranking) {
    //do the optional filtering step
    const filter: (Column | ((d: IDataRow) => boolean))[] = [];

    if (this.options.filterGlobally) {
      for (const r of this.getRankings()) {
        if (r.isFiltered()) {
          filter.push(...r.flatColumns.filter((d) => d.isFiltered()));
        }
      }
    } else if (ranking.isFiltered()) {
      filter.push(...ranking.flatColumns.filter((d) => d.isFiltered()));
    }

    if (this.filter) {
      filter.push(this.filter);
    }
    return filter;
  }

  private noSorting() {
    // initial no sorting required just index mapping
    const l = this._data.length;
    const order = createIndexArray(l, l - 1);
    const index2pos = order.slice();
    for (let i = 0; i < l; ++i) {
      order[i] = i;
      index2pos[i] = i + 1; // shift since default is 0
    }

    return { groups: [Object.assign({ order }, defaultGroup)], index2pos };
  }

  private createSorter(
    ranking: Ranking,
    filter: (Column | ((d: IDataRow) => boolean))[],
    needsFiltering: boolean,
    needsGrouping: boolean,
    needsSorting: boolean
  ) {
    const groups = new Map<string, ISortHelper>();
    const groupOrder: ISortHelper[] = [];
    let maxDataIndex = -1;

    const groupCriteria = ranking.getGroupCriteria();
    const lookups = needsSorting
      ? new CompareLookup(this._data.length, true, ranking, this.tasks.valueCache.bind(this.tasks))
      : undefined;

    const pushGroup = (group: IGroup, r: IDataRow) => {
      const groupKey = group.name.toLowerCase();
      if (groups.has(groupKey)) {
        (groups.get(groupKey)!.rows as number[]).push(r.i);
        return;
      }
      const s = { group, rows: [r.i] };
      groups.set(groupKey, s);
      groupOrder.push(s);
    };

    const groupCaches = groupCriteria.map((c) => this.tasks.valueCache(c));
    const filterCaches = filter.map((c) => (typeof c === 'function' ? undefined : this.tasks.valueCache(c)));

    const toGroup =
      groupCriteria.length === 1
        ? (r: IDataRow) => joinGroups([groupCriteria[0].group(r, groupCaches[0] ? groupCaches[0]!(r.i) : undefined)])
        : (r: IDataRow) =>
            joinGroups(groupCriteria.map((c, i) => c.group(r, groupCaches[i] ? groupCaches[i]!(r.i) : undefined)));

    if (needsFiltering) {
      // filter, group, sort
      outer: for (const r of this._dataRows) {
        for (let f = 0; f < filter.length; ++f) {
          const fc = filter[f];
          const c = filterCaches[f];
          if ((typeof fc === 'function' && !fc(r)) || (fc instanceof Column && !fc.filter(r, c ? c(r.i) : undefined))) {
            continue outer;
          }
        }
        if (maxDataIndex < r.i) {
          maxDataIndex = r.i;
        }
        if (lookups) {
          lookups.push(r);
        }
        pushGroup(toGroup(r), r);
      }

      // some default sorting
      groupOrder.sort((a, b) => a.group.name.toLowerCase().localeCompare(b.group.name.toLowerCase()));
      return { maxDataIndex, lookups, groupOrder };
    }

    // reuse the existing groups

    for (const before of ranking.getGroups()) {
      const order = before.order;
      if (!needsGrouping) {
        const clone = duplicateGroup(before);
        // reuse in full
        groupOrder.push({ group: clone, rows: order });

        if (!lookups) {
          maxDataIndex = (order as readonly number[]).reduce((a, b) => Math.max(a, b), maxDataIndex);
          continue;
        }
        // sort
        for (let o = 0; o < order.length; ++o) {
          const i = order[o];
          if (maxDataIndex < i) {
            maxDataIndex = i;
          }
          lookups.push(this._dataRows[i]);
        }
        continue;
      }

      // group, [sort]
      for (let o = 0; o < order.length; ++o) {
        const i = order[o];
        if (maxDataIndex < i) {
          maxDataIndex = i;
        }
        const r = this._dataRows[i];
        if (lookups) {
          lookups.push(r);
        }
        pushGroup(toGroup(r), r);
      }
    }

    if (needsGrouping) {
      // some default sorting
      groupOrder.sort((a, b) => a.group.name.toLowerCase().localeCompare(b.group.name.toLowerCase()));
    }
    return { maxDataIndex, lookups, groupOrder };
  }

  private sortGroup(
    g: ISortHelper,
    i: number,
    ranking: Ranking,
    lookups: CompareLookup | undefined,
    groupLookup: CompareLookup | undefined,
    maxDataIndex: number
  ): Promise<IOrderedGroup> {
    const group = g.group;

    const sortTask = this.tasks.sort(g.rows, maxDataIndex, lookups);

    // compute sort group value as task
    const groupSortTask = groupLookup ? this.tasks.groupCompare(ranking, group, g.rows) : ([] as ICompareValue[]);

    // trigger task for groups to compute for this group

    return Promise.all([sortTask, groupSortTask]).then(([order, groupC]) => {
      if (groupLookup && Array.isArray(groupC)) {
        groupLookup.pushValues(i, groupC);
      }
      return Object.assign(group, { order });
    });
  }

  private sortGroups(groups: IOrderedGroup[], groupLookup: CompareLookup | undefined, enforceSorting: boolean) {
    // sort groups
    if (groupLookup) {
      const groupIndices = groups.map((_, i) => i);
      sortComplex(groupIndices, groupLookup.sortOrders);
      return groupIndices.map((i) => groups[i]);
    }
    if (enforceSorting) {
      // create a default sorting
      return groups.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }

  private index2pos(groups: IOrderedGroup[], maxDataIndex: number) {
    const total = groups.reduce((a, b) => a + b.order.length, 1);
    const index2pos = createIndexArray(maxDataIndex + 1, total);
    let offset = 1;
    for (const g of groups) {
      // tslint:disable-next-line
      for (let i = 0; i < g.order.length; i++, offset++) {
        index2pos[g.order[i]] = offset;
      }
    }

    return { groups, index2pos };
  }

  sort(
    ranking: Ranking,
    dirtyReason: EDirtyReason[]
  ):
    | Promise<{ groups: IOrderedGroup[]; index2pos: IndicesArray }>
    | { groups: IOrderedGroup[]; index2pos: IndicesArray } {
    const reasons = new Set(dirtyReason);

    if (this._data.length === 0) {
      return { groups: [], index2pos: [] };
    }

    // console.log(dirtyReason);

    const filter = this.resolveFilter(ranking);

    const needsFiltering = reasons.has(EDirtyReason.UNKNOWN) || reasons.has(EDirtyReason.FILTER_CHANGED);
    const needsGrouping =
      needsFiltering ||
      reasons.has(EDirtyReason.GROUP_CRITERIA_CHANGED) ||
      reasons.has(EDirtyReason.GROUP_CRITERIA_DIRTY);
    const needsSorting =
      needsGrouping || reasons.has(EDirtyReason.SORT_CRITERIA_CHANGED) || reasons.has(EDirtyReason.SORT_CRITERIA_DIRTY);
    const needsGroupSorting =
      needsGrouping ||
      reasons.has(EDirtyReason.GROUP_SORT_CRITERIA_CHANGED) ||
      reasons.has(EDirtyReason.GROUP_SORT_CRITERIA_DIRTY);

    if (needsFiltering) {
      this.tasks.dirtyRanking(ranking, 'summary');
    } else if (needsGrouping) {
      this.tasks.dirtyRanking(ranking, 'group');
    }
    // otherwise the summary and group summaries should still be valid

    const isGroupedBy = ranking.getGroupCriteria().length > 0;
    const isSortedBy = ranking.getSortCriteria().length > 0;
    const isGroupedSortedBy = ranking.getGroupSortCriteria().length > 0;

    if (!isGroupedBy && !isSortedBy && filter.length === 0) {
      return this.noSorting();
    }

    const { maxDataIndex, lookups, groupOrder } = this.createSorter(
      ranking,
      filter,
      needsFiltering,
      needsGrouping,
      needsSorting
    );

    if (groupOrder.length === 0) {
      return { groups: [], index2pos: [] };
    }

    if (groupOrder.length === 1) {
      const g = groupOrder[0]!;

      // not required if: group sort criteria changed -> lookups will be none
      return this.sortGroup(g, 0, ranking, lookups, undefined, maxDataIndex).then((group) => {
        return this.index2pos([group], maxDataIndex);
      });
    }

    const groupLookup =
      isGroupedSortedBy && needsGroupSorting ? new CompareLookup(groupOrder.length, false, ranking) : undefined;

    return Promise.all(
      groupOrder.map((g, i) => {
        // not required if: group sort criteria changed -> lookups will be none
        return this.sortGroup(g, i, ranking, lookups, groupLookup, maxDataIndex);
      })
    ).then((groups) => {
      // not required if: sort criteria changed -> groupLookup will be none
      const sortedGroups = this.sortGroups(groups, groupLookup, needsGroupSorting);
      return this.index2pos(sortedGroups, maxDataIndex);
    });
  }

  viewRaw(indices: IndicesArray) {
    return mapIndices(indices, (i) => this._data[i] || {});
  }
  private readonly mapToDataRow = (i: number) => {
    if (i < 0 || i >= this._dataRows.length) {
      return { i, v: {} };
    }
    return this._dataRows[i];
  };

  viewRawRows(indices: IndicesArray) {
    return mapIndices(indices, this.mapToDataRow);
  }

  getRow(index: number) {
    return this._dataRows[index];
  }

  seq(indices: IndicesArray) {
    return lazySeq(indices).map(this.mapToDataRow);
  }

  view(indices: IndicesArray) {
    return this.viewRaw(indices);
  }

  mappingSample(col: INumberColumn): ISequence<number> {
    const MAX_SAMPLE = 120; //at most 120 sample lines
    const l = this._dataRows.length;
    if (l <= MAX_SAMPLE) {
      return lazySeq(this._dataRows).map((v) => col.getRawNumber(v));
    }
    //randomly select 500 elements
    const indices = new Set<number>();

    for (let i = 0; i < MAX_SAMPLE; ++i) {
      let j = Math.floor(Math.random() * (l - 1));
      while (indices.has(j)) {
        j = Math.floor(Math.random() * (l - 1));
      }
      indices.add(j);
    }
    return lazySeq(Array.from(indices)).map((i) => col.getRawNumber(this._dataRows[i]));
  }

  searchAndJump(search: string | RegExp, col: Column) {
    //case insensitive search
    search = typeof search === 'string' ? search.toLowerCase() : search;
    const f =
      typeof search === 'string'
        ? (v: string) => v.toLowerCase().indexOf(search as string) >= 0
        : (search as RegExp).test.bind(search);
    const indices: number[] = [];
    for (let i = 0; i < this._dataRows.length; ++i) {
      if (f(col.getLabel(this._dataRows[i]))) {
        indices.push(i);
      }
    }
    this.jumpToNearest(indices);
  }
}

function toRows(data: any[]) {
  return data.map((v, i) => ({ v, i }));
}
