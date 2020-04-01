export {colorOf} from './impose';
export * from './interfaces';
export {renderMissingCanvas, renderMissingDOM} from './missing';

import {AAggregatedGroupRenderer} from './AAggregatedGroupRenderer';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import ActionRenderer from './ActionRenderer';
import AggregateGroupRenderer from './AggregateGroupRenderer';
import AnnotationRenderer from './AnnotationRenderer';
import BarCellRenderer from './BarCellRenderer';
import BooleanCellRenderer from './BooleanCellRenderer';
import BoxplotCellRenderer from './BoxplotCellRenderer';
import BrightnessCellRenderer, {toHeatMapColor} from './BrightnessCellRenderer';
import CategoricalCellRenderer from './CategoricalCellRenderer';
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
import MultiLevelCellRenderer from './MultiLevelCellRenderer';
import RankCellRenderer from './RankCellRenderer';
import SelectionRenderer from './SelectionRenderer';
import SetCellRenderer from './SetCellRenderer';
import SparklineCellRenderer from './SparklineCellRenderer';
import StringCellRenderer from './StringCellRenderer';
import TableCellRenderer from './TableCellRenderer';
import UpSetCellRenderer from './UpSetCellRenderer';
import VerticalBarCellRenderer from './VerticalBarCellRenderer';
import {noRenderer, wideEnough, wideEnoughCat, adaptTextColorToBgColor, adaptDynamicColorToBgColor} from './utils';

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
  toHeatMapColor,
  noRenderer,
  wideEnough,
  wideEnoughCat,
  adaptTextColorToBgColor,
  adaptDynamicColorToBgColor,
};
