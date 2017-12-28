import ICellRendererFactory from './renderer/ICellRendererFactory';
import {IDataProvider} from './provider/ADataProvider';
import {ISummaryFunction} from './ui/interfaces';
import {IFilterDialog} from './dialogs/AFilterDialog';
import Ranking from './model/Ranking';
import {IGroupData, IGroupItem} from './model';


export interface ILineUpConfig {
  idPrefix: string;

  filters: { [type: string]: IFilterDialog };
  summaries: { [type: string]: ISummaryFunction };
  renderers: { [type: string]: ICellRendererFactory };

  summary: boolean;
  animation: boolean;

  columnPadding: number;
  groupHeight: number;
  groupPadding: number;
  rowPadding: number;
  rowHeight: number;

  dynamicHeight?: (data: (IGroupItem | IGroupData)[], ranking: Ranking) => { defaultHeight: number, height: (item: IGroupItem | IGroupData) => number };
  customRowUpdate?: (row: HTMLElement, rowIndex: number) => void;

}

export interface ILineUpLike {
  data: IDataProvider;

  dump(): any;
}
