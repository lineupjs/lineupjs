import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {Column, ICategoricalColumn, IGroupData, IGroupItem, INumberColumn} from '../model';
import {IDataProvider} from '../provider/ADataProvider';
import {IRenderContext} from '../renderer';
import AFilterDialog from './dialogs/AFilterDialog';
import {IToolbarAction} from './toolbar';

export const RENDERER_EVENT_HOVER_CHANGED = 'hoverChanged';

export interface IFilterDialog {
  new(column: Column, header: HTMLElement, title: string, data: IDataProvider, idPrefix: string): AFilterDialog<Column>;
}

export interface ISummaryRenderer<T extends Column> {
  new(col: T, node: HTMLElement, interactive: boolean): ISummaryUpdater;

}

export interface ISummaryUpdater {
  update(ctx: IRankingHeaderContext): void;
}


export interface IRankingHeaderContextContainer {
  readonly idPrefix: string;
  readonly document: Document;
  provider: IDataProvider;

  toolbar: { [key: string]: IToolbarAction };
  summaries: { [type: string]: ISummaryRenderer<any> };

  statsOf(col: (INumberColumn | ICategoricalColumn) & Column): ICategoricalStatistics | IStatistics | null;

  getPossibleRenderer(col: Column): { item: { type: string, label: string }[], group: { type: string, label: string }[] };
}

export interface IRankingBodyContext extends IRankingHeaderContextContainer, IRenderContext {
  isGroup(index: number): boolean;

  getGroup(index: number): IGroupData;

  getRow(index: number): IGroupItem;
}

export declare type IRankingHeaderContext = Readonly<IRankingHeaderContextContainer>;

export declare type IRankingContext = Readonly<IRankingBodyContext>;

