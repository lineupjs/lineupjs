import {ITaggleOptions} from './interfaces';
import {renderers} from './renderer';
import {toolbarActions} from './ui';

/** number of bins before switching to dense mode
 */
export const DENSE_HISTOGRAM = 19;
export const MIN_LABEL_WIDTH = 30;
/**
 * number of milliseconds to wait before a hovered canvas row will be replaced with a DOM one
 * @type {number}
 */
export const HOVER_DELAY_SHOW_DETAIL = 500;

export function defaultOptions(): ITaggleOptions {
  const idPrefix = `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`; //generate a random string with length3;
  return {
    idPrefix,
    toolbar: Object.assign({}, toolbarActions),
    renderers: Object.assign({}, renderers),

    summaryHeader: true,
    animated: true,
    expandLineOnHover: false,
    sidePanel: true,
    sidePanelCollapsed: false,
    defaultSlopeGraphMode: 'item',
    overviewMode: false,

    rowHeight: 18,
    groupHeight: 40,
    groupPadding: 5,
    rowPadding: 2,

    levelOfDetail: () => 'high',
    customRowUpdate: () => undefined,
    dynamicHeight: () => null
  };
}
