/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {IColumnDesc, Column} from './model';
import DataProvider  from './provider/ADataProvider';
import {renderers as defaultRenderers, ICellRendererFactory}  from './renderer';
import {
  IRankingHook,
  dummyRankingButtonHook,
  PoolRenderer,
  IBodyRenderer,
  HeaderRenderer,
  createBodyRenderer
} from './ui';
import {IHeaderRendererOptions} from './ui/HeaderRenderer';
import {IBodyRendererOptions, default as ABodyRenderer} from './ui/ABodyRenderer';
import {AEventDispatcher, ContentScroller, merge}  from './utils';
import {scale as d3scale, selection, select, Selection} from 'd3';

export interface IBodyOptions {
  renderer?: string;
  visibleRowsOnly?: boolean;
  backupScrollRows?: number;
}

export interface ILineUpConfig {
  /**
   * a prefix used for all generated html ids
   */
  idPrefix?: string;

  /**
   * options related to the header html layout
   */
  header?: IHeaderRendererOptions;
  /**
   * old name for header
   */
  htmlLayout?: IHeaderRendererOptions;
  /**
   * visual representation options
   */
  renderingOptions?: {
    /**
     * show combined bars as stacked bars
     */
    stacked?: boolean;
    /**
     * use animation for reordering
     */
    animation?: boolean;
    /**
     * show histograms of the headers (just settable at the beginning)
     */
    histograms?: boolean;
    /**
     * show a mean line for single numberial columns
     */
    meanLine?: boolean;
  };
  /**
   * options related to the rendering of the body
   */
  body?: IBodyOptions & IBodyRendererOptions;
  /**
   * old name for body
   */
  svgLayout?: IBodyOptions & IBodyRendererOptions;
  /**
   *  enables manipulation features, remove column, reorder,...
   */
  manipulative?: boolean;
  /**
   * automatically add a column pool at the end
   */
  pool?: boolean;

  /**
   * the renderers to use for rendering the columns
   */
  renderers?: {[key: string]: ICellRendererFactory};
}

/**
 * main LineUp class managing data and rendering
 */
export default class LineUp extends AEventDispatcher {
  /**
   * triggered when the mouse is over a specific row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static EVENT_HOVER_CHANGED = ABodyRenderer.EVENT_HOVER_CHANGED;

  /**
   * triggered when the user click on a row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static EVENT_SELECTION_CHANGED = DataProvider.EVENT_SELECTION_CHANGED;

  /**
   * triggered when the user selects one or more rows
   * @argument data_indices:number[] the selected data indices
   */
  static EVENT_MULTISELECTION_CHANGED = 'multiSelectionChanged';

  /**
   * triggered when LineUpJS.update() was called
   */
  static EVENT_UPDATE_START = 'updateStart';

  /**
   * triggered when LineUpJS.update() was called and the rendering the body has finished
   */
  static EVENT_UPDATE_FINISHED = 'updateFinished';

