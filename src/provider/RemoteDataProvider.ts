/**
 * Created by sam on 04.11.2016.
 */

import {IColumnDesc, Ranking, Column, createRankDesc} from '../model';
import {IStatsBuilder} from './ADataProvider';
import ACommonDataProvider from './ACommonDataProvider';
/**
 * interface what the server side has to provide
 */
export interface IServerData {
  /**
   * sort the dataset by the given description
   * @param desc
   */
  sort(desc: any): Promise<number[]>;
  /**
   * returns a slice of the data array identified by a list of indices
   * @param indices
   */
  view(indices: number[]): Promise<any[]>;
  /**
   * returns a sample of the values for a given column
   * @param column
   */
  mappingSample(column: any): Promise<number[]>;
  /**
   * return the matching indices matching the given arguments
   * @param search
   * @param column
   */
  search(search: string|RegExp, column: any): Promise<number[]>;

  stats(indices: number[]): IStatsBuilder;
}

/**
 * a remote implementation of the data provider
 */
export default class RemoteDataProvider extends ACommonDataProvider {

  /**
   * the local ranking orders
   * @type {{}}
   */
  private ranks: any = {};

  constructor(private server: IServerData, columns: IColumnDesc[] = [], options: any = {}) {
    super(columns, options);
  }

  protected rankAccessor(row: any, id: string, desc: IColumnDesc, ranking: Ranking) {
    return this.ranks[ranking.id][row._index] || 0;
  }

  cloneRanking(existing?: Ranking) {
    var id = this.nextRankingId();
    if (existing) { //copy the ranking of the other one
      //copy the ranking
      this.ranks[id] = this.ranks[existing.id];
    }
    var r = new Ranking(id);
    r.push(this.create(createRankDesc()));

    return r;
  }

  cleanUpRanking(ranking: Ranking) {
    //delete all stored information
    delete this.ranks[ranking.id];
  }

  sort(ranking: Ranking): Promise<number[]> {
    //generate a description of what to sort
    var desc = ranking.toSortingDesc((desc) => desc.column);
    //use the server side to sort
    return this.server.sort(desc).then((argsort) => {
      //store the result
      this.ranks[ranking.id] = argsort;
      return argsort;
    });
  }

  view(argsort: number[]) {
    return this.server.view(argsort).then((view) => {
      //enhance with the data index
      view.forEach((d, i) => d._index = argsort[i]);
      return view;
    });
  }

  mappingSample(col: Column): Promise<number[]> {
    return this.server.mappingSample((<any>col.desc).column);
  }

  searchSelect(search: string|RegExp, col: Column) {
    this.server.search(search, (<any>col.desc).column).then((indices) => {
      this.setSelection(indices);
    });
  }

  stats(indices: number[]) {
    return this.server.stats(indices);
  }
}
