import {renderers} from './renderer/renderers';
import {toolbarActions} from './ui/toolbar';
import {Column, Ranking, IGroupData, IGroupItem} from './model';
import {IDataProvider} from './provider';
import {ICellRendererFactory, ERenderMode} from './renderer';
import {IToolbarAction, IToolbarDialogAddon} from './ui';

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

export interface ILineUpFlags {
  /**
   * optimization flag to disable frozen columns for optimizing rendering performance
   * @default true
   */
  disableFrozenColumns: boolean;
  /**
   * flag whether advanced ranking features are enabled
   * @default true
   */
  advancedRankingFeatures: boolean;
  /**
   * flag whether advanced model features are enabled
   * @default true
   */
  advancedModelFeatures: boolean;
  /**
   * flag whether advanced UI features are enabled
   * @default true
   */
  advancedUIFeatures: boolean;
}

export interface ILineUpOptions {
  /**
   * option to enable/disable showing a summary (histogram, ...) in the header
   * @default true
   */
  summaryHeader: boolean;
  /**
   * option to enable/disable animated transitions
   * @default true
   */
  animated: boolean;
  /**
   * option to enforce that the whole row is shown upon hover without overflow hidden
   * @default false
   */
  expandLineOnHover: boolean;
  /**
   * option to enable/disable the panel
   * @default true
   */
  sidePanel: boolean;
  /**
   * option to specify whether the panel should be collapsed by default
   * @default false
   */
  sidePanelCollapsed: boolean;
  /**
   * show the sorting and grouping hierarchy indicators in the side panel
   * @default true
   */
  hierarchyIndicator: boolean;

  /**
   * option to specify the default slope graph mode
   * @default 'item'
   */
  defaultSlopeGraphMode: 'item' | 'band';

  /**
   * how many degrees should a label be rotated in case of narrow columns
   * @default 0 no rotation
   */
  labelRotation: number;

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
   * register custom toolbar actions and dialog addons
   */
  toolbar: {[key: string]: IToolbarAction | IToolbarDialogAddon};
  /**
   * register custom renderer factories
   */
  renderers: {[type: string]: ICellRendererFactory};

  /**
   * custom check whether a given renderer can render the given column in the given mode
   */
  canRender: (type: string, renderer: ICellRendererFactory, col: Column, mode: ERenderMode) => boolean;

  /**
   * custom flags for optimization
   */
  flags: Partial<ILineUpFlags>;

  /**
   * ignore incompatible browser and always show (on own risk)
   * @default false
   */
  ignoreUnsupportedBrowser: boolean;
}

export interface ITaggleOptions extends ILineUpOptions {
  /**
   * whether the overview mode is enabled by default
   * @default false
   */
  overviewMode: boolean;
}

export interface ILineUpLike {
  readonly node: HTMLElement;
  readonly data: IDataProvider;

  dump(): any;

  destroy(): void;
}


export function defaultOptions(): ITaggleOptions {
  return {
    toolbar: Object.assign({}, toolbarActions),
    renderers: Object.assign({}, renderers),
    canRender: () => true,

    labelRotation: 0,
    summaryHeader: true,
    animated: true,
    expandLineOnHover: false,
    sidePanel: true,
    sidePanelCollapsed: false,
    hierarchyIndicator: true,
    defaultSlopeGraphMode: 'item',
    overviewMode: false,

    rowHeight: 18,
    groupHeight: 40,
    groupPadding: 5,
    rowPadding: 2,

    levelOfDetail: () => 'high',
    customRowUpdate: () => undefined,
    dynamicHeight: () => null,

    flags: {
      disableFrozenColumns: true, //disable by default for speed navigator.userAgent.includes('Firefox/52') // disable by default in Firefox ESR 52
      advancedRankingFeatures: true,
      advancedModelFeatures: true,
      advancedUIFeatures: true
    },

    ignoreUnsupportedBrowser: false
  };
}
