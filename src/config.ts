/**
 * Created by Samuel Gratzl on 15.08.2017.
 */
import {renderers as defaultRenderers} from './renderer';
import {filters as defaultFilters} from './dialogs';
import {defaultSummaries} from './ui/engine/summary';
import ICellRendererFactory from 'lineupjs/src/renderer/ICellRendererFactory';
import {ISummaryFunction} from 'lineupjs/src/ui/interfaces';
import {IGroupData, IGroupItem} from 'lineupjs/src/ui/engine/interfaces';
import Ranking from 'lineupjs/src/model/Ranking';
import {IFilterDialog} from 'lineupjs/src/dialogs/AFilterDialog';



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
