/**
 * Created by sam on 04.11.2016.
 */

import Column, {IStatistics, ICategoricalStatistics, IColumnDesc} from '../model/Column';
import NumberColumn, {INumberColumn} from '../model/NumberColumn';
import Ranking from '../model/Ranking';
import {ICategoricalColumn} from '../model/CategoricalColumn';
import {merge} from '../utils';
import * as d3 from 'd3';
import {IStatsBuilder, IDataProviderOptions, IDataRow} from './ADataProvider';
import ACommonDataProvider from './ACommonDataProvider';

/**
 * computes the simple statistics of an array using d3 histogram
 * @param arr the data array
 * @param indices array data indices
 * @param acc accessor function
 * @param range the total value range
 * @returns {{min: number, max: number, count: number, hist: histogram.Bin<number>[]}}
 */
function computeStats(arr: any[], indices: number[], acc: (row: any, index: number) => number, range?: [number, number]): IStatistics {
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
  const indexAccessor = (a, i) => acc(a, indices[i]);
  const hist = d3.layout.histogram().value(indexAccessor);
  if (range) {
    hist.range(() => range);
  }
  const ex = d3.extent(arr, indexAccessor);
  const histData = hist(arr);
  return {
    min: ex[0],
    max: ex[1],
    mean: d3.mean(arr, indexAccessor),
    count: arr.length,
    maxBin: d3.max(histData, (d) => d.y),
    hist: histData
  };
}

/**
 * computes a categorical histogram
 * @param arr the data array
 * @param indices the data array data indices
 * @param acc the accessor
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 */
function computeHist(arr: number[], indices: number[], acc: (row: any, index: number) => string[], categories: string[]): ICategoricalStatistics {
  const m = new Map<string,number>();
  categories.forEach((cat) => m.set(cat, 0));

  arr.forEach((a, i) => {
    const vs = acc(a, indices[i]);
    if (vs == null) {
      return;
    }
    vs.forEach((v) => {
      m.set(v, (m.get(v) || 0) + 1);
    });
  });
  const entries: {cat: string; y: number}[] = [];
  m.forEach((v, k) => entries.push({cat: k, y: v}));
  return {
    maxBin: Math.max(...entries.map((d) => d.y)),
    hist: entries
  };
}

export interface ILocalDataProviderOptions {
  /**
   * whether the filter should be applied to all rankings regardless where they are
   * default: false
   */
  filterGlobally?: boolean;
  /**
   * jump to search results such that they are visible
   * default: false
   */
  jumpToSearchResult?: boolean;
}
/**
 * a data provider based on an local array
 */
export default class LocalDataProvider extends ACommonDataProvider {
  private options: ILocalDataProviderOptions = {
    /**
     * whether the filter should be applied to all rankings regardless where they are
     */
    filterGlobally: false
  };

  private readonly reorderAll;

  constructor(private _data: any[], columns: IColumnDesc[] = [], options: ILocalDataProviderOptions & IDataProviderOptions = {}) {
    super(columns, options);
    merge(this.options, options);


    const that = this;
    this.reorderAll = function () {
      //fire for all other rankings a dirty order event, too
      const ranking = this.source;
      that.getRankings().forEach((r) => {
        if (r !== ranking) {
          r.dirtyOrder();
        }
      });
    };
  }

  get data() {
    return this._data;
  }

  /**
   * replaces the dataset rows with a new one
   * @param data
   */
  setData(data: any[]) {
    this._data = data;
    this.reorderAll();
  }

  clearData() {
    this.setData([]);
  }

  /**
   * append rows to the dataset
   * @param data
   */
  appendData(data: any[]) {
    this._data.push(...data);
    this.reorderAll();
  }

  cloneRanking(existing?: Ranking) {
    const clone = super.cloneRanking(existing);

    if (this.options.filterGlobally) {
      clone.on(Column.EVENT_FILTER_CHANGED + '.reorderAll', this.reorderAll);
    }

    return clone;
  }

  cleanUpRanking(ranking: Ranking) {
    if (this.options.filterGlobally) {
      ranking.on(Column.EVENT_FILTER_CHANGED + '.reorderAll', null);
    }
    super.cleanUpRanking(ranking);
  }

  sortImpl(ranking: Ranking): Promise<number[]> {
    if (this._data.length === 0) {
      return Promise.resolve([]);
    }
    //wrap in a helper and store the initial index
    let helper = this._data.map((r, i) => ({row: r, i}));

    //do the optional filtering step
    if (this.options.filterGlobally) {
      const filtered = this.getRankings().filter((d) => d.isFiltered());
      if (filtered.length > 0) {
        helper = helper.filter((d) => filtered.every((f) => f.filter(d.row, d.i)));
      }
    } else if (ranking.isFiltered()) {
      helper = helper.filter((d) => ranking.filter(d.row, d.i));
    }

    //sort by the ranking column
    helper.sort((a, b) => ranking.comparator(a.row, b.row, a.i, b.i));

    //store the ranking index and create an argsort version, i.e. rank 0 -> index i
    return Promise.resolve(helper.map((r) => r.i));
  }


  viewRaw(indices: number[]) {
    //filter invalid indices
    const l = this._data.length;
    return indices.map((index) => this._data[index]);
  }

  view(indices: number[]) {
    return Promise.resolve(this.viewRaw(indices));
  }

  fetch(orders: number[][]): Promise<IDataRow>[][] {
    const l = this._data.length;
    return orders.map((order) => order.map((index) => Promise.resolve({
      v: this._data[index],
      dataIndex: index
    })));
  }

  /**
   * helper for computing statistics
   * @param indices
   * @returns {{stats: (function(INumberColumn): *), hist: (function(ICategoricalColumn): *)}}
   */
  stats(indices: number[]): IStatsBuilder {
    let d: any[] = null;
    const getD = () => {
      if (d === null) {
        d = this.viewRaw(indices);
      }
      return d;
    };

    return {
      stats: (col: INumberColumn) => Promise.resolve(computeStats(getD(), indices, col.getNumber.bind(col), [0, 1])),
      hist: (col: ICategoricalColumn) => Promise.resolve(computeHist(getD(), indices, col.getCategories.bind(col), col.categories))
    };
  }


  mappingSample(col: NumberColumn): Promise<number[]> {
    const MAX_SAMPLE = 500; //at most 500 sample lines
    const l = this._data.length;
    if (l <= MAX_SAMPLE) {
      return Promise.resolve(<number[]>this._data.map(col.getRawValue.bind(col)));
    }
    //randomly select 500 elements
    const indices: number[] = [];
    for (let i = 0; i < MAX_SAMPLE; ++i) {
      let j = Math.floor(Math.random() * (l - 1));
      while (indices.indexOf(j) >= 0) {
        j = Math.floor(Math.random() * (l - 1));
      }
      indices.push(j);
    }
    return Promise.resolve(indices.map((i) => col.getRawValue(this.data[i], i)));
  }

  searchAndJump(search: string|RegExp, col: Column) {
    //case insensitive search
    search = typeof search === 'string' ? search.toLowerCase() : search;
    const f = typeof search === 'string' ? (v: string) => v.toLowerCase().indexOf((<string>search)) >= 0 : (<RegExp>search).test.bind(search);
    const indices = d3.range(this._data.length).filter((i) => f(col.getLabel(this._data[i], i)));

    this.jumpToNearest(indices);
  }

}
