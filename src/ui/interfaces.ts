import Column, {ICategoricalStatistics, IStatistics} from '../model/Column';
import {IDataProvider} from '../provider/ADataProvider';
import {IFilterDialog} from '../dialogs/AFilterDialog';
import {ICategoricalColumn} from '../model/ICategoricalColumn';
import {INumberColumn} from '../model/INumberColumn';
import {IGroupData, IGroupItem} from '../model/interfaces';
import {IDOMRenderContext} from '../renderer/RendererContexts';

export const RENDERER_EVENT_HOVER_CHANGED = 'hoverChanged';


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

