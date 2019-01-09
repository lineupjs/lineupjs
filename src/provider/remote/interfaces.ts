import {IColumnDump, IOrderedGroup, Ranking} from '../../model';
import {IDateStatistics, ICategoricalStatistics, IAdvancedBoxPlotData, IStatistics} from '../../internal';


export interface IServerRankingDump {
  filter: IColumnDump[];
  sortCriteria: {asc: boolean, col: IColumnDump}[];
  groupCriteria: IColumnDump[];
  groupSortCriteria: {asc: boolean, col: IColumnDump}[];
}

export function toRankingDump(ranking: Ranking, toDescRef: (desc: any) => any) {
  return {
    filter: ranking.flatColumns.filter((d) => d.isFiltered()).map((d) => d.dump(toDescRef)),
    sortCriteria: ranking.getSortCriteria().map((d) => ({asc: d.asc, col: d.col.dump(toDescRef)})),
    groupCriteria: ranking.getGroupCriteria().map((d) => d.dump(toDescRef)),
    groupSortCriteria: ranking.getGroupSortCriteria().map((d) => ({asc: d.asc, col: d.col.dump(toDescRef)}))
  };
}

export interface IMultiNumberStatistics {
  raw: IStatistics;
  rawBoxPlot: IAdvancedBoxPlotData;
  normalized: IStatistics;
  normalizedBoxPlot: IAdvancedBoxPlotData;
}

export declare type IRemoteStatistics = IDateStatistics | ICategoricalStatistics | IMultiNumberStatistics;

/**
 * interface what the server side has to provide
 */
export interface IServerData {
  /**
   * total number of rows
   */
  readonly totalNumberOfRows: number;

  /**
   * sort the dataset by the given description
   * @param ranking
   */
  sort(ranking: IServerRankingDump): Promise<{groups: IOrderedGroup[], maxDataIndex: number}>;

  /**
   * returns a slice of the data array identified by a list of indices
   * @param indices
   */
  view(indices: number[]): Promise<any[]>;

  /**
   * returns a sample of the values for a given column
   * @param column
   */
  mappingSample(column: IColumnDump): Promise<number[]>;

  /**
   * return the matching indices matching the given arguments
   * @param search
   * @param column
   */
  search(search: string | RegExp, column: IColumnDump): Promise<number[]>;

  /**
   * compute the data statistics for the given columns
   */
  computeDataStats(columns: IColumnDump[]): Promise<IRemoteStatistics[]>;
  computeRankingStats(ranking: IServerRankingDump, columns: IColumnDump[]): Promise<IRemoteStatistics[]>;
  computeGroupStats(ranking: IServerRankingDump, group: string, columns: IColumnDump[]): Promise<IRemoteStatistics[]>;

}

