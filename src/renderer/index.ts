export {colorOf} from './impose';
export * from './interfaces';
export {renderMissingCanvas, renderMissingDOM} from './missing';

import {AAggregatedGroupRenderer} from './AAggregatedGroupRenderer';
import {ANumbersCellRenderer, matchRows} from './ANumbersCellRenderer';
import {default as ActionRenderer} from './ActionRenderer';
import {default as AggregateGroupRenderer} from './AggregateGroupRenderer';
import {default as AnnotationRenderer} from './AnnotationRenderer';
import {default as BarCellRenderer} from './BarCellRenderer';
import {default as BooleanCellRenderer} from './BooleanCellRenderer';
import {default as BoxplotCellRenderer, computeLabel} from './BoxplotCellRenderer';
import {default as BrightnessCellRenderer, toHeatMapColor} from './BrightnessCellRenderer';
import {default as CategoricalCellRenderer, interactiveHist} from './CategoricalCellRenderer';
import {default as CategoricalHeatmapCellRenderer} from './CategoricalHeatmapCellRenderer';
import {default as CategoricalStackedDistributionlCellRenderer} from './CategoricalStackedDistributionlCellRenderer';
import {default as CircleCellRenderer} from './CircleCellRenderer';
import {default as DateCellRenderer} from './DateCellRenderer';
import {default as DateHistogramCellRenderer} from './DateHistogramCellRenderer';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import {default as DotCellRenderer} from './DotCellRenderer';
import {default as GroupCellRenderer} from './GroupCellRenderer';
import {default as HeatmapCellRenderer} from './HeatmapCellRenderer';
import {default as HistogramCellRenderer} from './HistogramCellRenderer';
import {default as ImageCellRenderer} from './ImageCellRenderer';
import {default as InterleavingCellRenderer} from './InterleavingCellRenderer';
import {default as LinkCellRenderer} from './LinkCellRenderer';
import {default as LinkMapCellRenderer} from './LinkMapCellRenderer';
import {default as LoadingCellRenderer} from './LoadingCellRenderer';
import {default as MapBarCellRenderer} from './MapBarCellRenderer';
import {default as MultiLevelCellRenderer, createData} from './MultiLevelCellRenderer';
import {default as RankCellRenderer} from './RankCellRenderer';
import {default as SelectionRenderer} from './SelectionRenderer';
import {default as SetCellRenderer} from './SetCellRenderer';
import {default as SparklineCellRenderer, line} from './SparklineCellRenderer';
import {default as StringCellRenderer} from './StringCellRenderer';
import {default as TableCellRenderer, groupByKey} from './TableCellRenderer';
import {default as UpSetCellRenderer} from './UpSetCellRenderer';
import {default as VerticalBarCellRenderer} from './VerticalBarCellRenderer';
import {histogramUpdate, mappingHintTemplate, mappingHintUpdate} from './histogram';
import {noop, noRenderer, setText, forEach, forEachChild, matchColumns, wideEnough, wideEnoughCat, adaptTextColorToBgColor, adaptDynamicColorToBgColor, uniqueId, exampleText, multiLevelGridCSSClass, colorOf} from './utils';

export {HasCategoricalFilter} from './CategoricalCellRenderer';
export {ICols as IMultiLevelCols} from './MultiLevelCellRenderer';
export {IFilterInfo} from './histogram';

export const rendererClasses = {
  AAggregatedGroupRenderer,
  ANumbersCellRenderer,
  ActionRenderer,
  AggregateGroupRenderer,
  AnnotationRenderer,
  BarCellRenderer,
  BooleanCellRenderer,
  BoxplotCellRenderer,
  BrightnessCellRenderer,
  CategoricalCellRenderer,
  CategoricalHeatmapCellRenderer,
  CategoricalStackedDistributionlCellRenderer,
  CircleCellRenderer,
  DateCellRenderer,
  DateHistogramCellRenderer,
  DefaultCellRenderer,
  DotCellRenderer,
  GroupCellRenderer,
  HeatmapCellRenderer,
  HistogramCellRenderer,
  ImageCellRenderer,
  InterleavingCellRenderer,
  LinkCellRenderer,
  LinkMapCellRenderer,
  LoadingCellRenderer,
  MapBarCellRenderer,
  MultiLevelCellRenderer,
  RankCellRenderer,
  SelectionRenderer,
  SetCellRenderer,
  SparklineCellRenderer,
  StringCellRenderer,
  TableCellRenderer,
  UpSetCellRenderer,
  VerticalBarCellRenderer
};

export const rendererUtils = {
  matchRows,
  computeLabel,
  toHeatMapColor,
  interactiveHist,
  createData,
  line,
  groupByKey,
  histogramUpdate,
  mappingHintTemplate,
  mappingHintUpdate,
  noop,
  noRenderer,
  setText,
  forEach,
  forEachChild,
  matchColumns,
  wideEnough,
  wideEnoughCat,
  adaptTextColorToBgColor,
  adaptDynamicColorToBgColor,
  uniqueId,
  exampleText,
  multiLevelGridCSSClass,
  colorOf
};
