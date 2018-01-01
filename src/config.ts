import {ILineUpOptions} from './interfaces';
/**
 * Created by Samuel Gratzl on 15.08.2017.
 */
import {renderers as defaultRenderers} from './renderer';
import {filters as defaultFilters} from './ui/dialogs';
import {defaultSummaries} from './ui/summary';

/** number of bins before switching to dense mode
 */
export const DENSE_HISTOGRAM = 19;
/**
 * number of milliseconds to wait before a hovered canvas row will be replaced with a DOM one
 * @type {number}
 */
export const HOVER_DELAY_SHOW_DETAIL = 500;

export function defaultOptions(): ILineUpOptions {
  const idPrefix = `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`; //generate a random string with length3;
  return {
    idPrefix,
    filters: Object.assign({}, defaultFilters),
    summaries: Object.assign({}, defaultSummaries),
    renderers: Object.assign({}, defaultRenderers),

    summary: true,
    animation: true,

    rowHeight: 18,
    groupHeight: 40,
    groupPadding: 5,
    rowPadding: 2,

    levelOfDetail: () => 'high',
    customRowUpdate: () => undefined,
    dynamicHeight: () => null
  };
}
