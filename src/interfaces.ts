import {IGroupData, IGroupItem} from './model';
import Ranking from './model/Ranking';
import {IDataProvider} from './provider/ADataProvider';
import {ICellRendererFactory} from './renderer';
import {IFilterDialog, ISummaryRenderer} from './ui/interfaces';

export interface IDynamicHeight {
  defaultHeight: number;

  height(item: IGroupItem | IGroupData): number;

  padding(item: IGroupItem | IGroupData | null): number;
}

export interface ILineUpOptions {
  idPrefix: string;

  filters: { [type: string]: IFilterDialog };
  summaries: { [type: string]: ISummaryRenderer<any> };
  renderers: { [type: string]: ICellRendererFactory };

  summary: boolean;
  animation: boolean;

  groupHeight: number;
  groupPadding: number;
  rowPadding: number;
  rowHeight: number;

  levelOfDetail: (rowIndex: number) => 'high' | 'low';
  dynamicHeight: (data: (IGroupItem | IGroupData)[], ranking: Ranking) => IDynamicHeight | null;
  customRowUpdate: (row: HTMLElement, rowIndex: number) => void;

}

export interface ILineUpLike {
  readonly node: HTMLElement;
  readonly data: IDataProvider;

  dump(): any;

  destroy(): void;
}
