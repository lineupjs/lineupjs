import AEventDispatcher from '../internal/AEventDispatcher';
import {Column, IColumnDesc, IGroup, IndicesArray, IDataRow} from '../model';
import Ranking from '../model/Ranking';
import '!file-loader?name=schema.4.0.0.json!./schema.json';
import {ISequence} from '../internal/interable';
import {IRenderTasks} from './tasks';


export interface IDataProviderOptions {
  columnTypes: {[columnType: string]: typeof Column};

  /**
   * allow just single selected rows
   * default: false
   */
  singleSelection: boolean;
}

export interface IDataProvider extends AEventDispatcher {
  readonly columnTypes: {[columnType: string]: typeof Column};

  getTotalNumberOfRows(): number;

  getTaskExecutor(): IRenderTasks;

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

  getRow(dataIndex: number): Promise<IDataRow> | IDataRow;
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
