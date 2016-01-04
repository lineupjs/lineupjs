/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

///<reference path='../typings/tsd.d.ts' />
import model_ = require('./model');
import provider_ = require('./provider');
import renderer_ = require('./renderer');
import ui_ = require('./ui');
import utils_ = require('./utils');
import ui_dialogs_ = require('./ui_dialogs');
import d3 = require('d3');

export var model = model_;
export var provider = provider_;
export var renderer = renderer_;
export var ui = ui_;
export var utils = utils_;
export var ui_dialogs = ui_dialogs_;


/**
 * main LineUp class managing data and rendering
 */
export class LineUp extends utils_.AEventDispatcher {
  /**
   * default config of LineUp with all available options
   *
   */
  config = {
    idPrefix: Math.random().toString(36).slice(-8).substr(0, 3), //generate a random string with length3
    numberformat: d3.format('.3n'),
    htmlLayout: {
      headerHeight: 20,
      headerOffset: 1,
      buttonTopPadding: 10,
      labelLeftPadding: 5
    },
    renderingOptions: {
      stacked: false,
      animation: true,
      visibleRowsOnly: true,
      histograms: false
    },
    svgLayout: {
      rowHeight: 17,
      rowPadding: 0.2, //padding for scale.rangeBands
      rowBarPadding: 1,

      visibleRowsOnly: true,
      /**
       * number of backup rows to keep to avoid updating on every small scroll thing
       */
      backupScrollRows: 4,
      animationDuration: 1000,

      //number of rows that should be frozen on the left side
      freezeRows: 0,

      rowActions: []
    },
    /* enables manipulation features, remove column, reorder,... */
    manipulative: true,
    interaction: {
      //enable the table tooltips
      tooltips: true,
      multiselect: () => {
        return false;
      },
      rangeselect: () => {
        return false;
      }
    },
    pool: false
  };

  private $container:d3.Selection<any>;

  private body:ui_.BodyRenderer = null;
  private header:ui_.HeaderRenderer = null;
  private pools:ui_.PoolRenderer[] = [];
  private contentScroller:utils_.ContentScroller = null;

  constructor(container:d3.Selection<any> | Element, public data:provider_.DataProvider, config:any = {}) {
    super();
    this.$container = container instanceof d3.selection ? <d3.Selection<any>>container : d3.select(<Element>container);
    this.$container = this.$container.append('div').classed('lu', true);
    utils.merge(this.config, config);

    this.data.on('selectionChanged.main', this.triggerSelection.bind(this));

    this.header = new ui_.HeaderRenderer(data, this.node, {
      manipulative: this.config.manipulative,
      headerHeight: this.config.htmlLayout.headerHeight,
      histograms : this.config.renderingOptions.histograms
    });
    this.body = new ui_.BodyRenderer(data, this.node, this.slice.bind(this), {
      rowHeight: this.config.svgLayout.rowHeight,
      rowPadding: this.config.svgLayout.rowPadding,
      rowBarPadding: this.config.svgLayout.rowBarPadding,
      animationDuration: this.config.svgLayout.animationDuration,
      animation: this.config.renderingOptions.animation,
      stacked: this.config.renderingOptions.stacked,
      actions: this.config.svgLayout.rowActions,
      idPrefix: this.config.idPrefix
    });
    this.forward(this.body, 'hoverChanged');
    if (this.config.pool && this.config.manipulative) {
      this.addPool(new ui_.PoolRenderer(data, this.node, this.config));
    }

    if (this.config.svgLayout.visibleRowsOnly) {
      this.contentScroller = new utils_.ContentScroller(<Element>this.$container.node(), this.body.node, {
        backupRows: this.config.svgLayout.backupScrollRows,
        rowHeight: this.config.svgLayout.rowHeight,
        topShift: this.config.htmlLayout.headerHeight
      });
      this.contentScroller.on('scroll', (top, left) => {
        //in two svg mode propagate horizontal shift
        //console.log(top, left,'ss');
        this.header.$node.style('transform', 'translate(' + 0 + 'px,' + top + 'px)');
        if (this.config.svgLayout.freezeRows > 0) {
         this.header.updateFreeze(this.config.svgLayout.freezeRows, left);
         this.body.updateFreeze(this.config.svgLayout.freezeRows, left);
        }
      });
      this.contentScroller.on('redraw', this.body.update.bind(this.body));
    }
  }

  createEventList() {
    return super.createEventList().concat(['hoverChanged', 'selectionChanged', 'multiSelectionChanged']);
  }

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

  sortBy(column:(col:model_.Column) => boolean | string, ascending = false) {
    var col = this.data.find(column);
    if (col) {
      col.sortByMe(ascending);
    }
    return col !== null;
  }

  dump() {
    var s = this.data.dump();
    return s;
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
    this.fire('selectionChanged', data_indices.length > 0 ? data_indices[0] : -1);
    this.fire('multiSelectionChanged', data_indices);
  }

  restore(dump:any) {
    this.changeDataStorage(this.data, dump);
  }

  update() {
    this.header.update();
    this.body.update();
    this.pools.forEach((p) => p.update());
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
 * @returns {LocalDataProvider}
 */
export function createLocalStorage(data:any[], columns:model_.IColumnDesc[]) {
  return new provider_.LocalDataProvider(data, columns);
}

export function create(data:provider_.DataProvider, container:d3.Selection<any> | Element, config:any = {}) {
  return new LineUp(container, data, config);
}

