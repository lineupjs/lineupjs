
import {IRenderingOptions} from '../interfaces';
import {AEventDispatcher} from '../utils';
import ADataProvider from '../provider/ADataProvider';
import ICellRendererFactory from '../renderer/ICellRendererFactory';
import {IFilterDialog} from '../dialogs/AFilterDialog';
import Ranking from '../model/Ranking';
import Column from '../model/Column';
import {IRankingHeaderContext} from './engine/interfaces';
import {Selection} from 'd3';

export interface ILineUpRenderer extends AEventDispatcher {
  destroy(): void;

  update(): void;

  changeDataStorage(data: ADataProvider): void;

  scrollIntoView(length: number, index: number): void;

  fakeHover(index: number): void;

  setBodyOption(option: keyof IRenderingOptions, value: boolean): void;
}

export const RENDERER_EVENT_HOVER_CHANGED = 'hoverChanged';
export const RENDERER_EVENT_RENDER_FINISHED = 'renderFinished';

export interface IBodyRendererOptions {
  rowHeight: number;
  textHeight: number;
  groupHeight: number;
  groupPadding: number;
  rowPadding: number;
  rowBarPadding: number;
  rowBarTopPadding: number;
  rowBarBottomPadding: number;
  idPrefix: string;
  slopeWidth: number;
  columnPadding: number;
  stacked: boolean;
  animation: boolean;
  animationDuration: number;

  renderers: { [key: string]: ICellRendererFactory };

  meanLine: boolean;

  actions: { name: string, icon: string, action(v: any): void }[];

  freezeCols: number;

  /**
   * striped alterating background
   */
  striped: boolean;
}


export interface IRankingHook {
  ($node: Selection<Ranking>): void;
}


export declare type ISummaryFunction = ((col: Column, node: HTMLElement, interactive: boolean, ctx: IRankingHeaderContext)=>void);

export interface IHeaderRendererOptions {
  idPrefix: string;
  slopeWidth: number;
  columnPadding: number;
  headerHistogramHeight: number;
  headerHeight: number;
  manipulative: boolean;
  summary: boolean;

  filters: { [type: string]: IFilterDialog };
  summaries: { [type: string]: ISummaryFunction};
  linkTemplates: string[];

  searchAble(col: Column): boolean;

  sortOnLabel: boolean;

  autoRotateLabels: boolean;
  rotationHeight: number;
  rotationDegree: number;

  freezeCols: number;

  /**
   * @deprecated
   */
  rankingButtons: IRankingHook;
}
