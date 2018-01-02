/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import Column from '../model/Column';
import ActionRenderer from './ActionRenderer';
import AggregateGroupRenderer from './AggregateGroupRenderer';
import AnnotationRenderer from './AnnotationRenderer';
import BarCellRenderer from './BarCellRenderer';
import BooleanCellRenderer from './BooleanCellRenderer';
import BoxplotCellRenderer from './BoxplotCellRenderer';
import CategoricalCellRenderer from './CategoricalCellRenderer';
import CategoricalColorCellRenderer from './CategoricalColorCellRenderer';
import CategoricalStackedDistributionlRenderer from './CategoricalStackedDistributionlRenderer';
import CircleCellRenderer from './CircleCellRenderer';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import DotCellRenderer from './DotCellRenderer';
import GroupCellRenderer from './GroupCellRenderer';
import HeatmapCellRenderer from './HeatmapCellRenderer';
import HistogramRenderer from './HistogramRenderer';
import ImageCellRenderer from './ImageCellRenderer';
import {ICellRendererFactory} from './interfaces';
import InterleavingCellRenderer from './InterleavingCellRenderer';
import LinkCellRenderer from './LinkCellRenderer';
import LoadingCellRenderer from './LoadingCellRenderer';
import MultiLevelCellRenderer from './MultiLevelCellRenderer';
import NumbersCellRenderer from './NumbersCellRenderer';
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
  IGroupCellRenderer,
  ICellRenderer,
  ICellRendererFactory
} from './interfaces';


export const defaultCellRenderer = new DefaultCellRenderer();
/**
 * default render factories
 */
export const renderers: { [key: string]: ICellRendererFactory } = {
  actions: new ActionRenderer(),
  aggregate: new AggregateGroupRenderer(),
  annotate: new AnnotationRenderer(),
  boolean: new BooleanCellRenderer(),
  boxplot: new BoxplotCellRenderer(),
  catcolor: new CategoricalColorCellRenderer(),
  catdistributionbar: new CategoricalStackedDistributionlRenderer(),
  categorical: new CategoricalCellRenderer(),
  circle: new CircleCellRenderer(),
  default: defaultCellRenderer,
  dot: new DotCellRenderer(),
  group: new GroupCellRenderer(),
  heatmap: new HeatmapCellRenderer(),
  histogram: new HistogramRenderer(),
  image: new ImageCellRenderer(),
  interleaving: new InterleavingCellRenderer(),
  link: new LinkCellRenderer(),
  loading: new LoadingCellRenderer(),
  nested: new MultiLevelCellRenderer(false),
  number: new BarCellRenderer(),
  numbers: new NumbersCellRenderer(),
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

export function possibleRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }, isGroup: boolean = false): { type: string, label: string }[] {
  const valid = Object.keys(renderers).filter((type) => {
    const factory = renderers[type];
    return factory.canRender(col, isGroup);
  });
  // TODO some magic to remove and order

  return valid.map((type) => ({
    type,
    label: !isGroup ? renderers[type].title : (renderers[type].groupTitle || renderers[type].title)
  }));
}

export function possibleGroupRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }) {
  return possibleRenderer(col, renderers, true);
}
