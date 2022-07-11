import { renderers } from './renderer/renderers';
import { toolbarDialogAddons, toolbarActions } from './ui/toolbar';
import type { Column, Ranking, IGroupData, IGroupItem } from './model';
import type { IDataProvider } from './provider';
import type { ICellRendererFactory, ERenderMode } from './renderer';
import type { IToolbarAction, IToolbarDialogAddon } from './ui';

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

export interface IToolbarLookup<T> {
  [key: string]: T;
}

export interface ILivePreviewOptions {
  search: boolean;
  filter: boolean;
  vis: boolean;
  sort: boolean;
  group: boolean;
  groupSort: boolean;
  colorMapping: boolean;
  dataMapping: boolean;
  reduce: boolean;
  rename: boolean;
  cutOff: boolean;
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
   * flag whether dialogs should confirm or cancel on clicking the background
   * @default cancel
   */
  onDialogBackgroundClick: 'cancel' | 'confirm';

  /**
   * flag whether to shows filter previews as soon as the user changes the filter in the dialog
   * @default {search: true,filter: true, vis: true,sort: true, group: true, groupSort: true, colorMapping: true}
   */
  livePreviews: Partial<ILivePreviewOptions>;

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
  toolbarActions: IToolbarLookup<IToolbarAction>;
  toolbarDialogAddons: IToolbarLookup<IToolbarDialogAddon>;

  /**
   * hook for postprocess the toolbar actions for a column
   */
  resolveToolbarActions: (col: Column, keys: string[], lookup: IToolbarLookup<IToolbarAction>) => IToolbarAction[];
  /**
   * hook for postprocess the toolbar dialog addons for a column
   */
  resolveToolbarDialogAddons: (
    col: Column,
    keys: string[],
    lookup: IToolbarLookup<IToolbarDialogAddon>
  ) => IToolbarDialogAddon[];

  /**
   * register custom renderer factories
   */
  renderers: { [type: string]: ICellRendererFactory };

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

  /**
   * option to enable to copy selected rows using ctrl-c
   * @default false
   */
  copyableRows: boolean;

  /**
   * identifier for this LineUp instance. by default a random id is generated.
   * @default random string
   */
  instanceId: string;
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

function resolveToolbarActions(col: Column, keys: string[], lookup: IToolbarLookup<IToolbarAction>) {
  const actions: IToolbarAction[] = [];

  keys.forEach((key) => {
    if (lookup.hasOwnProperty(key)) {
      actions.push(lookup[key]);
    } else {
      console.warn(`cannot find toolbar action of type: "${col.desc.type}" with key "${key}"`);
    }
  });
  return actions;
}

function resolveToolbarDialogAddons(col: Column, keys: string[], lookup: IToolbarLookup<IToolbarDialogAddon>) {
  const actions: IToolbarDialogAddon[] = [];

  keys.forEach((key) => {
    if (lookup.hasOwnProperty(key)) {
      actions.push(lookup[key]);
    } else {
      console.warn(`cannot find toolbar dialog addon of type: "${col.desc.type}" with key "${key}"`);
    }
  });
  return actions;
}

export function defaultOptions(): ITaggleOptions {
  return {
    toolbarActions,
    toolbarDialogAddons,
    resolveToolbarActions,
    resolveToolbarDialogAddons,
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

    livePreviews: {
      search: true,
      filter: true,
      vis: true,
      sort: true,
      group: true,
      groupSort: true,
      colorMapping: true,
    },
    onDialogBackgroundClick: 'confirm',

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
      advancedUIFeatures: true,
    },

    ignoreUnsupportedBrowser: false,
    copyableRows: true,

    instanceId: Math.random().toString(36).slice(-8).substring(0, 3), // generate a random string with length 3
  };
}
