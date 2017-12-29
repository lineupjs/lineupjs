import {IDataProvider} from '../provider/ADataProvider';
import {
  IGroupData, IGroupItem, Column, INumberColumn, ICategoricalColumn, ICategoricalStatistics,
  IStatistics
} from '../model';
import {IDOMRenderContext} from '../renderer';
import AFilterDialog from './dialogs/AFilterDialog';

export const RENDERER_EVENT_HOVER_CHANGED = 'hoverChanged';

export interface IFilterDialog {
  new(column: Column, header: HTMLElement, title: string, data: IDataProvider, idPrefix: string): AFilterDialog<Column>;
}

export declare type ISummaryFunction = ((col: Column, node: HTMLElement, interactive: boolean, ctx: IRankingHeaderContext)=>void);

export interface IRankingHeaderContextContainer {
  readonly idPrefix: string;
  provider: IDataProvider;

  filters: { [type: string]: IFilterDialog };
  summaries: { [type: string]: ISummaryFunction };

  statsOf(col: (INumberColumn | ICategoricalColumn) & Column): ICategoricalStatistics | IStatistics | null;

  getPossibleRenderer(col: Column): { item: { type: string, label: string }[], group: { type: string, label: string }[] };
}

export interface IRankingBodyContext extends IRankingHeaderContextContainer, IDOMRenderContext {
  isGroup(index: number): boolean;

  getGroup(index: number): IGroupData;

  getRow(index: number): IGroupItem;
}

export declare type IRankingHeaderContext = Readonly<IRankingHeaderContextContainer>;

export declare type IRankingContext = Readonly<IRankingBodyContext>;