  /**
   * default config of LineUp with all available options
   */
  config: ILineUpConfig = {
    /**
     * a prefix used for all generated html ids
     */
    idPrefix: Math.random().toString(36).slice(-8).substr(0, 3), //generate a random string with length3

    /**
     * options related to the header html layout
     */
    header: {
      /**
       * standard height of the header
       */
      headerHeight: 20,
      /**
       * height of the header including histogram
       */
      headerHistogramHeight: 40,
      /**
       * should labels be automatically rotated if they doesn't fit?
       */
      autoRotateLabels: false,
      /**
       * space reserved if a label is rotated
       */
      rotationHeight: 50, //in px
      /**
       * the degrees to rotate a label
       */
      rotationDegree: -20, //in deg
      /**
       * hook for adding buttons to rankings in the header
       */
      rankingButtons: <IRankingHook>dummyRankingButtonHook,

      /**
       * templates for link patterns
       */
      linkTemplates: []
    },
    /**
     * old name for header
     */
    htmlLayout: {},
    /**
     * visual representation options
     */
    renderingOptions: {
      /**
       * show combined bars as stacked bars
       */
      stacked: true,
      /**
       * use animation for reordering
       */
      animation: true,
      /**
       * show histograms of the headers (just settable at the beginning)
       */
      histograms: false,
      /**
       * show a mean line for single numberial columns
       */
      meanLine: false,
    },
    /**
     * options related to the rendering of the body
     */
    body: {
      renderer: 'svg', //svg, canvas
      rowHeight: 18,
      rowPadding: 1,
      rowBarPadding: 1,

      /**
       * whether just the visible rows or all rows should be rendered - rendering performance (default: true)
       */
      visibleRowsOnly: true,

      /**
       * number of backup rows to keep to avoid updating on every small scroll thing
       */
      backupScrollRows: 4,
      animationDuration: 1000,

      //number of cols that should be frozen on the left side
      freezeCols: 0,

      actions: []
    },
    /**
     * old name for body
     */
    svgLayout: {},
    /**
     *  enables manipulation features, remove column, reorder,...
     */
    manipulative: true,
    /**
     * automatically add a column pool at the end
     */
    pool: false,

    /**
     * the renderers to use for rendering the columns
     */
    renderers: merge({}, defaultRenderers)
  };

  private $container: Selection<any>;

  private body: IBodyRenderer = null;
  private header: HeaderRenderer = null;
  private pools: PoolRenderer[] = [];
  private contentScroller: ContentScroller = null;

  constructor(container: Selection<any> | Element, public data: DataProvider, config: ILineUpConfig = {}) {
    super();
    this.$container = container instanceof selection ? <Selection<any>>container : select(<Element>container);
    this.$container = this.$container.append('div').classed('lu', true);
    this.config.svgLayout = this.config.body;
    this.config.htmlLayout = this.config.header;

    merge(this.config, config);


    this.data.on(DataProvider.EVENT_SELECTION_CHANGED + '.main', this.triggerSelection.bind(this));

    this.header = new HeaderRenderer(data, this.node, merge({}, this.config.header, {
      idPrefix: this.config.idPrefix,
      manipulative: this.config.manipulative,
      histograms: this.config.renderingOptions.histograms,
      freezeCols: this.config.body.freezeCols,
    }));
    this.body = createBodyRenderer(this.config.body.renderer, data, this.node, this.slice.bind(this), merge({}, this.config.body, {
      meanLine: this.config.renderingOptions.meanLine,
      animation: this.config.renderingOptions.animation,
      stacked: this.config.renderingOptions.stacked,
      idPrefix: this.config.idPrefix,
      renderers: this.config.renderers
    }));
    //share hist caches
    this.body.histCache = this.header.sharedHistCache;

    this.forward(this.body, LineUp.EVENT_HOVER_CHANGED);
    if (this.config.pool && this.config.manipulative) {
      this.addPool(new PoolRenderer(data, this.node, this.config));
    }

    if (this.config.body.visibleRowsOnly) {
      this.contentScroller = new ContentScroller(<Element>this.$container.node(), this.body.node, {
        backupRows: this.config.body.backupScrollRows,
        rowHeight: this.config.body.rowHeight,
        topShift: () => this.header.currentHeight()
      });
      this.contentScroller.on(ContentScroller.EVENT_SCROLL, (top, left) => {
        //in two svg mode propagate horizontal shift
        //console.log(top, left,'ss');
        this.header.$node.style('transform', 'translate(' + 0 + 'px,' + top + 'px)');
        if (this.config.body.freezeCols > 0) {
          this.header.updateFreeze(left);
          this.body.updateFreeze(left);
        }
      });
      this.contentScroller.on(ContentScroller.EVENT_REDRAW, this.body.scrolled.bind(this.body));
    }
  }

  protected createEventList() {
    return super.createEventList().concat([LineUp.EVENT_HOVER_CHANGED, LineUp.EVENT_SELECTION_CHANGED, LineUp.EVENT_MULTISELECTION_CHANGED, LineUp.EVENT_UPDATE_START, LineUp.EVENT_UPDATE_FINISHED]);
  }

