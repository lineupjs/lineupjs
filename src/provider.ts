/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import model = require('./model');
import utils = require('./utils');
import d3 = require('d3');

function computeStats(arr: any[], acc: (any) => number, range?: [number, number]) : model.IStatistics {
  var hist = d3.layout.histogram().value(acc);
  if (range) {
    hist.range(() => range);
  }
  var hist_data = hist(arr);
  return {
    min : hist_data[0].x,
    max : hist_data[hist_data.length-1].x + hist_data[hist_data.length-1].dx,
    count: arr.length,
    hist : hist_data
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
  private rankings_:model.RankColumn[] = [];
  private selection = d3.set();

  private uid = 0;

  /**
   * lookup map of a column type to its column implementation
   */
  columnTypes:any = model.models();

  private reorder;

  constructor() {
    super();
    var that = this;
    this.reorder = function() {
      var ranking = this.source;
      that.sort(ranking).then((order) => ranking.setOrder(order));
    };
  }

  createEventList() {
    return super.createEventList().concat(['addColumn', 'removeColumn', 'addRanking', 'removeRanking', 'dirty', 'dirtyHeader', 'dirtyValues', 'selectionChanged']);
  }

  getColumns(): model.IColumnDesc[] {
    return [];
  }

  /**
   * adds a new ranking
   * @param existing an optional existing ranking to clone
   * @return the new ranking
   */
  pushRanking(existing?:model.RankColumn) {
    var r = this.cloneRanking(existing);
    this.pushRankingImpl(r);
    return r;
  }

  private pushRankingImpl(r: model.RankColumn) {
    this.rankings_.push(r);
    this.forward(r, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'dirtyValues.provider');
    r.on('dirtyOrder.provider',this.reorder);
    this.fire(['addRanking','dirtyHeader','dirtyValues','dirty'], r);
  }

  removeRanking(ranking:model.RankColumn) {
    var i = this.rankings_.indexOf(ranking);
    if (i < 0) {
      return false;
    }
    this.unforward(ranking, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'dirtyOrder.provider', 'dirtyValues.provider');
    this.rankings_.splice(i, 1);
    ranking.on('dirtyOrder.provider',null);
    this.cleanUpRanking(ranking);
    this.fire(['removeRanking','dirtyHeader','dirtyValues','dirty'], ranking);
    return true;
  }

  clearRankings() {
    this.rankings_.forEach((ranking) => {
      this.unforward(ranking, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'dirtyOrder.provider', 'dirtyValues.provider');
      ranking.on('dirtyOrder.provider',null);
      this.cleanUpRanking(ranking);
    });
    this.rankings_ = [];
    this.fire(['removeRanking','dirtyHeader','dirtyValues','dirty']);
  }

  getRankings() {
    return this.rankings_.slice();
  }

  cleanUpRanking(ranking:model.RankColumn) {
    //nothing to do
  }

  cloneRanking(existing?:model.RankColumn) {
    return null; //implement me
  }

  /**
   * adds a column to a ranking described by its column description
   * @param ranking
   * @param desc
   * @return {boolean}
   */
  push(ranking:model.RankColumn, desc:model.IColumnDesc) {
    var r = this.create(desc);
    if (r) {
      ranking.push(r);
      return r;
    }
    return null;
  }

  create(desc: model.IColumnDesc) {
    var type = this.columnTypes[desc.type];
    if (type) {
      return new type(this.nextId(), desc);
    }
    return null;
  }

  clone(col: model.Column) {
    var dump = col.dump((d) => d);
    var create = (d: any) => {
      var type = this.columnTypes[d.desc.type];
      var c  = new type(this.nextId(), d.desc);
      c.restore(d, create);
      return c;
    };
    return create(dump);
  }

  find(id_or_filter: (col: model.Column) => boolean | string) {
    var filter = typeof(id_or_filter) === 'string' ? (col) => col.id === id_or_filter : id_or_filter;
    for(var i = 0; i < this.rankings_.length; ++i) {
      var r = this.rankings_[i].find(filter);
      if (r) {
        return r;
      }
    }
    return null;
  }

  insert(ranking: model.RankColumn, index: number, desc: model.IColumnDesc) {
    var r = this.create(desc);
    if (r) {
      ranking.insert(r, index);
      return r;
    }
    return null;
  }

  private nextId() {
    return 'col' + (this.uid++);
  }

  dump() : any {
    return {
      uid: this.uid,
      selection: this.selection.values().map(Number),
      rankings: this.rankings_.map((r) => r.dump(this.toDescRef))
    };
  }

  toDescRef(desc: any) : any {
    return desc;
  }

  fromDescRef(descRef: any) : any {
    return descRef;
  }

  restore(dump: any) {
    var create = (d:any) => {
      var desc = this.fromDescRef(d.desc);
      var type = this.columnTypes[desc.type];
      var c = new type(d.id, desc);
      c.restore(d, create);
      return c;
    };

    this.clearRankings();

    this.uid = dump.uid || 0;
    if (dump.selection) {
      dump.selection.forEach((s) => this.selection.add(String(s)));
    }


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
  }

  findDesc(ref: string) {
    return null;
  }

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
  private deriveRanking(bundle: any[]) {
    var toCol = (column) => {
      if (column.type === 'rank') {
        return null; //can't handle
      }
      if (column.type === 'stacked') {
        //create a stacked one
        var r = this.create(model.StackColumn.desc(column.label || 'Combined'));
        (column.children || []).forEach((col) => {
          var c = toCol(col);
          if (c) {
            r.push(c);
          }
        });
        return r;
      } else {
        var desc = this.findDesc(column.column);
        if (desc) {
          var r = this.create(desc);
          column.label = column.label || desc.label || desc.column;
          r.restore(column);
          return r;
        }
      }
      return null;
    };
    var r = this.pushRanking();
    bundle.forEach((column) => {
      var col = toCol(column);
      if (col) {
        r.push(col);
      }
    });
    return r;
  }

  /**
   * sorts the given ranking and eventually return a ordering of the data items
   * @param ranking
   * @return {Promise<any>}
   */
  sort(ranking:model.RankColumn):Promise<number[]> {
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
  mappingSample(col: model.Column) : Promise<number[]> {
    return Promise.reject('not implemented');
  }

  stats(indices: number[], col: model.INumberColumn): Promise<model.IStatistics> {
    return Promise.reject('not implemented');
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
  isSelected(index: number) {
    return this.selection.has(String(index));
  }

  /**
   * also select the given row
   * @param index
   */
  select(index: number) {
    this.selection.add(String(index));
    this.fire('selectionChanged', this.selection.values().map(Number));
  }

  searchSelect(search: string|RegExp, col: model.Column) {
    //TODO
  }

  /**
   * also select all the given rows
   * @param indices
   */
  selectAll(indices: number[]) {
    indices.forEach((index) => {
      this.selection.add(String(index));
    });
    this.fire('selectionChanged', this.selection.values().map(Number));
  }

  /**
   * set the selection to the given rows
   * @param indices
   */
  setSelection(indices: number[]) {
    this.selection = d3.set();
    this.selectAll(indices);
  }

  /**
   * deselect the given row
   * @param index
   */
  deselect(index: number) {
    this.selection.remove(String(index));
    this.fire('selectionChanged',  this.selection.values().map(Number));
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
}

export class CommonDataProvider extends DataProvider {
  private rankingIndex = 0;
  //generic accessor of the data item
  private rowGetter = (row:any, id:string, desc:any) => row[desc.column];

  constructor(private columns:model.IColumnDesc[] = []) {
    super();

    //generate the accessor
    columns.forEach((d:any) => {
      d.accessor = this.rowGetter;
      d.label = d.label || d.column;
    });
  }

  getColumns(): model.IColumnDesc[] {
    return this.columns.slice();
  }
  findDesc(ref: string) {
    return this.columns.filter((c) => (<any>c).column === ref)[0];
  }

  toDescRef(desc: any) : any {
    return desc.column ? desc.type+'@'+desc.column : desc;
  }

  fromDescRef(descRef: any) : any {
    if (typeof(descRef) === 'string') {
      return this.columns.filter((d: any) => d.type+'@'+d.column === descRef) [0];
    }
    return descRef;
  }

  restore(dump: any) {
    super.restore(dump);
    this.rankingIndex = 1 + d3.max(this.getRankings(), (r) => + r.id.substring(4));
  }

  nextRankingId() {
    return 'rank' + (this.rankingIndex++);
  }
}
/**
 * a data provider based on an local array
 */
export class LocalDataProvider extends CommonDataProvider {

  constructor(public data:any[], columns:model.IColumnDesc[] = []) {
    super(columns);
    //enhance with a magic attribute storing ranking information
    data.forEach((d, i) => {
      d._rankings = {};
      d._index = i;
    });
  }

  cloneRanking(existing?:model.RankColumn) {
    var id = this.nextRankingId();
    var rankDesc = {
      label: 'Rank',
      type: 'rank',
      accessor: (row, id) => (row._rankings[id]+1) || 1
    };

    var new_ = new model.RankColumn(id, rankDesc);

    if (existing) { //copy the ranking of the other one
      this.data.forEach((row) => {
        var r = row._rankings;
        r[id] = r[existing.id];
      });
      //TODO better cloning
      existing.children.forEach((child) => {
        this.push(new_, child.desc);
      });
    }
    return new_;
  }

  cleanUpRanking(ranking:model.RankColumn) {
    //delete all stored information
    this.data.forEach((d) => delete d._rankings[ranking.id]);
  }

  sort(ranking:model.RankColumn):Promise<number[]> {
    //wrap in a helper and store the initial index
    var helper = this.data.map((r, i) => ({row: r, i: i, prev: r._rankings[ranking.id] || 0}));

    //do the optional filtering step
    if (ranking.isFiltered()) {
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

  mappingSample(col: model.NumberColumn) : Promise<number[]> {
    return Promise.resolve(this.data.map(col.getRawValue.bind(col)));
  }

  stats(indices: number[], col: model.INumberColumn): Promise<model.IStatistics> {
    return Promise.resolve(computeStats(this.data, col.getNumber.bind(col), [0, 1]));
  }
}

export interface IServerData {
  sort(desc:any) : Promise<number[]>;
  view(indices:number[]): Promise<any[]>;
  mappingSample(column: any) : Promise<number[]>;
}

/**
 * a remote implementation of the data provider
 */
export class RemoteDataProvider extends CommonDataProvider {

  private ranks:any = {};

  constructor(private server:IServerData, columns:model.IColumnDesc[] = []) {
    super(columns);
  }

  cloneRanking(existing?:model.RankColumn) {
    var id = this.nextRankingId();
    var rankDesc = {
      label: 'Rank',
      type: 'rank',
      accessor: (row, id) => this.ranks[id][row._index] || 0
    };
    if (existing) { //copy the ranking of the other one
      //copy the ranking
      this.ranks[id] = this.ranks[existing.id];
    }
    return new model.RankColumn(id, rankDesc);
  }

  cleanUpRanking(ranking:model.RankColumn) {
    //delete all stored information
    delete this.ranks[ranking.id];
  }

  sort(ranking:model.RankColumn):Promise<number[]> {
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

  mappingSample(col: model.Column) : Promise<number[]> {
    return this.server.mappingSample((<any>col.desc).column);
  }
}
