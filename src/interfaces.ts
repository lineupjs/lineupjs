import {IBodyRendererOptions, IHeaderRendererOptions} from './ui/interfaces';
import {IPoolRendererOptions} from './ui/PoolRenderer';
import ICellRendererFactory from './renderer/ICellRendererFactory';
import {IDataProvider} from './provider/ADataProvider';

export interface IBodyOptions {
  renderer: string;
  visibleRowsOnly: boolean;
  backupScrollRows: number;
}

export interface IRenderingOptions {
  /**
   * show combined bars as stacked bars
   */
  stacked: boolean;
  /**
   * use animation for reordering
   */
  animation: boolean;
  /**
   * show histograms of the headers (just settable at the beginning)
   * @deprecated use summary instead
   */
  histograms: boolean;
  /**
   * show column summaries in the header
   */
  summary: boolean;
  /**
   * show a mean line for single numberial columns
   */
  meanLine: boolean;
}

export interface ILineUpConfig {
  /**
   * a prefix used for all generated html ids
   */
  idPrefix: string;

  /**
   * options related to the header html layout
   */
  header: Partial<IHeaderRendererOptions>;
  /**
   * visual representation options
   */
  renderingOptions: Partial<IRenderingOptions>;
  /**
   * options related to the rendering of the body
   */
  body: Partial<IBodyOptions & IBodyRendererOptions>;
  /**
   *  enables manipulation features, remove column, reorder,...
   */
  manipulative: boolean;
  /**
   * automatically add a column pool at the end
   */
  pool: boolean | IPoolRendererOptions;

  /**
   * the renderer to use for rendering the columns
   */
  renderers: {[key: string]: ICellRendererFactory};
}

export interface ILineUpLike {
  data: IDataProvider;
  dump(): any;
}
