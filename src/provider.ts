/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {IStatistics, ICategoricalStatistics, IColumnDesc, Ranking, Column, models, RankColumn, createActionDesc, createStackDesc, isNumberColumn, createRankDesc, createSelectionDesc, StackColumn, INumberColumn, ICategoricalColumn, NumberColumn} from './model';
import {merge, AEventDispatcher, delayedCall} from './utils';
import * as d3 from 'd3';

/**
 * computes the simple statistics of an array using d3 histogram
 * @param arr the data array
 * @param acc accessor function
 * @param range the total value range
 * @returns {{min: number, max: number, count: number, hist: histogram.Bin<number>[]}}
 */
function computeStats(arr:any[], acc:(any) => number, range?:[number, number]):IStatistics {
  if (arr.length === 0) {
    return {
      min: NaN,
      max: NaN,
      mean: NaN,
      count: 0,
      maxBin: 0,
      hist: []
    };
  }
  const hist = d3.layout.histogram().value(acc);
  if (range) {
    hist.range(() => range);
  }
  const ex = d3.extent(arr, acc);
  const hist_data = hist(arr);
  return {
    min: ex[0],
    max: ex[1],
    mean: d3.mean(arr, acc),
    count: arr.length,
    maxBin: d3.max(hist_data, (d) => d.y),
    hist: hist_data
  };
}

/**
 * computes a categorical histogram
 * @param arr the data array
 * @param acc the accessor
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 */
function computeHist(arr:any[], acc:(any) => string[], categories: string[]):ICategoricalStatistics {
  const m = d3.map<number>();
  categories.forEach((cat) => m.set(cat, 0));

  arr.forEach((a) => {
    const vs = acc(a);
    if (vs == null) {
      return;
    }
    vs.forEach((v) => {
      m.set(v, (m.get(v) || 0) + 1);
    });
  });
  return {
    maxBin: d3.max(m.values()),
    hist: m.entries().map((entry) => ({ cat: entry.key, y : entry.value}))
  };
}


function isSupportType(col: IColumnDesc) {
  return ['rank', 'selection', 'actions'].indexOf(col.type) >= 0;
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
  filter?: (col: IColumnDesc)=>boolean; //!isSupportType
}

/**
 * a basic data provider holding the data and rankings
 */
export class DataProvider extends AEventDispatcher {
  /**
   * all rankings
   * @type {Array}
   * @private
   */
  private rankings_:Ranking[] = [];
  /**
   * the current selected indices
   * @type {Set}
   */
  private selection = d3.set();

  private uid = 0;

  /**
   * lookup map of a column type to its column implementation
   */
  columnTypes:any = merge({}, models());


  constructor(options : any = {}) {
    super();
    this.columnTypes = merge(models(), options.columnTypes || {});
  }

  /**
   * events:
   *  * column changes: addColumn, removeColumn
   *  * ranking changes: addRanking, removeRanking
   *  * dirty: dirty, dirtyHeder, dirtyValues
   *  * selectionChanged
   * @returns {string[]}
   */
  createEventList() {
    return super.createEventList().concat(['addColumn', 'removeColumn', 'addRanking', 'removeRanking', 'dirty', 'dirtyHeader', 'dirtyValues', 'orderChanged', 'selectionChanged']);
  }

  /**
   * returns a list of all known column descriptions
   * @returns {Array}
   */
  getColumns():IColumnDesc[] {
    return [];
  }

