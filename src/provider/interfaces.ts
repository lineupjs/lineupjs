import {ICategoricalStatistics, IStatistics} from '../internal';
import AEventDispatcher from '../internal/AEventDispatcher';
import {Column, IColumnDesc, IGroup, INumberColumn, IndicesArray, ISetColumn} from '../model';
import Ranking from '../model/Ranking';
import '!file-loader?name=schema.4.0.0.json!./schema.json';
import {ISequence} from '../internal/interable';


export interface IStatsBuilder {
  stats(col: INumberColumn, bins?: number): Promise<IStatistics> | IStatistics;

  hist(col: ISetColumn): Promise<ICategoricalStatistics> | ICategoricalStatistics;
}

export interface IDataProviderOptions {
  columnTypes: {[columnType: string]: typeof Column};

  /**
   * allow multiple selected rows
   * default: true
   */
  multiSelection: boolean;
}

export interface IDataProvider extends AEventDispatcher {
  readonly columnTypes: {[columnType: string]: typeof Column};

  getTotalNumberOfRows(): number;

  takeSnapshot(col: Column): void;

  selectAllOf(ranking: Ranking): void;

  getSelection(): number[];

  setSelection(dataIndices: IndicesArray): void;

  toggleSelection(i: number, additional?: boolean): boolean;

  isSelected(i: number): boolean;

  removeRanking(ranking: Ranking): void;

  ensureOneRanking(): void;

  find(id: string): Column | null;

  clone(col: Column): Column;

  create(desc: IColumnDesc): Column | null;

  toDescRef(desc: IColumnDesc): any;

  fromDescRef(ref: any): IColumnDesc;

  mappingSample(col: Column): Promise<ISequence<number>> | ISequence<number>;

  searchAndJump(search: string | RegExp, col: Column): void;

  getRankings(): Ranking[];

  getFirstRanking(): Ranking | null;
  getLastRanking(): Ranking;

  getColumns(): IColumnDesc[];

  isAggregated(ranking: Ranking, group: IGroup): boolean;

  aggregateAllOf(ranking: Ranking, aggregateAll: boolean | number): void;

  getTopNAggregated(ranking: Ranking, group: IGroup): number;

  setTopNAggregated(ranking: Ranking, group: IGroup, value: number): void;
}



export const SCHEMA_REF = `https://lineup.js.org/develop/schema.4.0.0.json`;

export interface IColumnDump {
  id: string;
  width?: number;
  desc: any;
  label?: string;
  renderer?: string;
  /**
   * @deprecated
   */
  rendererType?: string;
  groupRenderer?: string;
  summaryRenderer?: string;

  // type specific
  [key: string]: any;
}

export interface IRankingDump {
  /**
   * columsn of this ranking
   */
  columns?: IColumnDump[];

  /**
   * sort criteria
   */
  sortCriteria?: {asc: boolean, sortBy: string}[];

  /**
   * group sort criteria
   */
  groupSortCriteria?: {asc: boolean, sortBy: string}[];

  /**
   * uids of group columns
   */
  groupColumns?: string[];

  /**
   * compatability
   * @deprecated
   */
  sortColumn?: {sortBy: string, asc: boolean};
}

export interface IDataProviderDump {
  '$schema'?: string;
  /**
   * base for generating new uids
   */
  uid?: number;

  /**
   * current selection
   */
  selection?: number[];

  /**
   * list of aggregated group paths
   */
  aggregations?: string[] | {[key: string]: number};
  /**
   * ranking dumps
   */
  rankings?: IRankingDump[];
}
