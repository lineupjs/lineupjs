import ICellRendererFactory from './renderer/ICellRendererFactory';
import {IDataProvider} from './provider/ADataProvider';
import {IGroupData, IGroupItem, IRankingHeaderContext} from './ui/engine/interfaces';
import Column from './model/Column';
import {IFilterDialog} from './dialogs/AFilterDialog';
import Ranking from './model/Ranking';

export declare type ISummaryFunction = ((col: Column, node: HTMLElement, interactive: boolean, ctx: IRankingHeaderContext)=>void);


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
