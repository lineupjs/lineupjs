/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

///<reference path='../typings/tsd.d.ts' />
import model = require('./model');
import provider = require('./provider');
import utils = require('./utils');
import d3 = require('d3');

export class LineUp extends utils.AEventDispatcher {
  /**
   * default config of LineUp with all available options
   *
   */
  private config = {
    grayColor: '#999999',
    numberformat: d3.format('.3n'),
    htmlLayout: {
      headerHeight: 50,
      headerOffset: 1,
      buttonTopPadding: 10,
      labelLeftPadding: 5,
      buttonRightPadding: 15,
      buttonWidth: 13
    },
    renderingOptions: {
      stacked: false,
      values: false,
      animation: true,
      histograms: false
    },
    svgLayout: {
      /**
       * mode of this lineup instance, either combined = a single svg with header and body combined or separate ... separate header and body
       */
      mode: 'combined', //modes: combined vs separate
      rowHeight: 17,
      rowPadding : 0.2, //padding for scale.rangeBands
      rowBarPadding: 1,
      /**
       * number of backup rows to keep to avoid updating on every small scroll thing
       */
      backupScrollRows: 4,
      animationDuration: 1000,
      addPlusSigns:false,
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
    filter: {
      skip: 0,
      limit: Number.POSITIVE_INFINITY,
      filter: undefined
    }
  };

  private $container : d3.Selection<any>;
  private $header : d3.Selection<any>;
  private $table: d3.Selection<any>;
  private $body: d3.Selection<any>;
  private $bodySVG: d3.Selection<any>;
  private $headerSVG: d3.Selection<any>;

  private scroller: utils.ContentScroller;

  constructor(container : d3.Selection<any> | Element, public data: provider.DataProvider, config: any = {}) {
    super();
    this.$container = container instanceof d3.selection ? <d3.Selection<any>>container : d3.select(<Element>container);
    //TODO merge the incoming config this.config

    utils.merge(this.config, config);

    //create basic structure
    if (this.config.svgLayout.mode === 'combined') {
      //within a single svg with 'fixed' header
      this.$container.classed('lu-mode-combined', true);
      this.$table = this.$container.append('svg').attr('class', 'lu');
      var $defs = this.$table.append('defs');
      $defs.append('defs').attr('class', 'columnheader');
      $defs.append('defs').attr('class', 'column');
      $defs.append('defs').attr('class', 'overlay');
      this.$body = this.$table.append('g').attr('class','body').attr('transform', 'translate(0,' + this.config.htmlLayout.headerHeight + ')');
      this.$header = this.$table.append('g').attr('class', 'header');
      this.$bodySVG = this.$headerSVG = this.$table;

      this.scroller = new utils.ContentScroller(<Element>this.$container.node(), <Element>this.$table.node(), {
        topShift: this.config.htmlLayout.headerHeight,
        backupRows: this.config.svgLayout.backupScrollRows,
        rowHeight : this.config.svgLayout.rowHeight
      });
    } else {
      //within two svgs with a dedicated header
      this.$container.classed('lu-mode-separate', true);
      this.$table = this.$container;
      this.$headerSVG = this.$table.append('svg').attr('class', 'lu lu-header');
      this.$headerSVG.attr('height',this.config.htmlLayout.headerHeight);
      this.$headerSVG.append('defs').attr('class', 'columnheader');
      this.$header = this.$headerSVG.append('g');
      this.$bodySVG = this.$table.append('div').attr('class','lu-wrapper').append('svg').attr('class','lu lu-body');
      var $defs = this.$bodySVG.append('defs');
      $defs.append('defs').attr('class', 'column');
      $defs.append('defs').attr('class', 'overlay');
      this.$body = this.$bodySVG;
      this.scroller = new utils.ContentScroller(<Element>this.$container.select('div.lu-wrapper').node(), <Element>this.$table.node(), {
        topShift: 0,
        backupRows: this.config.svgLayout.backupScrollRows,
        rowHeight : this.config.svgLayout.rowHeight
      });
    }
    this.$header.append('rect').attr({
      width: '100%',
      height: this.config.htmlLayout.headerHeight,
      'class': 'headerbg'
    });
    this.$header.append('g').attr('class', 'main');
    this.$header.append('g').attr('class', 'overlay');

    this.scroller.on('scroll', (top, left) => this.scrolled(top, left));
    this.scroller.on('redraw', () => this.renderBody());
  }

  private renderBody() {
    console.log('TODO');
  }

  createEventList() {
    return super.createEventList().concat(['hover','change-sortcriteria','change-filter', 'selected','multiselected']);
  }

  private scrolled(top, left) {
    if (this.config.svgLayout.mode === 'combined') {
      //in single svg mode propagate vertical shift
      this.$header.attr('transform', 'translate(0,' + top + ')');
    } else {
      //in two svg mode propagate horizontal shift
      this.$header.attr('transform', 'translate('+-left+',0)');
    }
  }


  /**
   * destroys the DOM elements created by this lineup instance, this should be the last call to this lineup instance
   */
  destroy() {
    this.scroller.destroy();
    this.$container.selectAll('*').remove();
    if (this.config.svgLayout.mode === 'combined') {
      this.$container.on('scroll.lineup', null);
    }
  }

  sortBy(column : (col: model.Column) => boolean | string, ascending = false) {
    var col = this.data.find(column);
    if (col) {
      col.sortByMe(ascending);
    }
    return col !== null;
  }
}
