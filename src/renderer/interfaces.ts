import {IValueStatistics, IStatistics, ICategoricalStatistics, IDateStatistics, IAdvancedBoxPlotData} from '../internal/math';
import {IDataRow, INumberColumn, IGroupMeta, IDateColumn, ISetColumn, IOrderedGroup, IDatesColumnDesc} from '../model';
import Column from '../model/Column';
import {IDataProvider} from '../provider';
import DialogManager from '../ui/dialogs/DialogManager';
import {ISequence} from '../internal/interable';
import {IAbortAblePromise} from 'lineupengine';

export interface IImposer {
  color?(row: IDataRow | null, valueHint?: number): string | null;
}

export declare type IRenderCallback = (ctx: CanvasRenderingContext2D) => void;

export declare type IColumnStats = null | IValueStatistics | PromiseLike<IValueStatistics>;

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface ICellRenderer {
  /**
   * template as a basis for the update
   */
  readonly template: string;

  /**
   * update a given node (create using the template) with the given data
   * @param node the node to update
   * @param d the data item
   * @param i the order relative index
   * @param group the group this row is part of
   */
  update(node: HTMLElement, d: IDataRow, i: number, group: IOrderedGroup, meta: IGroupMeta): void | IAbortAblePromise<void> | null;

  /**
   * render a low detail canvas row
   * @return true if a dom element is needed
   */
  render?(ctx: CanvasRenderingContext2D, d: IDataRow, i: number, group: IOrderedGroup, meta: IGroupMeta): void | IAbortAblePromise<IRenderCallback> | boolean | null;
}

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface IGroupCellRenderer {
  /**
   * template as a basis for the update
   */
  readonly template: string;

  /**
   * update a given node (create using the template) with the given data
   * @param node the node to update
   * @param group the group to render
   */
  update(node: HTMLElement, group: IOrderedGroup, meta: IGroupMeta): void | IAbortAblePromise<void> | null;
}

export interface ISummaryRenderer {
  /**
   * template as a basis for the update
   */
  readonly template: string;

  update(node: HTMLElement): void | IAbortAblePromise<void> | null;
}


export interface IRenderTasks {
  rankingBoxPlotStats(col: Column & INumberColumn, render: (ranking: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData) => void): IAbortAblePromise<void>;
  rankingNumberStats(col: Column & INumberColumn, render: (ranking: IStatistics, data: IStatistics) => void): IAbortAblePromise<void>;
  rankingCategoricalStats(col: Column & ISetColumn, render: (ranking: ICategoricalStatistics, data: ICategoricalStatistics) => void): IAbortAblePromise<void>;
  rankingDateStats(col: Column & IDateColumn, render: (ranking: IDateStatistics, data: IDateStatistics) => void): IAbortAblePromise<void>;

  groupRows<T>(col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T, render: (value: T) => void): IAbortAblePromise<void>;
  groupExampleRows<T>(col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T, render: (value: T) => void): IAbortAblePromise<void>;

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, render: (group: IAdvancedBoxPlotData, ranking: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData) => void): IAbortAblePromise<void>;
  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, render: (group: IStatistics, ranking: IStatistics, data: IStatistics) => void): IAbortAblePromise<void>;
  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup, render: (group: ICategoricalStatistics, ranking: ICategoricalStatistics, data: ICategoricalStatistics) => void): IAbortAblePromise<void>;
  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup, render: (group: IDateStatistics, ranking: IDateStatistics, data: IDateStatistics) => void): IAbortAblePromise<void>;
}

/**
 * context for rendering, wrapped as an object for easy extensibility
 */
export interface IRenderContext {
  readonly tasks: IRenderTasks;
  /**
   * render a column
   * @param col
   */
  renderer(col: Column, imposer?: IImposer): ICellRenderer;

  /**
   * render a column
   * @param col
   */
  groupRenderer(col: Column, imposer?: IImposer): IGroupCellRenderer;

  summaryRenderer(co: Column, interactive: boolean, imposer?: IImposer): ISummaryRenderer;

  /**
   * prefix used for all generated id names
   */
  readonly idPrefix: string;

  asElement(html: string): HTMLElement;

  colWidth(col: Column): number;

  readonly provider: IDataProvider;
  readonly dialogManager: DialogManager;
}

export enum ERenderMode {
  CELL, GROUP, SUMMARY
}


export interface ICellRendererFactory {
  readonly title: string;
  readonly groupTitle?: string;
  readonly summaryTitle?: string;

  canRender(col: Column, mode: ERenderMode): boolean;

  create?(col: Column, context: IRenderContext, imposer?: IImposer): ICellRenderer;

  createGroup?(col: Column, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer;

  createSummary?(col: Column, context: IRenderContext, interactive: boolean, imposer?: IImposer): ISummaryRenderer;
}


export default IRenderContext;
