/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import model = require('./model');
import utils = require('./utils');
import d3 = require('d3');

/**
 * computes the simple statistics of an array using d3 histogram
 * @param arr the data array
 * @param acc accessor function
 * @param range the total value range
 * @returns {{min: number, max: number, count: number, hist: histogram.Bin<number>[]}}
 */
function computeStats(arr:any[], acc:(any) => number, range?:[number, number]):model.IStatistics {
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
  var hist = d3.layout.histogram().value(acc);
  if (range) {
    hist.range(() => range);
  }
  const ex = d3.extent(arr, acc);
  var hist_data = hist(arr);
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
function computeHist(arr:any[], acc:(any) => string[], categories: string[]):model.ICategoricalStatistics {
  var m = d3.map<number>();
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

/**
 * a basic data provider holding the data and rankings
 */
export class DataProvider extends utils.AEventDispatcher {
  /**
   * all rankings
   * @type {Array}
   * @private
   */
  private rankings_:model.Ranking[] = [];
  /**
   * the current selected indices
   * @type {Set}
   */
  private selection = d3.set();

  private uid = 0;

  /**
   * lookup map of a column type to its column implementation
   */
  columnTypes:any = model.models();

  /**
   * helper function for triggering reordering
   */
  private reorder;

  constructor() {
    super();
    var that = this;
    this.reorder = function () {
      that.triggerReorder(this.source);
    };
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
  getColumns():model.IColumnDesc[] {
    return [];
  }

  /**
   * adds a new ranking
   * @param existing an optional existing ranking to clone
   * @return the new ranking
   */
  pushRanking(existing?:model.Ranking) {
    var r = this.cloneRanking(existing);
    this.pushRankingImpl(r);
    return r;
  }

  private pushRankingImpl(r:model.Ranking) {
    this.rankings_.push(r);
    this.forward(r, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'orderChanged.provider', 'dirtyValues.provider');
    r.on('dirtyOrder.provider', this.reorder);
    this.fire(['addRanking', 'dirtyHeader', 'dirtyValues', 'dirty'], r);
  }

  protected triggerReorder(ranking: model.Ranking) {
    this.sort(ranking).then((order) => ranking.setOrder(order));
  }

  /**
   * removes a ranking from this data provider
   * @param ranking
   * @returns {boolean}
   */
  removeRanking(ranking:model.Ranking) {
    var i = this.rankings_.indexOf(ranking);
    if (i < 0) {
      return false;
    }
    this.unforward(ranking, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'orderChanged.provider', 'dirtyOrder.provider', 'dirtyValues.provider');
    this.rankings_.splice(i, 1);
    ranking.on('dirtyOrder.provider', null);
    this.cleanUpRanking(ranking);
    this.fire(['removeRanking', 'dirtyHeader', 'dirtyValues', 'dirty'], ranking);
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
    this.fire(['removeRanking', 'dirtyHeader', 'dirtyValues', 'dirty']);
  }

  /**
   * returns a list of all current rankings
   * @returns {model.Ranking[]}
   */
  getRankings() {
    return this.rankings_.slice();
  }

  /**
   * returns the last ranking for quicker access
   * @returns {model.Ranking}
   */
  getLastRanking() {
    return this.rankings_[this.rankings_.length - 1];
  }

  /**
   * hook method for cleaning up a ranking
   * @param ranking
   */
  cleanUpRanking(ranking:model.Ranking) {
    //nothing to do
  }

  /**
   * abstract method for cloning a ranking
   * @param existing
   * @returns {null}
   */
  cloneRanking(existing?:model.Ranking) {
    return null; //implement me
  }

  /**
   * adds a column to a ranking described by its column description
   * @param ranking the ranking to add the column to
   * @param desc the description of the column
   * @return {model.Column} the newly created column or null
   */
  push(ranking:model.Ranking, desc:model.IColumnDesc):model.Column {
    var r = this.create(desc);
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
   * @return {model.Column} the newly created column or null
   */
  insert(ranking:model.Ranking, index:number, desc:model.IColumnDesc) {
    var r = this.create(desc);
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


  /**
   * creates an internal column model out of the given column description
   * @param desc
   * @returns {model.Column] the new column or null if it can't be created
   */
  create(desc:model.IColumnDesc):model.Column {
    //find by type and instantiate
    var type = this.columnTypes[desc.type];
    if (type) {
      return new type(this.nextId(), desc);
    }
    return null;
  }

  /**
   * clones a column by dumping and restoring
   * @param col
   * @returns {model.Column}
   */
  clone(col:model.Column) {
    var dump = col.dump((d) => d);
    return this.restoreColumn(dump);
  }

  /**
   * restores a column from a dump
   * @param dump
   * @returns {model.Column}
   */
  restoreColumn(dump:any):model.Column {
    var create = (d:any) => {
      var type = this.columnTypes[d.desc.type];
      var c = new type('', d.desc);
      c.restore(d, create);
      c.assignNewId(this.nextId.bind(this));
      return c;
    };
    return create(dump);
  }

  /**
   * finds a column in all rankings returning the first match
   * @param id_or_filter by id or by a filter function
   * @returns {model.Column}
   */
  find(id_or_filter:(col:model.Column) => boolean | string):model.Column {
    //convert to function
    var filter = typeof(id_or_filter) === 'string' ? (col) => col.id === id_or_filter : id_or_filter;

    for (var i = 0; i < this.rankings_.length; ++i) {
      var r = this.rankings_[i].find(filter);
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
  dumpColumn(col:model.Column) {
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

  restore(dump:any) {
    //factory method for restoring a column
    var create = (d:any) => {
      var desc = this.fromDescRef(d.desc);
      var c = null;
      if (desc && desc.type) {
        var type = this.columnTypes[desc.type];
        c = new type(d.id, desc);
        c.restore(d, create);
      }
      return c;
    };

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
        var ranking = this.pushRanking();
        ranking.restore(r, create);
      });
    }
    if (dump.layout) { //we have the old format try to create it
      Object.keys(dump.layout).forEach((key) => {
        this.deriveRanking(dump.layout[key]);
      });
    }
    //assign new ids
    var idGenerator = this.nextId.bind(this);
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
    var r = this.pushRanking();
    this.getColumns().forEach((col) => {
      this.push(r, col);
    });
  }

  /**
   * derives a ranking from an old layout bundle format
   * @param bundle
   */
  private deriveRanking(bundle:any[]) {
    const ranking = this.pushRanking();
    var toCol = (column) => {
      if (column.type === 'rank') {
        return this.create(ranking.createRankDesc());
      }
      if (column.type === 'selection') {
        return this.create(this.createSelectionDesc());
      }
      if (column.type === 'actions') {
        let r = this.create(model.createActionDesc(column.label || 'actions'));
        r.restore(column, null);
        return r;
      }
      if (column.type === 'stacked') {
        //create a stacked one
        let r = <model.StackColumn>this.create(model.StackColumn.desc(column.label || 'Combined'));
        (column.children || []).forEach((col) => {
          var c = toCol(col);
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
      var col = toCol(column);
      if (col) {
        ranking.push(col);
      }
    });
    if (ranking.columns.filter((c) => c.desc.type === 'rank').length > 1) {
      ranking.remove(ranking.columns[0]); //remove the first rank column if there are some in between.
    }
    return ranking;
  }

  /**
   * sorts the given ranking and eventually return a ordering of the data items
   * @param ranking
   * @return {Promise<any>}
   */
  sort(ranking:model.Ranking):Promise<number[]> {
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
  mappingSample(col:model.Column):Promise<number[]> {
    return Promise.reject('not implemented');
  }

  /**
   * helper for computing statistics
   * @param indices
   * @returns {{stats: (function(model.INumberColumn): *), hist: (function(model.ICategoricalColumn): *)}}
   */
  stats(indices:number[]) {
    return {
      stats: (col:model.INumberColumn) => Promise.reject('not implemented'),
      hist: (col:model.ICategoricalColumn) => Promise.reject('not implemented')
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
  searchSelect(search:string|RegExp, col:model.Column) {
    //implemented by custom provider
  }

  /**
   * also select all the given rows
   * @param indices
   */
  selectAll(indices:number[]) {
    indices.forEach((index) => {
      this.selection.add(String(index));
    });
    this.fire('selectionChanged', this.selection.values().map(Number));
  }

  /**
   * set the selection to the given rows
   * @param indices
   */
  setSelection(indices:number[]) {
    if (this.selection.size() === indices.length && indices.every((i) => this.selection.has(String(i)))) {
      return; //no change
    }
    this.selection = d3.set();
    this.selectAll(indices);
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

  createSelectionDesc() : model.IColumnDesc {
    return <any>{
      type: 'selection',
      label: 'S',
      accessor: (row: any) => this.isSelected(row._index),
      setter: (row: any, value: boolean) => value ? this.select(row._index) : this.deselect(row._index)
    };
  }

  createRankDesc() : model.IColumnDesc {
    return null;
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
    this.fire('selectionChanged', []);
  }

  /**
   * utility to export a ranking to a table with the given separator
   * @param ranking
   * @param options
   * @returns {Promise<string>}
   */
  exportTable(ranking: model.Ranking, options : { separator?: string; newline?: string; header? : boolean} = {}) {
    const op = {
      separator : '\t',
      newline: '\n',
      header: true,
      quote: false,
      quoteChar: '"'
    };
    //optionaly quote not numbers
    function quote(l: string, c?: model.Column) {
      if (op.quote && (!c || !model.isNumberColumn(c))) {
        return op.quoteChar + l + op.quoteChar;
      }
      return l;
    }
    utils.merge(op, options);
    const columns = ranking.flatColumns;
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

  constructor(private columns:model.IColumnDesc[] = []) {
    super();
    this.columns = columns.concat([this.createRankDesc(), this.createSelectionDesc()]);
    //generate the accessor
    columns.forEach((d:any) => {
      d.accessor = this.rowGetter;
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
  pushDesc(column:model.IColumnDesc) {
    var d:any = column;
    d.accessor = this.rowGetter;
    d.label = column.label || d.column;
    this.columns.push(column);
    this.fire('addDesc', d);
  }

  getColumns():model.IColumnDesc[] {
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
    filterGlobally: false
  };

  private reorderall;

  constructor(public data:any[], columns:model.IColumnDesc[] = [], options = {}) {
    super(columns);
    utils.merge(this.options, options);
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

  createRankDesc() {
    return {
      label: 'Rank',
      type: 'rank',
      accessor: (row, id, desc, ranking) => (row._rankings[ranking.id] + 1) || 1
    };
  }

  cloneRanking(existing?:model.Ranking) {
    var id = this.nextRankingId();

    var new_ = new model.Ranking(id);

    if (existing) { //copy the ranking of the other one
      this.data.forEach((row) => {
        var r = row._rankings;
        r[id] = r[existing.id];
      });
      //TODO better cloning
      existing.children.forEach((child) => {
        this.push(new_, child.desc);
      });
    } else {
      new_.push(this.create(this.createRankDesc()));
    }

    if (this.options.filterGlobally) {
      new_.on('filterChanged.reorderall', this.reorderall);
    }

    return new_;
  }

  cleanUpRanking(ranking:model.Ranking) {
    if (this.options.filterGlobally) {
      ranking.on('filterChanged.reorderall', null);
    }
    //delete all stored information
    this.data.forEach((d) => delete d._rankings[ranking.id]);
  }

  sort(ranking:model.Ranking):Promise<number[]> {
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
    var slice = indices.map((index) => this.data[index]);

    return Promise.resolve(slice);
  }

  /**
   * helper for computing statistics
   * @param indices
   * @returns {{stats: (function(model.INumberColumn): *), hist: (function(model.ICategoricalColumn): *)}}
   */
  stats(indices:number[]) {
    var d:Promise<any[]> = null;
    const getD= () => d === null ? (d = this.view(indices)) : d;

    return {
      stats: (col:model.INumberColumn) => getD().then((data) => computeStats(data, col.getNumber.bind(col), [0, 1])),
      hist: (col:model.ICategoricalColumn) => getD().then((data) => computeHist(data, col.getCategories.bind(col), col.categories))
    };
  }


  mappingSample(col:model.NumberColumn):Promise<number[]> {
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

  searchSelect(search:string|RegExp, col:model.Column) {
    const f = typeof search === 'string' ? (v:string) => v.indexOf(search) >= 0 : (v:string) => v.match(search) != null;
    const indices = this.data.filter((row) => {
      return f(col.getLabel(row));
    }).map((row) => row._index);
    this.setSelection(indices);
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

  constructor(private server:IServerData, columns:model.IColumnDesc[] = []) {
    super(columns);
  }

  createRankDesc() {
    return {
      label: 'Rank',
      type: 'rank',
      accessor: (row, id, desc, ranking) => this.ranks[ranking.id][row._index] || 0
    };
  }

  cloneRanking(existing?:model.Ranking) {
    var id = this.nextRankingId();
    if (existing) { //copy the ranking of the other one
      //copy the ranking
      this.ranks[id] = this.ranks[existing.id];
    }
    var r = new model.Ranking(id);
    r.push(this.create(this.createRankDesc()));
  }

  cleanUpRanking(ranking:model.Ranking) {
    //delete all stored information
    delete this.ranks[ranking.id];
  }

  sort(ranking:model.Ranking):Promise<number[]> {
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

  mappingSample(col:model.Column):Promise<number[]> {
    return this.server.mappingSample((<any>col.desc).column);
  }

  searchSelect(search:string|RegExp, col:model.Column) {
    this.server.search(search, (<any>col.desc).column).then((indices) => {
      this.setSelection(indices);
    });
  }
}
