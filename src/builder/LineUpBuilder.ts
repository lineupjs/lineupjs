import {IDynamicHeight, ITaggleOptions} from '../interfaces';
import {IGroupData, IGroupItem} from '../model';
import Ranking from '../model/Ranking';
import {ICellRendererFactory} from '../renderer';
import {IToolbarAction} from '../ui';

/**
 * builder for LineUp/Taggle instance
 */
export default class LineUpBuilder {
  protected readonly options: Partial<ITaggleOptions> = {
    renderers: {},
    toolbar: {}
  };

  /**
   * option to enable/disable animated transitions
   * @default true
   */
  animated(enable: boolean) {
    this.options.animated = enable;
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
  sidePanel(enable: boolean, collapsed: boolean = false) {
    this.options.sidePanel = enable;
    this.options.sidePanelCollapsed = collapsed;
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

  registerRenderer(id: string, factory: ICellRendererFactory) {
    this.options.renderers![id] = factory;
    return this;
  }

  registerToolbarAction(id: string, action: IToolbarAction) {
    this.options.toolbar![id] = action;
    return this;
  }

  /**
   * height and padding of a row
   * @default 18 and 2
   */
  rowHeight(rowHeight: number, rowPadding: number) {
    this.options.rowHeight = rowHeight;
    this.options.rowPadding = rowPadding;
    return this;
  }

  /**
   * height and padding of an aggregated group in pixel
   * @default 40 and 5
   */
  groupRowHeight(groupHeight: number, groupPadding: number) {
    this.options.groupHeight = groupHeight;
    this.options.groupPadding = groupPadding;
    return this;
  }

  /**
   * custom function to compute the height of a row (group or item)
   * @param {(data: (IGroupItem | IGroupData)[], ranking: Ranking) => (IDynamicHeight | null)} callback
   */
  dynamicHeight(callback: (data: (IGroupItem | IGroupData)[], ranking: Ranking) => (IDynamicHeight | null)) {
    this.options.dynamicHeight = callback;
    return this;
  }
}
