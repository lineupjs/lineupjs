/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */

import './style.scss';
import * as model_ from './model';
import * as provider_  from './provider';
import * as renderer_  from './renderer';
import * as ui_  from './ui';
import * as utils_  from './utils';
import * as ui_dialogs_ from './ui_dialogs';
import * as d3 from 'd3';

/**
 * access to the model module
 * @type {--global-type--}
 */
export var model = model_;
/**
 * access to the provider module
 * @type {--global-type--}
 */
export var provider = provider_;
/**
 * access to the renderer module
 * @type {--global-type--}
 */
export var renderer = renderer_;
/**
 * access to the ui module
 * @type {--global-type--}
 */
export var ui = ui_;
/**
 * access to the utils module
 * @type {--global-type--}
 */
export var utils = utils_;
/**
 * access to the ui_dialogs module
 * @type {--global-type--}
 */
export var ui_dialogs = ui_dialogs_;


/**
 * main LineUp class managing data and rendering
 */
export class LineUp extends utils_.AEventDispatcher {
  /**
   * triggered when the mouse is over a specific row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static EVENT_HOVER_CHANGED = 'hoverChanged';

  /**
   * triggered when the user click on a row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static EVENT_SELECTION_CHANGED = 'selectionChanged';

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
  config = {
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
      rankingButtons: <ui_.IRankingHook>ui_.dummyRankingButtonHook,

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
      rowHeight: 17,
      rowPadding: 0.2, //padding for scale.rangeBands
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

      rowActions: []
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
    renderers: renderer_.renderers()
  };

  private $container:d3.Selection<any>;

  private body:ui_.IBodyRenderer = null;
  private header:ui_.HeaderRenderer = null;
  private pools:ui_.PoolRenderer[] = [];
  private contentScroller:utils_.ContentScroller = null;

  constructor(container:d3.Selection<any> | Element, public data:provider_.DataProvider, config:any = {}) {
    super();
    this.$container = container instanceof d3.selection ? <d3.Selection<any>>container : d3.select(<Element>container);
    this.$container = this.$container.append('div').classed('lu', true);
    this.config.svgLayout = this.config.body;
    this.config.htmlLayout = this.config.header;

    utils.merge(this.config, config);


    this.data.on('selectionChanged.main', this.triggerSelection.bind(this));

    this.header = new ui_.HeaderRenderer(data, this.node, {
      manipulative: this.config.manipulative,
      headerHeight: this.config.header.headerHeight,
      headerHistogramHeight: this.config.header.headerHistogramHeight,
      histograms : this.config.renderingOptions.histograms,

      autoRotateLabels: this.config.header.autoRotateLabels,
      rotationHeight: this.config.header.rotationHeight, //in px
      rotationDegree:  this.config.header.rotationDegree, //in deg

      freezeCols: this.config.body.freezeCols,

      rankingButtons: this.config.header.rankingButtons,
      linkTemplates: this.config.header.linkTemplates
    });
    this.body = new (this.config.body.renderer === 'svg' ? ui_.BodyRenderer: ui_.BodyCanvasRenderer)(data, this.node, this.slice.bind(this), {
      rowHeight: this.config.body.rowHeight,
      rowPadding: this.config.body.rowPadding,
      rowBarPadding: this.config.body.rowBarPadding,
      animationDuration: this.config.body.animationDuration,
      meanLine: this.config.renderingOptions.meanLine,
      animation: this.config.renderingOptions.animation,
      stacked: this.config.renderingOptions.stacked,
      actions: this.config.body.rowActions,
      idPrefix: this.config.idPrefix,

      freezeCols: this.config.body.freezeCols,
      renderers: this.config.renderers
    });
    //share hist caches
    this.body.histCache = this.header.sharedHistCache;

    this.forward(this.body, LineUp.EVENT_HOVER_CHANGED);
    if (this.config.pool && this.config.manipulative) {
      this.addPool(new ui_.PoolRenderer(data, this.node, this.config));
    }

    if (this.config.body.visibleRowsOnly) {
      this.contentScroller = new utils_.ContentScroller(<Element>this.$container.node(), this.body.node, {
        backupRows: this.config.body.backupScrollRows,
        rowHeight: this.config.body.rowHeight,
        topShift: () => this.header.currentHeight()
      });
      this.contentScroller.on('scroll', (top, left) => {
        //in two svg mode propagate horizontal shift
        //console.log(top, left,'ss');
        this.header.$node.style('transform', 'translate(' + 0 + 'px,' + top + 'px)');
        if (this.config.body.freezeCols > 0) {
         this.header.updateFreeze(left);
         this.body.updateFreeze(left);
        }
      });
      this.contentScroller.on('redraw', this.body.update.bind(this.body));
    }
  }

  createEventList() {
    return super.createEventList().concat([LineUp.EVENT_HOVER_CHANGED, LineUp.EVENT_SELECTION_CHANGED, LineUp.EVENT_MULTISELECTION_CHANGED, LineUp.EVENT_UPDATE_START, LineUp.EVENT_UPDATE_FINISHED]);
  }

  /**
   * add and column pool at the given element position, with custom configuration
   * @param node the node element to attach
   * @param config
   */
  addPool(node:Element, config?:any):ui_.PoolRenderer;
  addPool(pool:ui_.PoolRenderer):ui_.PoolRenderer;
  addPool(pool_node:Element|ui_.PoolRenderer, config = this.config) {
    if (pool_node instanceof ui_.PoolRenderer) {
      this.pools.push(<ui_.PoolRenderer>pool_node);
    } else {
      this.pools.push(new ui_.PoolRenderer(this.data, <Element>pool_node, config));
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

  private slice(start:number, length:number, row2y:(i:number) => number) {
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
  sortBy(column:(col:model_.Column) => boolean | string, ascending = false) {
    var col = this.data.find(column);
    if (col) {
      col.sortByMe(ascending);
    }
    return col !== null;
  }

  dump() {
    return this.data.dump();
  }

  changeDataStorage(data:provider_.DataProvider, dump?:any) {
    if (this.data) {
      this.data.on('selectionChanged.main', null);
    }
    this.data = data;
    if (dump) {
      this.data.restore(dump);
    }
    this.data.on('selectionChanged.main', this.triggerSelection.bind(this));
    this.header.changeDataStorage(data);
    this.body.changeDataStorage(data);
    this.pools.forEach((p) => p.changeDataStorage(data));
    this.update();
  }

  private triggerSelection(data_indices:number[]) {
    this.fire(LineUp.EVENT_SELECTION_CHANGED, data_indices.length > 0 ? data_indices[0] : -1);
    this.fire(LineUp.EVENT_MULTISELECTION_CHANGED, data_indices);
  }

  restore(dump:any) {
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

    this.body.on('renderFinished', () => {
      waitForBodyRenderer -= 1;
      if(waitForBodyRenderer === 0)   {
        this.fire(LineUp.EVENT_UPDATE_FINISHED);
      }
    });
  }

  changeRenderingOption(option:string, value:boolean) {
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
export function deriveColors(columns:model_.IColumnDesc[]) {
  var colors = d3.scale.category10().range().slice();
  columns.forEach((col:any) => {
    switch (col.type) {
      case 'number':
        col.color = colors.shift();
        break;
    }
  });
  return columns;
}

/**
 * creates a local storage provider
 * @param data
 * @param columns
 * @param options
 * @returns {LocalDataProvider}
 */
export function createLocalStorage(data:any[], columns:model_.IColumnDesc[], options = {}) {
  return new provider_.LocalDataProvider(data, columns, options);
}

export function create(data:provider_.DataProvider, container:d3.Selection<any> | Element, config:any = {}) {
  return new LineUp(container, data, config);
}

