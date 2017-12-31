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
  rank: new RankCellRenderer(),
  boolean: new BooleanCellRenderer(),
  number: new BarCellRenderer(),
  string: new StringCellRenderer(),
  selection: new SelectionRenderer(),
  heatmap: new HeatmapCellRenderer(),
  image: new ImageCellRenderer(),
  link: new LinkCellRenderer(),
  annotate: new AnnotationRenderer(),
  actions: new ActionRenderer(),
  stack: new MultiLevelCellRenderer(),
  nested: new MultiLevelCellRenderer(false),
  categorical: new CategoricalCellRenderer(),
  catcolor: new CategoricalColorCellRenderer(),
  catdistributionbar: new CategoricalStackedDistributionlRenderer(),
  numbers: new NumbersCellRenderer(),
  sparkline: new SparklineCellRenderer(),
  verticalbar: new VerticalBarCellRenderer(),
  upset: new UpSetCellRenderer(),
  circle: new CircleCellRenderer(),
  boxplot: new BoxplotCellRenderer(),
  loading: new LoadingCellRenderer(),
  aggregate: new AggregateGroupRenderer(),
  histogram: new HistogramRenderer(),
  interleaving: new InterleavingCellRenderer(),
  dot: new DotCellRenderer(),
  group: new GroupCellRenderer(),
  default: defaultCellRenderer
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
