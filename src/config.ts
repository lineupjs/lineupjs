import {ILineUpOptions} from './interfaces';
import {renderers as defaultRenderers} from './renderer';
import {icons} from './ui/toolbar';

/** number of bins before switching to dense mode
 */
export const DENSE_HISTOGRAM = 19;
export const MIN_LABEL_WIDTH = 30;
/**
 * number of milliseconds to wait before a hovered canvas row will be replaced with a DOM one
 * @type {number}
 */
export const HOVER_DELAY_SHOW_DETAIL = 500;

export function defaultOptions(): ILineUpOptions {
  const idPrefix = `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`; //generate a random string with length3;
  return {
    idPrefix,
    toolbar: Object.assign({}, icons),
    renderers: Object.assign({}, defaultRenderers),

    summary: true,
    animation: true,
    wholeHover: false,
    panel: false,

    rowHeight: 18,
    groupHeight: 40,
    groupPadding: 5,
    rowPadding: 2,

    levelOfDetail: () => 'high',
    customRowUpdate: () => undefined,
    dynamicHeight: () => null
  };
}
