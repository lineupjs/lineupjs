/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {
  isSupportType,
  IColumnDesc,
  models,
  createActionDesc,
  isNumberColumn,
  createStackDesc,
  createRankDesc,
  createSelectionDesc
} from '../model';
import Column from '../model/Column';
import Ranking from '../model/Ranking';
import {IStatistics, ICategoricalStatistics} from '../model/Column';
import RankColumn from '../model/RankColumn';
import StackColumn from '../model/StackColumn';
import {ICategoricalColumn} from '../model/CategoricalColumn';
import {INumberColumn} from '../model/NumberColumn';
import {merge, AEventDispatcher, delayedCall} from '../utils';
import {IValueColumnDesc} from '../model/ValueColumn';
import {ISelectionColumnDesc} from '../model/SelectionColumn';

/**
 * a data row for rendering
 */
export interface IDataRow {
  /**
   * the value
   */
  v: any;
  /**
   * the underlying data index
   */
  dataIndex: number;
}

export interface IExportOptions {
  /**
   * export separator, default: '\t'
   */
  separator?: string;
  /**
   * new line character, default: '\n'
   */
  newline?: string;
  /**
   * should a header be generated, default: true
   */
  header?: boolean;
  /**
   * quote strings, default: false
   */
  quote?: boolean;
  /**
   * quote string to use, default: '"'
   */
  quoteChar?: string;
  /**
   * filter specific column types, default: exclude all support types (selection, action, rank)
   * @param col the column description to filter
   */
  filter?: (col: IColumnDesc) => boolean; //!isSupportType
}

export interface IStatsBuilder {
  stats(col: INumberColumn): Promise<IStatistics>;
  hist(col: ICategoricalColumn): Promise<ICategoricalStatistics>;
}

export interface IDataProviderOptions {
  columnTypes?: {[columnType: string]: typeof Column};

  /**
   * allow multiple selected rows
   * default: true
   */
  multiSelection?: boolean;
}


/**
 * a basic data provider holding the data and rankings
 */
abstract class ADataProvider extends AEventDispatcher {
  static readonly EVENT_SELECTION_CHANGED = 'selectionChanged';
  static readonly EVENT_ADD_COLUMN = Ranking.EVENT_ADD_COLUMN;
  static readonly EVENT_REMOVE_COLUMN = Ranking.EVENT_REMOVE_COLUMN;
  static readonly EVENT_ADD_RANKING = 'addRanking';
  static readonly EVENT_REMOVE_RANKING = 'removeRanking';
  static readonly EVENT_DIRTY = Ranking.EVENT_DIRTY;
  static readonly EVENT_DIRTY_HEADER = Ranking.EVENT_DIRTY_HEADER;
  static readonly EVENT_DIRTY_VALUES = Ranking.EVENT_DIRTY_VALUES;
  static readonly EVENT_ORDER_CHANGED = Ranking.EVENT_ORDER_CHANGED;
  static readonly EVENT_ADD_DESC = 'addDesc';
  static readonly EVENT_JUMP_TO_NEAREST = 'jumpToNearest';

  /**
   * all rankings
   * @type {Array}
   * @private
   */
  private rankings: Ranking[] = [];
  /**
   * the current selected indices
   * @type {Set}
   */
  private selection = new Set<number>();

  private uid = 0;

  /**
   * lookup map of a column type to its column implementation
   */
  readonly columnTypes: {[columnType: string]: typeof Column};

  private readonly multiSelections;

  constructor(options: IDataProviderOptions = {}) {
    super();
    this.columnTypes = merge(models(), options.columnTypes || {});
    this.multiSelections = options.multiSelection !== false;
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
    return super.createEventList().concat([
      ADataProvider.EVENT_ADD_COLUMN, ADataProvider.EVENT_REMOVE_COLUMN,
      ADataProvider.EVENT_ADD_RANKING, ADataProvider.EVENT_REMOVE_RANKING,
      ADataProvider.EVENT_DIRTY, ADataProvider.EVENT_DIRTY_HEADER, ADataProvider.EVENT_DIRTY_VALUES,
      ADataProvider.EVENT_ORDER_CHANGED, ADataProvider.EVENT_SELECTION_CHANGED, ADataProvider.EVENT_ADD_DESC,
      ADataProvider.EVENT_JUMP_TO_NEAREST]);
  }

  /**
   * returns a list of all known column descriptions
   * @returns {Array}
   */
  abstract getColumns(): IColumnDesc[];

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

