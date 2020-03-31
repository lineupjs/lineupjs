export {colorOf} from './impose';
export * from './interfaces';
export {renderMissingCanvas, renderMissingDOM} from './missing';

import {AAggregatedGroupRenderer} from './AAggregatedGroupRenderer';
import {ANumbersCellRenderer, matchRows} from './ANumbersCellRenderer';
import ActionRenderer from './ActionRenderer';
import AggregateGroupRenderer from './AggregateGroupRenderer';
import AnnotationRenderer from './AnnotationRenderer';
import BarCellRenderer from './BarCellRenderer';
import BooleanCellRenderer from './BooleanCellRenderer';
import BoxplotCellRenderer, {computeLabel} from './BoxplotCellRenderer';
import BrightnessCellRenderer, {toHeatMapColor} from './BrightnessCellRenderer';
import CategoricalCellRenderer, {interactiveHist} from './CategoricalCellRenderer';
import CategoricalHeatmapCellRenderer from './CategoricalHeatmapCellRenderer';
import CategoricalStackedDistributionlCellRenderer from './CategoricalStackedDistributionlCellRenderer';
import CircleCellRenderer from './CircleCellRenderer';
import DateCellRenderer from './DateCellRenderer';
import DateHistogramCellRenderer from './DateHistogramCellRenderer';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import DotCellRenderer from './DotCellRenderer';
import GroupCellRenderer from './GroupCellRenderer';
import HeatmapCellRenderer from './HeatmapCellRenderer';
import HistogramCellRenderer from './HistogramCellRenderer';
import ImageCellRenderer from './ImageCellRenderer';
import InterleavingCellRenderer from './InterleavingCellRenderer';
import LinkCellRenderer from './LinkCellRenderer';
import LinkMapCellRenderer from './LinkMapCellRenderer';
import LoadingCellRenderer from './LoadingCellRenderer';
import MapBarCellRenderer from './MapBarCellRenderer';
import MultiLevelCellRenderer, {createData} from './MultiLevelCellRenderer';
import RankCellRenderer from './RankCellRenderer';
import SelectionRenderer from './SelectionRenderer';
import SetCellRenderer from './SetCellRenderer';
import SparklineCellRenderer, {line} from './SparklineCellRenderer';
import StringCellRenderer from './StringCellRenderer';
import TableCellRenderer, {groupByKey} from './TableCellRenderer';
import UpSetCellRenderer from './UpSetCellRenderer';
import VerticalBarCellRenderer from './VerticalBarCellRenderer';
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
