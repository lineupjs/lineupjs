/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import Column from '../model/Column';
import CategoricalNumberColumn from '../model/CategoricalNumberColumn';
import CompositeNumberColumn from '../model/CompositeNumberColumn';

import ICellRendererFactory from './ICellRendererFactory';
import BarCellRenderer from './BarCellRenderer';
import {DefaultCellRenderer} from './DefaultCellRenderer';
import StringCellRenderer from './StringCellRenderer';
import SelectionRenderer from './SelectionRenderer';
import LinkCellRenderer from './LinkCellRenderer';
import AnnotationRenderer from './AnnotationRenderer';
import ActionRenderer from './ActionRenderer';
import MultiLevelCellRenderer from './MultiLevelCellRenderer';
import CategoricalCellRenderer from './CategoricalCellRenderer';
import NumbersCellRenderer from './NumbersCellRenderer';
import SparklineCellRenderer from './SparklineCellRenderer';
import VerticalBarCellRenderer from './VerticalBarCellRenderer';
import UpSetCellRenderer from './UpSetCellRenderer';
import CircleCellRenderer from './CircleCellRenderer';
import BoxplotCellRenderer from './BoxplotCellRenderer';
import LoadingCellRenderer from './LoadingCellRenderer';
import ThresholdCellRenderer from './ThresholdCellRenderer';
import HeatmapCellRenderer from './HeatmapCellRenderer';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {EmptyCellRenderer} from './EmptyCellRenderer';
import RankCellRenderer from './RankCellRenderer';
import CategoricalColorCellRenderer from './CategoricalColorCellRenderer';
import AggregateGroupRenderer from './AggregateGroupRenderer';
import HistogramGroupRenderer from './HistogramGroupRenderer';
import CategoricalColorShiftedCellRenderer from './CategoricalColorShiftedCellRenderer';
import ImageCellRenderer from './ImageCellRenderer';


export const defaultCellRenderer = new DefaultCellRenderer();

/**
 * default render factories
 */
export const renderers: { [key: string]: ICellRendererFactory } = {
  rank: new RankCellRenderer(),
  boolean: new DefaultCellRenderer('boolean', 'center'),
  date: defaultCellRenderer,
  number: new BarCellRenderer(),
  ordinal: new BarCellRenderer(true, (d, i, col: CategoricalNumberColumn) => col.getColor(d, i)),
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
  catcolorshifted: new CategoricalColorShiftedCellRenderer(),
  compositenumber: new BarCellRenderer(false, (d, i, col: CompositeNumberColumn) => col.getColor(d, i)),
  numbers: new NumbersCellRenderer(),
  threshold: new ThresholdCellRenderer(),
  sparkline: new SparklineCellRenderer(),
  verticalbar: new VerticalBarCellRenderer(),
  set: new UpSetCellRenderer(),
  upset: new UpSetCellRenderer(),
  circle: new CircleCellRenderer(),
  boxplot: new BoxplotCellRenderer(),
  loading: new LoadingCellRenderer(),
  empty: new EmptyCellRenderer(),
  aggregate: new AggregateGroupRenderer(),
  histogram: new HistogramGroupRenderer(),
  default: defaultCellRenderer
};

function chooseRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }): ICellRendererFactory {
  const r = renderers[col.getRendererType()];
  return r || defaultCellRenderer;
}

function chooseGroupRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }): ICellRendererFactory {
  const r = renderers[col.getGroupRenderer()];
  return r || defaultCellRenderer;
}

export function createDOM(col: Column, renderers: { [key: string]: ICellRendererFactory }, context: IDOMRenderContext) {
  const r = chooseRenderer(col, renderers);
  return (r.createDOM ? r.createDOM.bind(r) : defaultCellRenderer.createDOM.bind(defaultCellRenderer))(col, context);
}

export function createCanvas(col: Column, renderers: { [key: string]: ICellRendererFactory }, context: ICanvasRenderContext) {
  const r = chooseRenderer(col, renderers);
  return (r.createCanvas ? r.createCanvas.bind(r) : defaultCellRenderer.createCanvas.bind(defaultCellRenderer))(col, context);
}

export function createDOMGroup(col: Column, renderers: { [key: string]: ICellRendererFactory }, context: IDOMRenderContext) {
  const r = chooseGroupRenderer(col, renderers);
  return (r.createGroupDOM ? r.createGroupDOM.bind(r) : defaultCellRenderer.createGroupDOM.bind(defaultCellRenderer))(col, context);
}

export function createCanvasGroup(col: Column, renderers: { [key: string]: ICellRendererFactory }, context: ICanvasRenderContext) {
  const r = chooseGroupRenderer(col, renderers);
  return (r.createGroupCanvas ? r.createGroupCanvas.bind(r) : defaultCellRenderer.createGroupCanvas.bind(defaultCellRenderer))(col, context);
}