  takeSnapshot(col: Column): Ranking {
    const r = this.cloneRanking();
    r.push(this.clone(col));
    this.insertRanking(r);
    return r;
  }

  insertRanking(r: Ranking, index = this.rankings.length) {
    this.rankings.splice(index, 0, r);
    this.forward(r, Ranking.EVENT_ADD_COLUMN + '.provider', Ranking.EVENT_REMOVE_COLUMN + '.provider',
      Ranking.EVENT_DIRTY + '.provider', Ranking.EVENT_DIRTY_HEADER + '.provider',
      Ranking.EVENT_ORDER_CHANGED + '.provider', Ranking.EVENT_DIRTY_VALUES + '.provider');
    const that = this;
    //delayed reordering per ranking
    r.on(Ranking.EVENT_DIRTY_ORDER + '.provider', delayedCall(function () {
      that.triggerReorder(this.source);
    }, 100, null));
    this.fire([ADataProvider.EVENT_ADD_RANKING, ADataProvider.EVENT_DIRTY_HEADER, ADataProvider.EVENT_DIRTY_VALUES, ADataProvider.EVENT_DIRTY], r, index);
    this.triggerReorder(r);
  }

  protected triggerReorder(ranking: Ranking) {
    this.sort(ranking).then((order) => ranking.setOrder(order));
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
    this.unforward(ranking, Ranking.EVENT_ADD_COLUMN + '.provider', Ranking.EVENT_REMOVE_COLUMN + '.provider',
      Ranking.EVENT_DIRTY + '.provider', Ranking.EVENT_DIRTY_HEADER + '.provider',
      Ranking.EVENT_ORDER_CHANGED + '.provider', Ranking.EVENT_DIRTY_VALUES + '.provider');
    this.rankings.splice(i, 1);
    ranking.on(Ranking.EVENT_DIRTY_ORDER + '.provider', null);
    this.cleanUpRanking(ranking);
    this.fire([ADataProvider.EVENT_REMOVE_RANKING, ADataProvider.EVENT_DIRTY_HEADER, ADataProvider.EVENT_DIRTY_VALUES, ADataProvider.EVENT_DIRTY], ranking, i);
    return true;
  }

