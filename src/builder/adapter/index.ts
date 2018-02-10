export {
  IBuilderAdapterCategoricalColumnDescProps,
  IBuilderAdapterColumnDescProps,
  IBuilderAdapterDateColumnDescProps,
  IBuilderAdapterHierarchyColumnDescProps,
  IBuilderAdapterNumberColumnDescProps,
  IBuilderAdapterStringColumnDescProps
} from './column';
export {IChangeDetecter, IBuilderAdapter, IBuilderAdapterDataProps, IBuilderAdapterProps} from './lineup';
export {
  IBuilderAdapterImposeColumnProps,
  IBuilderAdapterNestedColumnProps,
  IBuilderAdapterRankingProps,
  IBuilderAdapterReduceColumnProps,
  IBuilderAdapterScriptColumnProps,
  IBuilderAdapterSupportColumnProps,
  IBuilderAdapterWeightedSumColumnProps
} from './ranking';

import {build, buildCategorical, buildDate, buildHierarchy, buildNumber, buildString} from './column';
import {Adapter} from './lineup';
import {
  buildAllColumnsRanking,
  buildGeneric,
  buildImposeRanking,
  buildNestedRanking,
  buildRanking,
  buildReduceRanking,
  buildScriptRanking,
  buildSupportRanking,
  buildWeightedSumRanking
} from './ranking';
import {equal, isSame, isTypeInstance} from './utils';

export const builderAdapter = {
  buildString,
  buildNumber,
  buildHierarchy,
  buildDate,
  buildCategorical,
  build,
  buildGeneric,
  buildWeightedSumRanking,
  buildSupportRanking,
  buildScriptRanking,
  buildReduceRanking,
  buildRanking,
  buildNestedRanking,
  buildImposeRanking,
  buildAllColumnsRanking,
  equal,
  isSame,
  isTypeInstance,
  Adapter
};