  /**
   * add and column pool at the given element position, with custom configuration
   * @param node the node element to attach
   * @param config
   */
  addPool(node: Element, config?: any): PoolRenderer;
  addPool(pool: PoolRenderer): PoolRenderer;
  addPool(pool_node: Element|PoolRenderer, config = this.config) {
    if (pool_node instanceof PoolRenderer) {
      this.pools.push(<PoolRenderer>pool_node);
    } else {
      this.pools.push(new PoolRenderer(this.data, <Element>pool_node, config));
    }
    return this.pools[this.pools.length - 1];
  }

  /**
   * returns the main lineup DOM element
   * @returns {Element}
   */
  get node() {
    return <Element>this.$container.node();
  }

  private slice(start: number, length: number, row2y: (i: number) => number) {
    if (this.contentScroller) {
      return this.contentScroller.select(start, length, row2y);
    }
    return {from: start, to: length};
  }

  /**
   * destroys the DOM elements created by this lineup instance, this should be the last call to this lineup instance
   */
  destroy() {
    this.pools.forEach((p) => p.remove());
    this.$container.remove();
    if (this.contentScroller) {
      this.contentScroller.destroy();
    }
  }

  /**
   * sorts LineUp by he given column
   * @param column callback function finding the column to sort
   * @param ascending
   * @returns {boolean}
   */
  sortBy(column: (col: Column) => boolean | string, ascending = false) {
    var col = this.data.find(column);
    if (col) {
      col.sortByMe(ascending);
    }
    return col !== null;
  }

  dump() {
    return this.data.dump();
  }

  changeDataStorage(data: DataProvider, dump?: any) {
    if (this.data) {
      this.data.on(DataProvider.EVENT_SELECTION_CHANGED + '.main', null);
    }
    this.data = data;
    if (dump) {
      this.data.restore(dump);
    }
    this.data.on(DataProvider.EVENT_SELECTION_CHANGED + '.main', this.triggerSelection.bind(this));
    this.header.changeDataStorage(data);
    this.body.changeDataStorage(data);
    this.pools.forEach((p) => p.changeDataStorage(data));
    this.update();
  }

  private triggerSelection(data_indices: number[]) {
    this.fire(LineUp.EVENT_SELECTION_CHANGED, data_indices.length > 0 ? data_indices[0] : -1);
    this.fire(LineUp.EVENT_MULTISELECTION_CHANGED, data_indices);
  }

  restore(dump: any) {
    this.changeDataStorage(this.data, dump);
  }

  /**
   * local variable that is used by update()
   * @type {boolean}
   */
  private isUpdateInitialized = false;

  update() {
    // HACK: when calling update for the first time the BodyRenderer
    // fires 3x the `renderFinished` event. However, we want to wait for
    // the last event before firing LineUp.EVENT_UPDATE_FINISHED.
    // For any further call of update() the body render will fire the
    // `renderFinished` event only once
    var waitForBodyRenderer = (this.isUpdateInitialized) ? 1 : 3;
    this.isUpdateInitialized = true;

    this.fire(LineUp.EVENT_UPDATE_START);
    this.header.update();
    this.body.update();
    this.pools.forEach((p) => p.update());

    this.body.on(ABodyRenderer.EVENT_RENDER_FINISHED + '.main', () => {
      waitForBodyRenderer -= 1;
      if (waitForBodyRenderer === 0) {
        this.fire(LineUp.EVENT_UPDATE_FINISHED);
      }
    });
  }

  changeRenderingOption(option: string, value: boolean) {
    this.config.renderingOptions[option] = value;
    if (option === 'animation' || option === 'stacked') {
      this.body.setOption(option, value);
      this.body.update();
    }
  }
}

/**
 * assigns colors to colmns if they are numbers and not yet defined
 * @param columns
 * @returns {model_.IColumnDesc[]}
 */
export function deriveColors(columns: IColumnDesc[]) {
  var colors = d3scale.category10().range().slice();
  columns.forEach((col: any) => {
    switch (col.type) {
      case 'number':
        col.color = colors.shift();
        break;
    }
  });
  return columns;
}
