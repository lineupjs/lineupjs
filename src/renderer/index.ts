/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import Column from '../model/Column';
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
import HeatmapCellRenderer from './HeatmapCellRenderer';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {EmptyCellRenderer} from './EmptyCellRenderer';
import RankCellRenderer from './RankCellRenderer';
import CategoricalColorCellRenderer from './CategoricalColorCellRenderer';
import AggregateGroupRenderer from './AggregateGroupRenderer';
import HistogramRenderer from './HistogramRenderer';
import ImageCellRenderer from './ImageCellRenderer';
import BooleanCellRenderer from './BooleanCellRenderer';
import InterleavingCellRenderer from './InterleavingCellRenderer';
import DotCellRenderer from './DotCellRenderer';
import {IImposer} from './IRenderContext';
import CategoricalStackedDistributionlRenderer from './CategoricalStackedDistributionlRenderer';
import GroupCellRenderer from './GroupCellRenderer';



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
  empty: new EmptyCellRenderer(),
  aggregate: new AggregateGroupRenderer(),
  histogram: new HistogramRenderer(),
  interleaving: new InterleavingCellRenderer(),
  dot: new DotCellRenderer(),
  group: new GroupCellRenderer(),
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

export function createDOM(col: Column, renderers: { [key: string]: ICellRendererFactory }, context: IDOMRenderContext, imposer?: IImposer) {
  const r = chooseRenderer(col, renderers);
  return (r.createDOM ? r.createDOM.bind(r) : defaultCellRenderer.createDOM.bind(defaultCellRenderer))(col, context, imposer);
}

export function createCanvas(col: Column, renderers: { [key: string]: ICellRendererFactory }, context: ICanvasRenderContext, imposer?: IImposer) {
  const r = chooseRenderer(col, renderers);
  return (r.createCanvas ? r.createCanvas.bind(r) : defaultCellRenderer.createCanvas.bind(defaultCellRenderer))(col, context, imposer);
}

export function createDOMGroup(col: Column, renderers: { [key: string]: ICellRendererFactory }, context: IDOMRenderContext, imposer?: IImposer) {
  const r = chooseGroupRenderer(col, renderers);
  return (r.createGroupDOM ? r.createGroupDOM.bind(r) : defaultCellRenderer.createGroupDOM.bind(defaultCellRenderer))(col, context, imposer);
}

export function createCanvasGroup(col: Column, renderers: { [key: string]: ICellRendererFactory }, context: ICanvasRenderContext, imposer?: IImposer) {
  const r = chooseGroupRenderer(col, renderers);
  return (r.createGroupCanvas ? r.createGroupCanvas.bind(r) : defaultCellRenderer.createGroupCanvas.bind(defaultCellRenderer))(col, context, imposer);
}

export function possibleRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }, isGroup: boolean = false): {type: string, label: string}[] {
  const valid = Object.keys(renderers).filter((type) => {
    const factory = renderers[type];
    return factory.canRender(col, isGroup);
  });
  // TODO some magic to remove and order

  return valid.map((type) => ({type, label: !isGroup ? renderers[type].title : (renderers[type].groupTitle || renderers[type].title)}));
}

export function possibleGroupRenderer(col: Column, renderers: { [key: string]: ICellRendererFactory }) {
  return possibleRenderer(col, renderers, true);
}
