/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import Column from './model/Column';
import CategoricalNumberColumn from './model/CategoricalNumberColumn';
import CompositeNumberColumn from './model/CompositeNumberColumn';

import ICellRendererFactory from './renderers/ICellRendererFactory';
import BarCellRenderer from './renderers/BarCellRenderer';
import {DefaultCellRenderer} from './renderers/DefaultCellRenderer';
import StringCellRenderer from './renderers/StringCellRenderer';
import SelectionRenderer from './renderers/SelectionRenderer';
import LinkCellRenderer from './renderers/LinkCellRenderer';
import AnnotationRenderer from './renderers/AnnotationRenderer';
import ActionRenderer from './renderers/ActionRenderer';
import StackCellRenderer from './renderers/StackCellRenderer';
import CategoricalCellRenderer from './renderers/CategoricalCellRenderer';
import HeatmapCellRenderer from './renderers/HeatmapCellRenderer';
import SparklineCellRenderer from './renderers/SparklineCellRenderer';
import VerticalBarCellRenderer from './renderers/VerticalBarCellRenderer';
import SetCellRenderer from './renderers/SetCellRenderer';
import CircleCellRenderer from './renderers/CircleCellRenderer';
import BoxplotCellRenderer from './renderers/BoxplotCellRenderer';
import LoadingCellRenderer from './renderers/LoadingCellRenderer';
import ThresholdCellRenderer from './renderers/ThresholdCellRenderer';
import Heatmap from './renderers/Heatmap';
import {IDOMRenderContext, ICanvasRenderContext} from './renderers/RendererContexts';


export const defaultCellRenderer = new DefaultCellRenderer();
const combineCellRenderer = new BarCellRenderer(false, (d, i, col: CompositeNumberColumn) => col.getColor(d, i));

/**
 * default render factories
 */
export const renderers: {[key: string]: ICellRendererFactory} = {
  rank: new DefaultCellRenderer('rank', 'right'),
  boolean: new DefaultCellRenderer('boolean', 'center'),
  number: new BarCellRenderer(),
  ordinal: new BarCellRenderer(true, (d, i, col: CategoricalNumberColumn) => col.getColor(d, i)),
  string: new StringCellRenderer(),
  selection: new SelectionRenderer(),
  heatmap: new Heatmap(),
  link: new LinkCellRenderer(),
  annotate: new AnnotationRenderer(),
  actions: new ActionRenderer(),
  stack: new StackCellRenderer(),
  nested: new StackCellRenderer(false),
  categorical: new CategoricalCellRenderer(),
  max: combineCellRenderer,
  min: combineCellRenderer,
  mean: combineCellRenderer,
  script: combineCellRenderer,
  multiValue: new HeatmapCellRenderer(),
  threshold: new ThresholdCellRenderer(),
  sparkline: new SparklineCellRenderer(),
  verticalbar: new VerticalBarCellRenderer(),
  set: new SetCellRenderer(),
  circle: new CircleCellRenderer(),
  boxplot: new BoxplotCellRenderer(),
  loading: new LoadingCellRenderer()
};

function chooseRenderer(col: Column, renderers: {[key: string]: ICellRendererFactory}): ICellRendererFactory {
  const r = renderers[col.getRendererType()];
  return r || defaultCellRenderer;
}

export function createSVG(col: Column, renderers: {[key: string]: ICellRendererFactory}, context: IDOMRenderContext) {
  const r = chooseRenderer(col, renderers);
  return (r.createSVG ? r.createSVG.bind(r) : defaultCellRenderer.createSVG.bind(r))(col, context);
}
export function createHTML(col: Column, renderers: {[key: string]: ICellRendererFactory}, context: IDOMRenderContext) {
  const r = chooseRenderer(col, renderers);
  return (r.createHTML ? r.createHTML.bind(r) : defaultCellRenderer.createHTML.bind(r))(col, context);
}
export function createCanvas(col: Column, renderers: {[key: string]: ICellRendererFactory}, context: ICanvasRenderContext) {
  const r = chooseRenderer(col, renderers);
  return (r.createCanvas ? r.createCanvas.bind(r) : defaultCellRenderer.createCanvas.bind(r))(col, context);
}
