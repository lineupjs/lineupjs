import {Column, Ranking, IColumnDesc, IGroup, IndicesArray, IDataRow, IRankingDump, EAggregationState} from '../model';
import {AEventDispatcher, ISequence} from '../internal';
import {IRenderTasks} from '../renderer';

export interface IDataProviderOptions {
  columnTypes: {[columnType: string]: typeof Column};

  /**
   * allow just single selected rows
   * @default: false
   */
  singleSelection: boolean;

  /**
   * show top N rows as sample rows
   * @default 10
   */
  showTopN: number;
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

  setAggregationState(ranking: Ranking, group: IGroup, state: EAggregationState): void;

  getAggregationState(ranking: Ranking, group: IGroup): EAggregationState;

  aggregateAllOf(ranking: Ranking, aggregateAll: boolean | number | EAggregationState): void;

  getTopNAggregated(ranking: Ranking, group: IGroup): number;

  setTopNAggregated(ranking: Ranking, group: IGroup, value: number): void;

  setShowTopN(value: number): void;
  getShowTopN(): number;

  getRow(dataIndex: number): Promise<IDataRow> | IDataRow;
}



export const SCHEMA_REF = `https://lineup.js.org/develop/schema.4.0.0.json`;

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

  /**
   * custom show top N setting
   */
  showTopN?: number;
}
