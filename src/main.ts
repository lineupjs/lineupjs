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


export class LineUp extends utils_.AEventDispatcher {
  /**
   * default config of LineUp with all available options
   *
   */
  config = {
    numberformat: d3.format('.3n'),
    htmlLayout: {
      headerHeight: 50,
      headerOffset: 1,
      buttonTopPadding: 10,
      labelLeftPadding: 5,
    },
    renderingOptions: {
      stacked: false,
      animation: true
    },
    svgLayout: {
      rowHeight: 17,
      rowPadding : 0.2, //padding for scale.rangeBands
      rowBarPadding: 1,
      /**
       * number of backup rows to keep to avoid updating on every small scroll thing
       */
      backupScrollRows: 4,
      animationDuration: 1000,
      plusSigns: {
        addStackedColumn: {
          title: 'add stacked column',
          action: 'addNewEmptyStackedColumn',
          x: 0, y: 2,
          w: 21, h: 21 // LineUpGlobal.htmlLayout.headerHeight/2-4
        }
      },
      rowActions: new Array<{name: string; icon: string; action: (row: any) => void; }>()
        /*{
         name: 'explore',
         icon: '\uf067',
         action: function(row) {
         console.log(row);
         }
         }*/
    },
    /* enables manipulation features, remove column, reorder,... */
    manipulative: true,
    interaction: {
      //enable the table tooltips
      tooltips: true,
      multiselect: () => { return false; },
      rangeselect: () => { return false; }
    },
    pool: false
  };

  private $container : d3.Selection<any>;

  private body : ui_.BodyRenderer = null;
  private header : ui_.HeaderRenderer = null;
  private pool: ui_.PoolRenderer = null;

  constructor(container : d3.Selection<any> | Element, public data: provider_.DataProvider, config: any = {}) {
    super();
    this.$container = container instanceof d3.selection ? <d3.Selection<any>>container : d3.select(<Element>container);
    this.$container = this.$container.append('div').classed('lu', true);
    utils.merge(this.config, config);

    this.header = new ui_.HeaderRenderer(data,  this.node, this.config);
    this.body = new ui_.BodyRenderer(data, this.node, this.config);
    if(this.config.pool) {
      this.pool = new ui_.PoolRenderer(data, this.node, this.config);
    }
  }
  createEventList() {
    return super.createEventList().concat(['hoverChanged', 'selectionChanged']);
  }

  get node() {
    return <Element>this.$container.node();
  }

  /**
   * destroys the DOM elements created by this lineup instance, this should be the last call to this lineup instance
   */
  destroy() {
    this.$container.selectAll('*').remove();
  }

  sortBy(column : (col: model_.Column) => boolean | string, ascending = false) {
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

  changeDataStorage(data: provider_.DataProvider, dump?: any) {
    this.data = data;
    if (dump) {
      this.data.restore(dump);
    }
    this.header.changeDataStorage(data);
    this.body.changeDataStorage(data);
    if (this.pool) {
      this.pool.changeDataStorage(data);
    }
    this.update();
  }

  restore(dump: any) {
    this.changeDataStorage(this.data, dump);
  }

  update() {
    this.header.update();
    this.body.update();
    if (this.pool) {
      this.pool.update();
    }
  }

  changeRenderingOption(option: string, value: boolean) {
    //TODO
  }
}

export function createLocalStorage(data: any[], columns: provider_.IColumnDesc[]) {
  return new provider_.LocalDataProvider(data, columns);
}

export function create(container : d3.Selection<any> | Element, data: provider_.DataProvider, config: any = {}) {
  return new LineUp(container, data, config);
}
