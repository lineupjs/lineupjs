import type { IDynamicHeight, ITaggleOptions, ILivePreviewOptions } from '../config';
import type { IGroupData, IGroupItem, Ranking } from '../model';
import type Column from '../model';
import type { ICellRendererFactory, ERenderMode } from '../renderer';
import type { IToolbarAction, IToolbarDialogAddon } from '../ui';

/**
 * builder for LineUp/Taggle instance
 */
export default class LineUpBuilder {
  protected readonly options: Partial<ITaggleOptions> = {
    renderers: {},
    toolbarActions: {},
    toolbarDialogAddons: {},
    flags: {},
  };

  /**
   * option to enable/disable animated transitions
   * @default true
   */
  animated(enable: boolean) {
    this.options.animated = enable;
    return this;
  }

  livePreviews(options: Partial<ILivePreviewOptions>) {
    this.options.livePreviews = options;
    return this;
  }

  /**
   * option to rotate labels on demand in narrow columns
   * @param rotation rotation in degrees
   * @default 0 - disabled
   */
  labelRotation(rotation: number) {
    this.options.labelRotation = rotation;
    return this;
  }

  /**
   * option to enable/disable the side panel
   * @param {boolean} enable enable flag
   * @param {boolean} collapsed whether collapsed by default
   */
  sidePanel(enable: boolean, collapsed = false) {
    this.options.sidePanel = enable;
    this.options.sidePanelCollapsed = collapsed;
    return this;
  }

  /**
   * show the sorting and grouping hierarchy indicator in the side panel
   * @param {boolean} enable enable flag
   */
  hierarchyIndicator(enable: boolean) {
    this.options.hierarchyIndicator = enable;
    return this;
  }

  /**
   * option to specify the default slope graph mode
   * @default 'item'
   */
  defaultSlopeGraphMode(mode: 'item' | 'band') {
    this.options.defaultSlopeGraphMode = mode;
    return this;
  }

  /**
   * option to enable/disable showing a summary (histogram, ...) in the header
   * @default true
   */
  summaryHeader(enable: boolean) {
    this.options.summaryHeader = enable;
    return this;
  }

  /**
   * option to enforce that the whole row is shown upon hover without overflow hidden
   * @default false
   */
  expandLineOnHover(enable: boolean) {
    this.options.expandLineOnHover = enable;
    return this;
  }

  /**
   * option to enable overview mode by default, just valid when building a Taggle instance
   * @returns {this}
   */
  overviewMode() {
    this.options.overviewMode = true;
    return this;
  }

  /**
   * option to ignore unsupported browser check - at own risk
   * @returns {this}
   */
  ignoreUnsupportedBrowser() {
    this.options.ignoreUnsupportedBrowser = true;
    return this;
  }

  /**
   * register a new renderer factory function
   * @param id the renderer id
   * @param factory factory class implementing the renderer
   */
  registerRenderer(id: string, factory: ICellRendererFactory) {
    this.options.renderers![id] = factory;
    return this;
  }

  /**
   * custom function whether the given renderer should be allowed to render the give colum in the given mode
   */
  canRender(canRender: (type: string, renderer: ICellRendererFactory, col: Column, mode: ERenderMode) => boolean) {
    this.options.canRender = canRender;
    return this;
  }

  /**
   * register another toolbar action which can be used within a model class
   * @param id toolbar id
   * @param action
   */
  registerToolbarAction(id: string, action: IToolbarAction) {
    this.options.toolbarActions![id] = action;
    return this;
  }

  /**
   * register another toolbar action which can be sued within a model class
   * @param id  dialog id
   * @param addon addon description
   */
  registerToolbarDialogAddon(id: string, addon: IToolbarDialogAddon) {
    this.options.toolbarDialogAddons![id] = addon;
    return this;
  }

  /**
   * height and padding of a row
   * @default 18 and 2
   */
  rowHeight(rowHeight: number, rowPadding = 2) {
    this.options.rowHeight = rowHeight;
    this.options.rowPadding = rowPadding;
    return this;
  }

  /**
   * height and padding of an aggregated group in pixel
   * @default 40 and 5
   */
  groupRowHeight(groupHeight: number, groupPadding = 5) {
    this.options.groupHeight = groupHeight;
    this.options.groupPadding = groupPadding;
    return this;
  }

  /**
   * custom function to compute the height of a row (group or item)
   * @param {(data: (IGroupItem | IGroupData)[], ranking: Ranking) => (IDynamicHeight | null)} callback
   */
  dynamicHeight(callback: (data: (IGroupItem | IGroupData)[], ranking: Ranking) => IDynamicHeight | null) {
    this.options.dynamicHeight = callback;
    return this;
  }

  /**
   * disables advanced ranking features (sort by, group by, sorting hierarchy, ...)
   */
  disableAdvancedRankingFeatures() {
    this.options.flags!.advancedRankingFeatures = false;
    return this;
  }

  /**
   * disables advanced model features (add combine column, data mapping, edit pattern, ...)
   */
  disableAdvancedModelFeatures() {
    this.options.flags!.advancedModelFeatures = false;
    return this;
  }

  /**
   * disables advanced ui features (change visualization, color mapping)
   */
  disableAdvancedUIFeatures() {
    this.options.flags!.advancedUIFeatures = false;
    return this;
  }

  /**
   * identifier for this LineUp instance. by default a random id is generated.
   * @default random string
   */
  instanceId(instanceId: string) {
    this.options.instanceId = instanceId;
    return this;
  }

  /**
   * option to add an additional filter (CSS selector to match or closest exist) to enable row selection, false to disable.
   * Use the filter `.lu-renderer-rank, .lu-renderer-selection` to restrict the selection to the rank and selection column.
   * @param filter whether to restrict the selection to specific columns
   * @default true all cells
   */
  selectionActivateFilter(filter: boolean | string) {
    this.options.selectionActivateFilter = filter;
    return this;
  }

  /**
   * option to enable to copy selected rows using ctrl-c
   * @param enable enable flag
   */
  copyableRows(enable: boolean) {
    this.options.copyableRows = enable;
    return this;
  }
}
