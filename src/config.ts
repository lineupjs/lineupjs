/**
 * Created by Samuel Gratzl on 15.08.2017.
 */
import {IBodyOptions, ILineUpConfig} from './interfaces';
import {IHeaderRendererOptions, IRankingHook, IBodyRendererOptions} from './ui/interfaces';
import {renderers as defaultRenderers} from './renderer';
import {filters as defaultFilters} from './dialogs';
import StringColumn from './model/StringColumn';
import {Column} from './model';
import {defaultSummaries} from './ui/engine/summary';

export interface IFullLineUpConfig extends ILineUpConfig {
  /**
   * options related to the header html layout
   */
  header: IHeaderRendererOptions;
  /**
   * options related to the rendering of the body
   */
  body: IBodyOptions & IBodyRendererOptions;
}

export function dummyRankingButtonHook(): any {
  return null;
}

export function defaultConfig(): IFullLineUpConfig {
  const idPrefix = `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`; //generate a random string with length3;
  const renderers = Object.assign({}, defaultRenderers);
  return {
    idPrefix,
    header: {
      idPrefix,
      slopeWidth: 150,
      columnPadding: 5,
      headerHistogramHeight: 40,
      headerHeight: 20,
      manipulative: true,
      summary: false,
      filters: Object.assign({}, defaultFilters),
      summaries: Object.assign({}, defaultSummaries),
      linkTemplates: [],
      searchAble: (col: Column) => col instanceof StringColumn,
      sortOnLabel: true,

      autoRotateLabels: false,
      rotationHeight: 50, //in px
      rotationDegree: -20, //in deg

      freezeCols: 0,

      rankingButtons: <IRankingHook>dummyRankingButtonHook
    },
    renderingOptions: {
      stacked: true,
      animation: true,
      summary: false,
      meanLine: false,
      histograms: false
    },
    body: {
      renderer: 'svg', //svg, canvas, html
      visibleRowsOnly: true,
      backupScrollRows: 5,
      rowHeight: 16,
      groupHeight: 70,
      groupPadding: 5,
      rowPadding: 2,
      columnPadding: 5,

      textHeight: 13, //10pt
      rowBarPadding: 1,
      rowBarTopPadding: 1,
      rowBarBottomPadding: 1,
      idPrefix: '',
      slopeWidth: 150,
      stacked: true,
      animation: false, //200
      animationDuration: 1000,
      renderers,
      meanLine: false,
      actions: [],

      freezeCols: 0,
      striped: false
    },
    manipulative: true,
    pool: false,
    renderers
  };
}