  /**
   * adds a new ranking
   * @param existing an optional existing ranking to clone
   * @return the new ranking
   */
  pushRanking(existing?:Ranking) : Ranking {
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

  insertRanking(r:Ranking, index = this.rankings_.length) {
    this.rankings_.splice(index, 0, r);
    this.forward(r, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'orderChanged.provider', 'dirtyValues.provider');
    const that = this;
    //delayed reordering per ranking
    r.on('dirtyOrder.provider', delayedCall(function () {
        that.triggerReorder(this.source);
      }, 100, null));
    this.fire(['addRanking', 'dirtyHeader', 'dirtyValues', 'dirty'], r, index);
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
  removeRanking(ranking:Ranking) {
    const i = this.rankings_.indexOf(ranking);
    if (i < 0) {
      return false;
    }
    this.unforward(ranking, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'orderChanged.provider', 'dirtyOrder.provider', 'dirtyValues.provider');
    this.rankings_.splice(i, 1);
    ranking.on('dirtyOrder.provider', null);
    this.cleanUpRanking(ranking);
    this.fire(['removeRanking', 'dirtyHeader', 'dirtyValues', 'dirty'], ranking, i);
    return true;
  }

  /**
   * removes all rankings
   */
  clearRankings() {
    this.rankings_.forEach((ranking) => {
      this.unforward(ranking, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'dirtyOrder.provider', 'dirtyValues.provider');
      ranking.on('dirtyOrder.provider', null);
      this.cleanUpRanking(ranking);
    });
    this.rankings_ = [];
    this.fire(['removeRanking', 'dirtyHeader', 'dirtyValues', 'dirty'], null);
  }

  /**
   * returns a list of all current rankings
   * @returns {Ranking[]}
   */
  getRankings() {
    return this.rankings_.slice();
  }

  /**
   * returns the last ranking for quicker access
   * @returns {Ranking}
   */
  getLastRanking() {
    return this.rankings_[this.rankings_.length - 1];
  }

  /**
   * hook method for cleaning up a ranking
   * @param ranking
   */
  cleanUpRanking(ranking:Ranking) {
    //nothing to do
  }

  /**
   * abstract method for cloning a ranking
   * @param existing
   * @returns {null}
   */
  cloneRanking(existing?:Ranking): Ranking {
    return null; //implement me
  }

  /**
   * adds a column to a ranking described by its column description
   * @param ranking the ranking to add the column to
   * @param desc the description of the column
   * @return {Column} the newly created column or null
   */
  push(ranking:Ranking, desc:IColumnDesc):Column {
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
  insert(ranking:Ranking, index:number, desc:IColumnDesc) {
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

  protected rankAccessor(row: any, id: string, desc: IColumnDesc, ranking: Ranking) {
    return 0;
  }

  private fixDesc(desc: IColumnDesc) {
    //hacks for provider dependent descriptors
    if (desc.type === 'rank') {
      (<any>desc).accessor = this.rankAccessor.bind(this);
    } else if (desc.type === 'selection') {
      (<any>desc).accessor = (row: any) => this.isSelected(row._index);
      (<any>desc).setter = (row: any, value: boolean) => value ? this.select(row._index) : this.deselect(row._index);
    }
  }
  /**
   * creates an internal column model out of the given column description
   * @param desc
   * @returns {Column] the new column or null if it can't be created
   */
  create(desc:IColumnDesc):Column {
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
  clone(col:Column) {
    const dump = this.dumpColumn(col);
    return this.restoreColumn(dump);
  }

  /**
   * restores a column from a dump
   * @param dump
   * @returns {Column}
   */
  restoreColumn(dump:any):Column {
    const create = (d:any) => {
      const desc = this.fromDescRef(d.desc);
      var type = this.columnTypes[desc.type];
      this.fixDesc(desc);
      var c = new type('', desc);
      c.restore(d, create);
      c.assignNewId(this.nextId.bind(this));
      return c;
    };
    return create(dump);
  }

  /**
   * finds a column in all rankings returning the first match
   * @param id_or_filter by id or by a filter function
   * @returns {Column}
   */
  find(id_or_filter:(col:Column) => boolean | string):Column {
    //convert to function
    const filter = typeof(id_or_filter) === 'string' ? (col) => col.id === id_or_filter : id_or_filter;

    for (let i = 0; i < this.rankings_.length; ++i) {
      let r = this.rankings_[i].find(filter);
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
  dump():any {
    return {
      uid: this.uid,
      selection: this.selection.values().map(Number),
      rankings: this.rankings_.map((r) => r.dump(this.toDescRef))
    };
  }

  /**
   * dumps a specific column
   * @param col
   * @returns {any}
   */
  dumpColumn(col:Column) {
    return col.dump(this.toDescRef);
  }

  /**
   * for better dumping describe reference, by default just return the description
   * @param desc
   * @returns {any}
   */
  toDescRef(desc:any):any {
    return desc;
  }

  /**
   * inverse operation of toDescRef
   * @param descRef
   * @returns {any}
   */
  fromDescRef(descRef:any):any {
    return descRef;
  }

  private createHelper = (d:any) => {
    //factory method for restoring a column
    const desc = this.fromDescRef(d.desc);
    var c = null;
    if (desc && desc.type) {
      this.fixDesc(d.desc);
      let type = this.columnTypes[desc.type];
      c = new type(d.id, desc);
      c.restore(d, this.createHelper);
    }
    return c;
  };

  restoreRanking(dump: any) {
    const ranking = this.cloneRanking();
    ranking.restore(dump, this.createHelper);
    //if no rank column add one
    if (!ranking.children.some((d) => d instanceof RankColumn)) {
      ranking.insert(this.create(RankColumn.desc()), 0);
    }
    const idGenerator = this.nextId.bind(this);
    ranking.children.forEach((c) => c.assignNewId(idGenerator));

    return ranking;
  }

  restore(dump:any) {


    //clean old
    this.clearRankings();

    //restore selection
    this.uid = dump.uid || 0;
    if (dump.selection) {
      dump.selection.forEach((s) => this.selection.add(String(s)));
    }


    //restore rankings
    if (dump.rankings) {
      dump.rankings.forEach((r) => {
        var ranking = this.cloneRanking();
        ranking.restore(r, this.createHelper);
        //if no rank column add one
        if (!ranking.children.some((d) => d instanceof RankColumn)) {
          ranking.insert(this.create(RankColumn.desc()), 0);
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
    this.rankings_.forEach((r) => {
      r.children.forEach((c) => c.assignNewId(idGenerator));
    });
  }

  findDesc(ref:string) {
    return null;
  }

  /**
   * generates a default ranking by using all column descriptions ones
   */
  deriveDefault() {
    if (this.rankings_.length > 0) {
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
  private deriveRanking(bundle:any[]) {
    const ranking = this.cloneRanking();
    ranking.clear();
    const toCol = (column) => {
      if (column.type === 'rank') {
        return this.create(createRankDesc());
      }
      if (column.type === 'selection') {
        return this.create(createSelectionDesc());
      }
      if (column.type === 'actions') {
        let r = this.create(createActionDesc(column.label || 'actions'));
        r.restore(column, null);
        return r;
      }
      if (column.type === 'stacked') {
        //create a stacked one
        let r = <StackColumn>this.create(createStackDesc(column.label || 'Combined'));
        (column.children || []).forEach((col) => {
          let c = toCol(col);
          if (c) {
            r.push(c);
          }
        });
        return r;
      } else {
        let desc = this.findDesc(column.column);
        if (desc) {
          let r = this.create(desc);
          column.label = column.label || desc.label || desc.column;
          r.restore(column, null);
          return r;
        }
      }
      return null;
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
  sort(ranking:Ranking):Promise<number[]> {
    return Promise.reject('not implemented');
  }

  /**
   * returns a view in the order of the given indices
   * @param indices
   * @return {Promise<any>}
   */
  view(indices:number[]):Promise<any[]> {
    return Promise.reject('not implemented');
  }

  /**
   * returns a data sample used for the mapping editor
   * @param col
   * @return {Promise<any>}
   */
  mappingSample(col:Column):Promise<number[]> {
    return Promise.reject('not implemented');
  }

  /**
   * helper for computing statistics
   * @param indices
   * @returns {{stats: (function(INumberColumn): *), hist: (function(ICategoricalColumn): *)}}
   */
  stats(indices:number[]) {
    return {
      stats: (col:INumberColumn) => Promise.reject('not implemented'),
      hist: (col:ICategoricalColumn) => Promise.reject('not implemented')
    };
  }

  /**
   * method for computing the unique key of a row
   * @param row
   * @param i
   * @return {string}
   */
  rowKey(row:any, i:number) {
    return typeof(row) === 'number' ? String(row) : String(row._index);
  }


  /**
   * is the given row selected
   * @param index
   * @return {boolean}
   */
  isSelected(index:number) {
    return this.selection.has(String(index));
  }

  /**
   * also select the given row
   * @param index
   */
  select(index:number) {
    this.selection.add(String(index));
    this.fire('selectionChanged', this.selection.values().map(Number));
  }

  /**
   * hook for selecting elements matching the given arguments
   * @param search
   * @param col
   */
  searchSelect(search:string|RegExp, col:Column) {
    //implemented by custom provider
  }

  /**
   * also select all the given rows
   * @param indices
   * @param jumpToSelection whether the first selected row should be visible
   */
  selectAll(indices:number[], jumpToSelection = false) {
    indices.forEach((index) => {
      this.selection.add(String(index));
    });
    this.fire('selectionChanged', this.selection.values().map(Number), jumpToSelection);
  }

  /**
   * set the selection to the given rows
   * @param indices
   * @param jumpToSelection whether the first selected row should be visible
   */
  setSelection(indices:number[], jumpToSelection = false) {
    if (this.selection.size() === indices.length && indices.every((i) => this.selection.has(String(i)))) {
      return; //no change
    }
    this.selection = d3.set();
    this.selectAll(indices, jumpToSelection);
  }

  /**
   * toggles the selection of the given data index
   * @param index
   * @param additional just this element or all
   * @returns {boolean} whether the index is currently selected
   */
  toggleSelection(index:number, additional = false) {
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
  deselect(index:number) {
    this.selection.remove(String(index));
    this.fire('selectionChanged', this.selection.values().map(Number));
  }

  /**
   * returns a promise containing the selected rows
   * @return {Promise<any[]>}
   */
  selectedRows() {
    if (this.selection.empty()) {
      return Promise.resolve([]);
    }
    return this.view(this.getSelection());
  }

  /**
   * returns the currently selected indices
   * @returns {Array}
   */
  getSelection() {
    var indices = [];
    this.selection.forEach((s) => indices.push(+s));
    indices.sort();
    return indices;
  }

  /**
   * clears the selection
   */
  clearSelection() {
    this.selection = d3.set();
    this.fire('selectionChanged', [], false);
  }

  /**
   * utility to export a ranking to a table with the given separator
   * @param ranking
   * @param options
   * @returns {Promise<string>}
   */
  exportTable(ranking: Ranking, options : IExportOptions = {}) {
    const op: IExportOptions = {
      separator : '\t',
      newline: '\n',
      header: true,
      quote: false,
      quoteChar: '"',
      filter: (c) => !isSupportType(c)
    };
    options = merge(op, options);
    //optionally quote not numbers
    function quote(l: string, c?: Column) {
      if (op.quote && (!c || !isNumberColumn(c))) {
        return op.quoteChar + l + op.quoteChar;
      }
      return l;
    }
    const columns = ranking.flatColumns.filter((c) => op.filter(c.desc));
    return this.view(ranking.getOrder()).then((data) => {
      var r = [];
      if (op.header) {
        r.push(columns.map((d) => quote(d.label)).join(op.separator));
      }
      data.forEach((row) => {
        r.push(columns.map((c) => quote(c.getLabel(row),c)).join(op.separator));
      });
      return r.join(op.newline);
    });
  }

}

/**
 * common base implementation of a DataProvider with a fixed list of column descriptions
 */
export class CommonDataProvider extends DataProvider {
  private rankingIndex = 0;
  //generic accessor of the data item
  private rowGetter = (row:any, id:string, desc:any) => row[desc.column];

  constructor(private columns:IColumnDesc[] = [], options :any = {}) {
    super(options);
    //generate the accessor
    columns.forEach((d:any) => {
      d.accessor = d.accessor || this.rowGetter;
      d.label = d.label || d.column;
    });
  }

  createEventList() {
    return super.createEventList().concat(['addDesc']);
  }

  /**
   * adds another column description to this data provider
   * @param column
   */
  pushDesc(column:IColumnDesc) {
    var d:any = column;
    d.accessor = d.accessor || this.rowGetter;
    d.label = column.label || d.column;
    this.columns.push(column);
    this.fire('addDesc', d);
  }

  getColumns():IColumnDesc[] {
    return this.columns.slice();
  }

  findDesc(ref:string) {
    return this.columns.filter((c) => (<any>c).column === ref)[0];
  }

  /**
   * identify by the tuple type@columnname
   * @param desc
   * @returns {string}
   */
  toDescRef(desc:any):any {
    return desc.column ? desc.type + '@' + desc.column : desc;
  }

  fromDescRef(descRef:any):any {
    if (typeof(descRef) === 'string') {
      return this.columns.filter((d:any) => d.type + '@' + d.column === descRef) [0];
    }
    return descRef;
  }

  restore(dump:any) {
    super.restore(dump);
    this.rankingIndex = 1 + d3.max(this.getRankings(), (r) => +r.id.substring(4));
  }

  nextRankingId() {
    return 'rank' + (this.rankingIndex++);
  }
}
/**
 * a data provider based on an local array
 */
export class LocalDataProvider extends CommonDataProvider {
  private options = {
    /**
     * whether the filter should be applied to all rankings regardless where they are
     */
    filterGlobally: false,

    /**
     * jump to search results such that they are visible
     */
    jumpToSearchResult: true
  };

  private reorderall;

  constructor(public data:any[], columns:IColumnDesc[] = [], options = {}) {
    super(columns, options);
    merge(this.options, options);
    //enhance with a magic attribute storing ranking information
    data.forEach((d, i) => {
      d._rankings = {};
      d._index = i;
    });

    const that = this;
    this.reorderall = function() {
      //fire for all other rankings a dirty order event, too
      var ranking = this.source;
      that.getRankings().forEach((r) => {
        if (r !== ranking) {
          r.dirtyOrder();
        }
      });
    };
  }

  /**
   * replaces the dataset rows with a new one
   * @param data
   */
  setData(data: any[]) {
    data.forEach((d, i) => {
      d._rankings = {};
      d._index = i;
    });

    this.data = data;
    this.reorderall();
  }

  clearData() {
    this.setData([]);
  }

  /**
   * append rows to the dataset
   * @param data
   */
  appendData(data: any[]) {
    const l = this.data.length;
    data.forEach((d, i) => {
      d._rankings = {};
      d._index = l+i;
    });
    this.data.push.apply(this.data, data);
    this.reorderall();
  }

  protected rankAccessor(row: any, id: string, desc: IColumnDesc, ranking: Ranking) {
    return (row._rankings[ranking.id] + 1) || 1;
  }

  cloneRanking(existing?:Ranking) {
    const id = this.nextRankingId();

    const new_ = new Ranking(id);

    if (existing) { //copy the ranking of the other one
      this.data.forEach((row) => {
        let r = row._rankings;
        r[id] = r[existing.id];
      });
      //TODO better cloning
      existing.children.forEach((child) => {
        this.push(new_, child.desc);
      });
    } else {
      new_.push(this.create(createRankDesc()));
    }

    if (this.options.filterGlobally) {
      new_.on('filterChanged.reorderall', this.reorderall);
    }

    return new_;
  }

  cleanUpRanking(ranking:Ranking) {
    if (this.options.filterGlobally) {
      ranking.on('filterChanged.reorderall', null);
    }
    //delete all stored information
    this.data.forEach((d) => delete d._rankings[ranking.id]);
  }

  sort(ranking:Ranking):Promise<number[]> {
    if (this.data.length === 0) {
      return Promise.resolve([]);
    }
    //wrap in a helper and store the initial index
    var helper = this.data.map((r, i) => ({row: r, i: i, prev: r._rankings[ranking.id] || 0}));

    //do the optional filtering step
    if (this.options.filterGlobally) {
      let filtered = this.getRankings().filter((d) => d.isFiltered());
      if (filtered.length > 0) {
        helper = helper.filter((d) => filtered.every((f) => f.filter(d.row)));
      }
    } else if (ranking.isFiltered()) {
      helper = helper.filter((d) => ranking.filter(d.row));
    }

    //sort by the ranking column
    helper.sort((a, b) => ranking.comparator(a.row, b.row));

    //store the ranking index and create an argsort version, i.e. rank 0 -> index i
    var argsort = helper.map((r, i) => {
      r.row._rankings[ranking.id] = i;
      return r.i;
    });

    return Promise.resolve(argsort);
  }

  view(indices:number[]) {
    if (this.data.length === 0) {
      return Promise.resolve([]);
    }
    //filter invalid indices
    const l = this.data.length;
    var slice = indices.filter((i) => i>=0 && i<l).map((index) => this.data[index]);

    return Promise.resolve(slice);
  }

  /**
   * helper for computing statistics
   * @param indices
   * @returns {{stats: (function(INumberColumn): *), hist: (function(ICategoricalColumn): *)}}
   */
  stats(indices:number[]) {
    var d:Promise<any[]> = null;
    const getD= () => d === null ? (d = this.view(indices)) : d;

    return {
      stats: (col:INumberColumn) => getD().then((data) => computeStats(data, col.getNumber.bind(col), [0, 1])),
      hist: (col:ICategoricalColumn) => getD().then((data) => computeHist(data, col.getCategories.bind(col), col.categories))
    };
  }


  mappingSample(col:NumberColumn):Promise<number[]> {
    const MAX_SAMPLE = 500; //at most 500 sample lines
    const l = this.data.length;
    if (l <= MAX_SAMPLE) {
      return Promise.resolve(this.data.map(col.getRawValue.bind(col)));
    }
    //randomly select 500 elements
    var indices = [];
    for(let i = 0; i < MAX_SAMPLE; ++i) {
      let j = Math.floor(Math.random()*(l-1));
      while (indices.indexOf(j) >= 0) {
        j = Math.floor(Math.random()*(l-1));
      }
      indices.push(j);
    }
    return Promise.resolve(indices.map((i) => col.getRawValue(this.data[i])));
  }

  searchSelect(search:string|RegExp, col:Column) {
    //case insensitive search
    search = typeof search === 'string' ? search.toLowerCase() : search;
    const f = typeof search === 'string' ? (v:string) => v.toLowerCase().indexOf((<string>search)) >= 0 : (<RegExp>search).test.bind(search);
    const indices = this.data.filter((row) => {
      return f(col.getLabel(row));
    }).map((row) => row._index);
    this.setSelection(indices, this.options.jumpToSearchResult);
  }

}

/**
 * interface what the server side has to provide
 */
export interface IServerData {
  /**
   * sort the dataset by the given description
   * @param desc
   */
  sort(desc:any) : Promise<number[]>;
  /**
   * returns a slice of the data array identified by a list of indices
   * @param indices
   */
  view(indices:number[]): Promise<any[]>;
  /**
   * returns a sample of the values for a given column
   * @param column
   */
  mappingSample(column:any) : Promise<number[]>;
  /**
   * return the matching indices matching the given arguments
   * @param search
   * @param column
   */
  search(search:string|RegExp, column:any): Promise<number[]>;
}

/**
 * a remote implementation of the data provider
 */
export class RemoteDataProvider extends CommonDataProvider {

  /**
   * the local ranking orders
   * @type {{}}
   */
  private ranks:any = {};

  constructor(private server:IServerData, columns:IColumnDesc[] = [], options :any = {}) {
    super(columns, options);
  }

  protected rankAccessor(row: any, id: string, desc: IColumnDesc, ranking: Ranking) {
    return this.ranks[ranking.id][row._index] || 0;
  }

  cloneRanking(existing?:Ranking) {
    var id = this.nextRankingId();
    if (existing) { //copy the ranking of the other one
      //copy the ranking
      this.ranks[id] = this.ranks[existing.id];
    }
    var r = new Ranking(id);
    r.push(this.create(createRankDesc()));

    return r;
  }

  cleanUpRanking(ranking:Ranking) {
    //delete all stored information
    delete this.ranks[ranking.id];
  }

  sort(ranking:Ranking):Promise<number[]> {
    //generate a description of what to sort
    var desc = ranking.toSortingDesc((desc) => desc.column);
    //use the server side to sort
    return this.server.sort(desc).then((argsort) => {
      //store the result
      this.ranks[ranking.id] = argsort;
      return argsort;
    });
  }

  view(argsort:number[]) {
    return this.server.view(argsort).then((view) => {
      //enhance with the data index
      view.forEach((d, i) => d._index = argsort[i]);
      return view;
    });
  }

  mappingSample(col:Column):Promise<number[]> {
    return this.server.mappingSample((<any>col.desc).column);
  }

  searchSelect(search:string|RegExp, col:Column) {
    this.server.search(search, (<any>col.desc).column).then((indices) => {
      this.setSelection(indices);
    });
  }
}
