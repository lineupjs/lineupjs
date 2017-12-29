import ICellRendererFactory from './renderer/ICellRendererFactory';
import {IDataProvider} from './provider/ADataProvider';
import {ISummaryFunction, IFilterDialog} from './ui/interfaces';
import Ranking from './model/Ranking';
import {IGroupData, IGroupItem} from './model';


export interface ILineUpOptions {
  idPrefix: string;

  filters: { [type: string]: IFilterDialog };
  summaries: { [type: string]: ISummaryFunction };
  renderers: { [type: string]: ICellRendererFactory };

  summary: boolean;
  animation: boolean;

  groupHeight: number;
  groupPadding: number;
  rowPadding: number;
  rowHeight: number;

  dynamicHeight?: (data: (IGroupItem | IGroupData)[], ranking: Ranking) => { defaultHeight: number, height: (item: IGroupItem | IGroupData) => number }|null;
  customRowUpdate?: (row: HTMLElement, rowIndex: number) => void;

}

export interface ILineUpLike {
  readonly node: HTMLElement;
  readonly data: IDataProvider;

  dump(): any;

  destroy(): void;
}
