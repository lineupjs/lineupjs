import {IGroupData, IGroupItem} from './model';
import Ranking from './model/Ranking';
import {IDataProvider} from './provider';
import {ICellRendererFactory} from './renderer';
import {IToolbarAction} from './ui';

/**
 * custom height implementation logic
 */
export interface IDynamicHeight {
  /**
   * default height for a row for optimized styling
   */
  defaultHeight: number;

  /**
   * returns the height in pixel for the given row
   * @param {IGroupItem | IGroupData} item the item to show
   * @returns {number} its height in pixel
   */
  height(item: IGroupItem | IGroupData): number;

  /**
   * returns the padding in pixel after the given row
   * @param {IGroupItem | IGroupData | null} item item to show
   * @returns {number} its padding in pixel
   */
  padding(item: IGroupItem | IGroupData | null): number;
}

export interface ILineUpOptions {
  /**
   * id prefix used for all generated html ids
   * @default randomly generated
   */
  idPrefix: string;

  /**
   * option to enable/disable showing a summary (histogram, ...) in the header
   * @default true
   */
  summary: boolean;
  /**
   * option to enable/disable animated transitions
   * @default true
   */
  animation: boolean;
  /**
   * option to enforce that the whole row is shown upon hover without overflow hidden
   * @default false
   */
  wholeHover: boolean;
  /**
   * option to enable/disable the panel
   * @default true
   */
  panel: boolean;
  /**
   * option to specify whether the panel should be collapsed by default
   * @default false
   */
  panelCollapsed: boolean;
  /**
   * option to specify the default slope graph mode
   * @default 'item'
   */
  defaultSlopeGraphMode: 'item' | 'band';

  /**
   * height of a row
   * @default 18
   */
  rowHeight: number;
  /**
   * padding between two rows
   * @default 2
   */
  rowPadding: number;
  /**
   * height of an aggregated group in pixel
   * @default 40
   */
  groupHeight: number;
  /**
   * padding between two groups in pixel
   * @default 5
   */
  groupPadding: number;

  /**
   * custom function to compute the level of detail for a row
   * @param {number} rowIndex the current row index to be rendered
   * @returns {"high" | "low"}
   */
  levelOfDetail: (rowIndex: number) => 'high' | 'low';
  /**
   * custom function to compute the height of a row (group or item)
   * @param {(IGroupItem | IGroupData)[]} data the data to render
   * @param {Ranking} ranking the ranking of the data
   * @returns {IDynamicHeight | null} the height compute function or null to use the default
   */
  dynamicHeight: (data: (IGroupItem | IGroupData)[], ranking: Ranking) => IDynamicHeight | null;
  /**
   * custom function to be called when updating a HTML row
   * @param {HTMLElement} row node element to be updated
   * @param {number} rowIndex row index to be rendered in the row
   */
  customRowUpdate: (row: HTMLElement, rowIndex: number) => void;

  /**
   * register custom toolbar actions
   */
  toolbar: { [key: string]: IToolbarAction };
  /**
   * register custom renderer factories
   */
  renderers: { [type: string]: ICellRendererFactory };
}

export interface ITaggleOptions extends ILineUpOptions {
  /**
   * whether the overview mode is enabled by default
   * @default false
   */
  overviewEnabled: boolean;
}

export interface ILineUpLike {
  readonly node: HTMLElement;
  readonly data: IDataProvider;

  dump(): any;

  destroy(): void;
}
