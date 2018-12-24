import {ITaggleOptions} from './interfaces';
import {renderers} from './renderer/internal';
import {toolbarActions} from './ui';

/**
 * number of bins before switching to dense mode
 * @internal
 */
export const DENSE_HISTOGRAM = 19;
/**
 * minimal witdh of a column to show the label in the header
 * @internal
 */
export const MIN_LABEL_WIDTH = 30;
/**
 * number of milliseconds to wait before a hovered canvas row will be replaced with a DOM one
 * @type {number}
 * @internal
 */
export const HOVER_DELAY_SHOW_DETAIL = 500;


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
