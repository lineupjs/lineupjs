import Column from '../model/Column';
import ActionRenderer from './ActionRenderer';
import AggregateGroupRenderer from './AggregateGroupRenderer';
import AnnotationRenderer from './AnnotationRenderer';
import BarCellRenderer from './BarCellRenderer';
import BooleanCellRenderer from './BooleanCellRenderer';
import BoxplotCellRenderer from './BoxplotCellRenderer';
import BrightnessCellRenderer from './BrightnessCellRenderer';
import CategoricalCellRenderer from './CategoricalCellRenderer';
import CategoricalHeatmapCellRenderer from './CategoricalHeatmapCellRenderer';
import CategoricalStackedDistributionlCellRenderer from './CategoricalStackedDistributionlCellRenderer';
import CircleCellRenderer from './CircleCellRenderer';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import DotCellRenderer from './DotCellRenderer';
import GroupCellRenderer from './GroupCellRenderer';
import HeatmapCellRenderer from './HeatmapCellRenderer';
import HistogramCellRenderer from './HistogramCellRenderer';
import ImageCellRenderer from './ImageCellRenderer';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import InterleavingCellRenderer from './InterleavingCellRenderer';
import LinkCellRenderer from './LinkCellRenderer';
import LinkMapCellRenderer from './LinkMapCellRenderer';
import LoadingCellRenderer from './LoadingCellRenderer';
import MapBarCellRenderer from './MapBarCellRenderer';
import MultiLevelCellRenderer from './MultiLevelCellRenderer';
import RankCellRenderer from './RankCellRenderer';
import SelectionRenderer from './SelectionRenderer';
import SparklineCellRenderer from './SparklineCellRenderer';
import StringCellRenderer from './StringCellRenderer';
import TableCellRenderer from './TableCellRenderer';
import UpSetCellRenderer from './UpSetCellRenderer';
import VerticalBarCellRenderer from './VerticalBarCellRenderer';

export {
  default as IRenderContext,
  IImposer,
  ERenderMode,
  ISummaryRenderer,
  IGroupCellRenderer,
  ICellRenderer,
  ICellRendererFactory
} from './interfaces';

export {colorOf} from './impose';
export {renderMissingDOM, renderMissingCanvas} from './missing';


const defaultCellRenderer = new DefaultCellRenderer();
/**
 * default render factories
 */
export const renderers: { [key: string]: ICellRendererFactory } = {
  actions: new ActionRenderer(),
  aggregate: new AggregateGroupRenderer(),
  annotate: new AnnotationRenderer(),
  boolean: new BooleanCellRenderer(),
  boxplot: new BoxplotCellRenderer(),
  brightness: new BrightnessCellRenderer(),
  catdistributionbar: new CategoricalStackedDistributionlCellRenderer(),
  categorical: new CategoricalCellRenderer(),
  circle: new CircleCellRenderer(),
  default: defaultCellRenderer,
  dot: new DotCellRenderer(),
  group: new GroupCellRenderer(),
  heatmap: new HeatmapCellRenderer(),
  catheatmap: new CategoricalHeatmapCellRenderer(),
  histogram: new HistogramCellRenderer(),
  image: new ImageCellRenderer(),
  interleaving: new InterleavingCellRenderer(),
  link: new LinkCellRenderer(),
  linkMap: new LinkMapCellRenderer(),
  loading: new LoadingCellRenderer(),
  nested: new MultiLevelCellRenderer(false),
  number: new BarCellRenderer(),
  mapbars: new MapBarCellRenderer(),
  rank: new RankCellRenderer(),
  selection: new SelectionRenderer(),
  sparkline: new SparklineCellRenderer(),
  stack: new MultiLevelCellRenderer(),
  string: new StringCellRenderer(),
  table: new TableCellRenderer(),
  upset: new UpSetCellRenderer(),
  verticalbar: new VerticalBarCellRenderer()
};


export function chooseRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }): ICellRendererFactory {
  const r = renderers[col.getRenderer()];
  return r || defaultCellRenderer;
}

export function chooseGroupRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }): ICellRendererFactory {
  const r = renderers[col.getGroupRenderer()];
  return r || defaultCellRenderer;
}

export function chooseSummaryRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }): ICellRendererFactory {
  const r = renderers[col.getSummaryRenderer()];
  return r || defaultCellRenderer;
}

export function possibleRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }, mode: ERenderMode = ERenderMode.CELL): { type: string, label: string }[] {
  const valid = Object.keys(renderers).filter((type) => {
    const factory = renderers[type];
    return factory.canRender(col, mode);
  });
  // TODO some magic to remove and order


  return valid.map((type) => {
    const r = renderers[type];
    return {
      type,
      label: mode === ERenderMode.CELL ? r.title : (mode === ERenderMode.GROUP ? r.groupTitle || r.title : r.summaryTitle || r.groupTitle || r.title)
    };
  });
}

export function possibleGroupRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }) {
  return possibleRenderer(col, renderers, ERenderMode.GROUP);
}

export function possibleSummaryRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }) {
  return possibleRenderer(col, renderers, ERenderMode.SUMMARY);
}