  /**
   * removes all rankings
   */
  clearRankings() {
    this.rankings.forEach((ranking) => {
      this.unforward(ranking, Ranking.EVENT_ADD_COLUMN + '.provider', Ranking.EVENT_REMOVE_COLUMN + '.provider',
        Ranking.EVENT_DIRTY + '.provider', Ranking.EVENT_DIRTY_HEADER + '.provider',
        Ranking.EVENT_ORDER_CHANGED + '.provider', Ranking.EVENT_DIRTY_VALUES + '.provider');
      ranking.on(Ranking.EVENT_DIRTY_ORDER + '.provider', null);
      this.cleanUpRanking(ranking);
    });
    this.rankings = [];
    this.fire([ADataProvider.EVENT_REMOVE_RANKING, ADataProvider.EVENT_DIRTY_HEADER, ADataProvider.EVENT_DIRTY_VALUES, ADataProvider.EVENT_DIRTY], null);
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
  getLastRanking() {
    return this.rankings[this.rankings.length - 1];
  }

  /**
   * hook method for cleaning up a ranking
   * @param ranking
   */
  cleanUpRanking(ranking: Ranking) {
    //nothing to do
  }

  /**
   * abstract method for cloning a ranking
   * @param existing
   * @returns {null}
   */
  abstract cloneRanking(existing?: Ranking): Ranking;

  /**
   * adds a column to a ranking described by its column description
   * @param ranking the ranking to add the column to
   * @param desc the description of the column
   * @return {Column} the newly created column or null
   */
  push(ranking: Ranking, desc: IColumnDesc): Column {
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
    return 'col' + (this.uid++);
  }

  protected abstract rankAccessor(row: any, index: number, id: string, desc: IColumnDesc, ranking: Ranking);

  private fixDesc(desc: IColumnDesc) {
    //hacks for provider dependent descriptors
    if (desc.type === 'rank') {
      (<IValueColumnDesc<number>>desc).accessor = this.rankAccessor.bind(this);
    } else if (desc.type === 'selection') {
      (<ISelectionColumnDesc>desc).accessor = (row: any, index: number) => this.isSelected(index);
      (<ISelectionColumnDesc>desc).setter = (row: any, index: number, value: boolean) => value ? this.select(index) : this.deselect(index);
    }
  }

  /**
   * creates an internal column model out of the given column description
   * @param desc
   * @returns {Column] the new column or null if it can't be created
   */
  create(desc: IColumnDesc): Column {
    this.fixDesc(desc);
    //find by type and instantiate
    const type = this.columnTypes[desc.type];
    if (type) {
      return new type(this.nextId(), desc);
    }
    return null;
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
    const create = (d: any) => {
      const desc = this.fromDescRef(d.desc);
      const type = this.columnTypes[desc.type];
      this.fixDesc(desc);
      const c = new type('', desc);
      c.restore(d, create);
      c.assignNewId(this.nextId.bind(this));
      return c;
    };
    return create(dump);
  }

  /**
   * finds a column in all rankings returning the first match
   * @param idOrFilter by id or by a filter function
   * @returns {Column}
   */
  find(idOrFilter: string | ((col: Column) => boolean)): Column {
    //convert to function
    const filter = typeof(idOrFilter) === 'string' ? (col) => col.id === idOrFilter : idOrFilter;

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
  dump(): any {
    return {
      uid: this.uid,
      selection: this.getSelection(),
      rankings: this.rankings.map((r) => r.dump(this.toDescRef))
    };
  }

  /**
   * dumps a specific column
   */
  dumpColumn(col: Column) {
    return col.dump(this.toDescRef);
  }

  /**
   * for better dumping describe reference, by default just return the description
   */
  toDescRef(desc: any): any {
    return desc;
  }

  /**
   * inverse operation of toDescRef
   */
  fromDescRef(descRef: any): any {
    return descRef;
  }

  private createHelper = (d: any) => {
    //factory method for restoring a column
    const desc = this.fromDescRef(d.desc);
    let c = null;
    if (desc && desc.type) {
      this.fixDesc(d.desc);
      const type = this.columnTypes[desc.type];
      c = new type(d.id, desc);
      c.restore(d, this.createHelper);
    }
    return c;
  }

  restoreRanking(dump: any) {
    const ranking = this.cloneRanking();
    ranking.restore(dump, this.createHelper);
    //if no rank column add one
    if (!ranking.children.some((d) => d instanceof RankColumn)) {
      ranking.insert(this.create(createRankDesc()), 0);
    }
    const idGenerator = this.nextId.bind(this);
    ranking.children.forEach((c) => c.assignNewId(idGenerator));

    return ranking;
  }

  restore(dump: any) {


    //clean old
    this.clearRankings();

    //restore selection
    this.uid = dump.uid || 0;
    if (dump.selection) {
      dump.selection.forEach((s) => this.selection.add(s));
    }


    //restore rankings
    if (dump.rankings) {
      dump.rankings.forEach((r) => {
        const ranking = this.cloneRanking();
        ranking.restore(r, this.createHelper);
        //if no rank column add one
        if (!ranking.children.some((d) => d instanceof RankColumn)) {
          ranking.insert(this.create(createRankDesc()), 0);
        }
        this.insertRanking(ranking);
      });
    }
    if (dump.layout) { //we have the old format try to create it
      Object.keys(dump.layout).forEach((key) => {
        this.deriveRanking(dump.layout[key]);
      });
    }
    //assign new ids
    const idGenerator = this.nextId.bind(this);
    this.rankings.forEach((r) => {
      r.children.forEach((c) => c.assignNewId(idGenerator));
    });
  }

  abstract findDesc(ref: string);

  /**
   * generates a default ranking by using all column descriptions ones
   */
  deriveDefault() {
    if (this.rankings.length > 0) {
      //no default if we have a ranking
      return;
    }
    const r = this.pushRanking();
    this.getColumns().forEach((col) => {
      if (!isSupportType(col)) {
        this.push(r, col);
      }
    });
  }

  /**
   * derives a ranking from an old layout bundle format
   * @param bundle
   */
  private deriveRanking(bundle: any[]) {
    const ranking = this.cloneRanking();
    ranking.clear();
    const toCol = (column) => {
      switch (column.type) {
        case 'rank':
          return this.create(createRankDesc());
        case 'selection':
          return this.create(createSelectionDesc());
        case 'actions':
          const actions = this.create(createActionDesc(column.label || 'actions'));
          actions.restore(column, null);
          return actions;
        case 'stacked':
          //create a stacked one
          const stacked = <StackColumn>this.create(createStackDesc(column.label || 'Combined'));
          (column.children || []).forEach((col) => {
            const c = toCol(col);
            if (c) {
              stacked.push(c);
            }
          });
          return stacked;
        default: {
          const desc = this.findDesc(column.column);
          if (desc) {
            const r = this.create(desc);
            column.label = column.label || desc.label || desc.column;
            r.restore(column, null);
            return r;
          }
          return null;
        }
      }
    };
    bundle.forEach((column) => {
      const col = toCol(column);
      if (col) {
        ranking.push(col);
      }
    });
    //if no rank column add one
    if (!ranking.children.some((d) => d instanceof RankColumn)) {
      ranking.insert(this.create(createRankDesc()), 0);
    }
    this.insertRanking(ranking);
    return ranking;
  }

  /**
   * sorts the given ranking and eventually return a ordering of the data items
   * @param ranking
   * @return {Promise<any>}
   */
  abstract sort(ranking: Ranking): Promise<number[]>;

  /**
   * returns a view in the order of the given indices
   * @param indices
   * @return {Promise<any>}
   */
  abstract view(indices: number[]): Promise<any[]>;

  abstract fetch(orders: number[][]): Promise<IDataRow>[][];

  /**
   * returns a data sample used for the mapping editor
   * @param col
   * @return {Promise<any>}
   */
  abstract mappingSample(col: Column): Promise<number[]>;

  /**
   * helper for computing statistics
   * @param indices
   * @returns {{stats: (function(INumberColumn): *), hist: (function(ICategoricalColumn): *)}}
   */
  abstract stats(indices: number[]): IStatsBuilder;

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
    if (!this.multiSelections && this.selection.size > 0) {
      this.selection = new Set<number>();
    }
    this.selection.add(index);
    this.fire(ADataProvider.EVENT_SELECTION_CHANGED, this.getSelection());
  }

  /**
   * hook for selecting elements matching the given arguments
   * @param search
   * @param col
   */
  abstract searchAndJump(search: string|RegExp, col: Column);

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
  selectAll(indices: number[]) {
    if (indices.every((i) => this.selection.has(i))) {
      return; //no change
    }
    if (!this.multiSelections) {
      this.selection = new Set<number>();
      indices = indices.slice(0, 1); //just the first one
    }
    indices.forEach((index) => {
      this.selection.add(index);
    });
    this.fire(ADataProvider.EVENT_SELECTION_CHANGED, this.getSelection());
  }

  /**
   * set the selection to the given rows
   * @param indices
   */
  setSelection(indices: number[]) {
    if (this.selection.size === indices.length && indices.every((i) => this.selection.has(i))) {
      return; //no change
    }
    this.selection = new Set<number>();
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
    } else {
      if (additional) {
        this.select(index);
      } else {
        this.setSelection([index]);
      }
      return true;
    }
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
   * returns a promise containing the selected rows
   * @return {Promise<any[]>}
   */
  selectedRows(): Promise<IDataRow[]> {
    if (this.selection.size === 0) {
      return Promise.resolve([]);
    }
    return this.view(this.getSelection());
  }

  /**
   * returns the currently selected indices
   * @returns {Array}
   */
  getSelection() {
    const indices = [];
    this.selection.forEach((s) => indices.push(s));
    indices.sort();
    return indices;
  }

  /**
   * clears the selection
   */
  clearSelection() {
    if (this.selection.size === 0) {
      return; //no change
    }
    this.selection = new Set<number>();
    this.fire(ADataProvider.EVENT_SELECTION_CHANGED, [], false);
  }

  /**
   * utility to export a ranking to a table with the given separator
   * @param ranking
   * @param options
   * @returns {Promise<string>}
   */
  exportTable(ranking: Ranking, options: IExportOptions = {}) {
    options = merge({
      separator: '\t',
      newline: '\n',
      header: true,
      quote: false,
      quoteChar: '"',
      filter: (c) => !isSupportType(c)
    }, options);
    //optionally quote not numbers
    function quote(l: string, c?: Column) {
      if (options.quote && (!c || !isNumberColumn(c))) {
        return options.quoteChar + l + options.quoteChar;
      }
      return l;
    }

    const columns = ranking.flatColumns.filter((c) => options.filter(c.desc));
    const order = ranking.getOrder();
    return this.view(order).then((data) => {
      const r = [];
      if (options.header) {
        r.push(columns.map((d) => quote(d.label)).join(options.separator));
      }
      data.forEach((row, i) => {
        r.push(columns.map((c) => quote(c.getLabel(row, order[i]), c)).join(options.separator));
      });
      return r.join(options.newline);
    });
  }

}

export default ADataProvider;
