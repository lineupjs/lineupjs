import {ICategoricalStatistics, IStatistics} from '../internal';
import AEventDispatcher from '../internal/AEventDispatcher';
import {Column, ICategoricalColumn, IColumnDesc, IGroup, INumberColumn} from '../model';
import Ranking from '../model/Ranking';


export interface IStatsBuilder {
  stats(col: INumberColumn): Promise<IStatistics> | IStatistics;

  hist(col: ICategoricalColumn): Promise<ICategoricalStatistics> | ICategoricalStatistics;
}

export interface IDataProviderOptions {
  columnTypes: { [columnType: string]: typeof Column };

  /**
   * allow multiple selected rows
   * default: true
   */
  multiSelection: boolean;
}

export interface IDataProvider extends AEventDispatcher {
  readonly columnTypes: { [columnType: string]: typeof Column };

  getTotalNumberOfRows(): number;

  takeSnapshot(col: Column): void;

  selectAllOf(ranking: Ranking): void;

  getSelection(): number[];

  setSelection(dataIndices: number[]): void;

  toggleSelection(i: number, additional?: boolean): boolean;

  isSelected(i: number): boolean;

  removeRanking(ranking: Ranking): void;

  ensureOneRanking(): void;

  find(id: string): Column | null;

  clone(col: Column): Column;

  create(desc: IColumnDesc): Column | null;

  toDescRef(desc: IColumnDesc): any;

  fromDescRef(ref: any): IColumnDesc;

  mappingSample(col: Column): Promise<number[]> | number[];

  searchAndJump(search: string | RegExp, col: Column): void;

  getRankings(): Ranking[];

  getFirstRanking(): Ranking | null;
  getLastRanking(): Ranking;

  getColumns(): IColumnDesc[];

  isAggregated(ranking: Ranking, group: IGroup): boolean;

  aggregateAllOf(ranking: Ranking, aggregateAll: boolean): void;
}

