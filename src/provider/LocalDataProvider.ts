/**
 * Created by sam on 04.11.2016.
 */

import Column, {IColumnDesc} from '../model/Column';
import {INumberColumn} from '../model/INumberColumn';
import Ranking from '../model/Ranking';
import {ICategoricalColumn} from '../model/ICategoricalColumn';
import {IDataProviderOptions, IDataRow, IStatsBuilder} from './ADataProvider';
import ACommonDataProvider from './ACommonDataProvider';
import {computeHist, computeStats} from './math';
import {defaultGroup, IGroup, IOrderedGroup} from '../model/Group';
import {IGroupData} from '../ui/engine/interfaces';


export interface ILocalDataProviderOptions {
  /**
   * whether the filter should be applied to all rankings regardless where they are
   * default: false
   */
  filterGlobally: boolean;
  /**
   * jump to search results such that they are visible
   * default: false
   */
  jumpToSearchResult: boolean;

  /**
   * the maximum number of nested sorting criteria
   */
  maxNestedSortingCriteria: number;
  maxGroupColumns: number;
}

/**
 * a data provider based on an local array
 */
export default class LocalDataProvider extends ACommonDataProvider {
  private options: ILocalDataProviderOptions = {
    /**
     * whether the filter should be applied to all rankings regardless where they are
     */
    filterGlobally: false,

    jumpToSearchResult: false,

    maxNestedSortingCriteria: 1,
    maxGroupColumns: 1
  };

  private readonly reorderAll: () => void;

  constructor(private _data: any[], columns: IColumnDesc[] = [], options: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {}) {
    super(columns, options);
    Object.assign(this.options, options);


    const that = this;
    this.reorderAll = function (this: { source: Ranking }) {
      //fire for all other rankings a dirty order event, too
      const ranking = this.source;
      that.getRankings().forEach((r) => {
        if (r !== ranking) {
          r.dirtyOrder();
        }
      });
    };
  }


  protected getMaxGroupColumns() {
    return this.options.maxGroupColumns;
  }

  protected getMaxNestedSortingCriteria() {
    return this.options.maxNestedSortingCriteria;
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
      clone.on(`${Column.EVENT_FILTER_CHANGED}.reorderAll`, this.reorderAll);
    }

    return clone;
  }

  cleanUpRanking(ranking: Ranking) {
    if (this.options.filterGlobally) {
      ranking.on(`${Column.EVENT_FILTER_CHANGED}.reorderAll`, null);
    }
    super.cleanUpRanking(ranking);
  }

  sortImpl(ranking: Ranking): IOrderedGroup[] {
    if (this._data.length === 0) {
      return [];
    }
    //wrap in a helper and store the initial index
    let helper = this._data.map((r, i) => ({v: r, dataIndex: i, group: <IGroup | null>null}));

    //do the optional filtering step
    if (this.options.filterGlobally) {
      const filtered = this.getRankings().filter((d) => d.isFiltered());
      if (filtered.length > 0) {
        helper = helper.filter((d) => filtered.every((f) => f.filter(d.v, d.dataIndex)));
      }
    } else if (ranking.isFiltered()) {
      helper = helper.filter((d) => ranking.filter(d.v, d.dataIndex));
    }

    if (helper.length === 0) {
      return [];
    }

    //create the groups for each row
    helper.forEach((r) => r.group = ranking.grouper(r.v, r.dataIndex) || defaultGroup);
    if ((new Set<string>(helper.map((r) => r.group!.name))).size === 1) {
      const group = helper[0].group;
      //no need to split
      //sort by the ranking column
      helper.sort((a, b) => ranking.comparator(a.v, b.v, a.dataIndex, b.dataIndex));

      //store the ranking index and create an argsort version, i.e. rank 0 -> index i
      const order = helper.map((r) => r.dataIndex);
      return [Object.assign({order}, group!)];
    }
    //sort by group and within by order
    helper.sort((a, b) => {
      const ga = a.group!;
      const gb = b.group!;
      if (ga.name !== gb.name) {
        return ga.name.toLowerCase().localeCompare(gb.name.toLowerCase());
      }
      return ranking.comparator(a.v, b.v, a.dataIndex, b.dataIndex);
    });
    //iterate over groups and create within orders
    const groups: (IOrderedGroup&IGroupData)[] = [Object.assign({order: [], rows: []}, helper[0].group!)];
    let group = groups[0];
    helper.forEach((row) => {
      const rowGroup = row.group!;
      if (rowGroup.name === group.name) {
        group.order.push(row.dataIndex);
        group.rows.push(row);
      } else { // change in groups
        group = Object.assign({order: [row.dataIndex], rows: [row]}, rowGroup);
        groups.push(group);
      }
    });

    // sort groups
    groups.sort((a,b) => ranking.groupComparator(a, b));

    return groups;
  }


  viewRaw(indices: number[]) {
    //filter invalid indices
    return indices.map((index) => this._data[index]);
  }

  view(indices: number[]) {
    return this.viewRaw(indices);
  }

  fetch(orders: number[][]): IDataRow[][] {
    return orders.map((order) => order.map((index) => ({
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
    let d: any[] | null = null;
    const getD = () => {
      if (d === null) {
        d = this.viewRaw(indices);
      }
      return d;
    };

    return {
      stats: (col: INumberColumn&Column) => computeStats(getD(), indices, col.getNumber.bind(col), col.isMissing.bind(col), [0, 1]),
      hist: (col: ICategoricalColumn&Column) => computeHist(getD(), indices, col.getCategories.bind(col), col.categories)
    };
  }


  mappingSample(col: INumberColumn & Column): number[] {
    const MAX_SAMPLE = 500; //at most 500 sample lines
    const l = this._data.length;
    if (l <= MAX_SAMPLE) {
      return <number[]>this._data.map(col.getRawNumber.bind(col));
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
    return indices.map((i) => col.getRawNumber(this.data[i], i));
  }

  searchAndJump(search: string | RegExp, col: Column) {
    //case insensitive search
    search = typeof search === 'string' ? search.toLowerCase() : search;
    const f = typeof search === 'string' ? (v: string) => v.toLowerCase().indexOf((<string>search)) >= 0 : (<RegExp>search).test.bind(search);
    const indices = <number[]>[];
    for (let i = 0; i < this._data.length; ++i) {
      if (f(col.getLabel(this._data[i], i))) {
        indices.push(i);
      }
    }
    this.jumpToNearest(indices);
  }

}
