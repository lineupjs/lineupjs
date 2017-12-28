/**
 * Created by Samuel Gratzl on 15.08.2017.
 */
import {renderers as defaultRenderers} from './renderer';
import {filters as defaultFilters} from './dialogs';
import {defaultSummaries} from './ui/summary';
import {ILineUpConfig} from './interfaces';

export function defaultConfig(): ILineUpConfig {
  const idPrefix = `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`; //generate a random string with length3;
  return {
    idPrefix,
    filters: Object.assign({}, defaultFilters),
    summaries: Object.assign({}, defaultSummaries),
    renderers: Object.assign({}, defaultRenderers),

    summary: true,
    animation: true,

    rowHeight: 16,
    groupHeight: 70,
    groupPadding: 5,
    rowPadding: 2,
    columnPadding: 5
  };
}
