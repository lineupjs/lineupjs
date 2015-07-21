/*global d3, jQuery */
/**
 * Constructor to Create a LineUp Visualization
 * @param spec - the specifications object
 * @param spec.storage - a LineUp Storage, see {@link LineUpLocalStorage}
 * @constructor
 */
var LineUp;
(function (LineUp, d3, $, undefined) {

  function LineUpClass(spec, $container, config) {
    var $defs, scroller;
    this.storage = spec.storage;
    this.spec = spec;
//    this.sortedColumn = [];
    this.$container = $container;
    this.tooltip = LineUp.createTooltip($container.node());
    //trigger hover event
    this.listeners = d3.dispatch('hover','change-sortcriteria','change-filter', 'selected','multiselected');

    this.config = $.extend(true, {}, LineUp.defaultConfig, config, {
      //TODO internal stuff, should to be extracted
      columnBundles: {
        primary: {
          sortedColumn: null,
          sortingOrderAsc: true,
          prevRowScale : null
        }
      }});
    this.storage.config = this.config;
    if (!this.config.svgLayout.addPlusSigns) {
      this.config.svgLayout.plusSigns={}; // empty plusSign if no plus signs needed
    }


    
    //create basic structure
    if (this.config.svgLayout.mode === 'combined') {
      //within a single svg with 'fixed' header
      $container.classed('lu-mode-combined', true);
      this.$table = $container.append('svg').attr('class', 'lu');
      $defs = this.$table.append('defs');
      $defs.append('defs').attr('class', 'columnheader');
      $defs.append('defs').attr('class', 'column');
      $defs.append('defs').attr('class', 'overlay');
      this.$body = this.$table.append('g').attr('class','body').attr('transform', 'translate(0,' + this.config.htmlLayout.headerHeight + ')');
      this.$header = this.$table.append('g').attr('class', 'header');
      this.$bodySVG = this.$headerSVG = this.$table;

      scroller = this.initScrolling($($container.node()), this.config.htmlLayout.headerHeight);
    } else {
      //within two svgs with a dedicated header
      $container.classed('lu-mode-separate', true);
      this.$table = $container;
      this.$headerSVG = this.$table.append('svg').attr('class', 'lu lu-header');
      this.$headerSVG.attr('height',this.config.htmlLayout.headerHeight);
      this.$headerSVG.append('defs').attr('class', 'columnheader');
      this.$header = this.$headerSVG.append('g');
      this.$bodySVG = this.$table.append('div').attr('class','lu-wrapper').append('svg').attr('class','lu lu-body');
      $defs = this.$bodySVG.append('defs');
      $defs.append('defs').attr('class', 'column');
      $defs.append('defs').attr('class', 'overlay');
      this.$body = this.$bodySVG;
      scroller = this.initScrolling($($container.node()).find('div.lu-wrapper'), 0);
    }
    this.selectVisible = scroller.selectVisible;
    this.onScroll = scroller.onScroll;

    this.$header.append('rect').attr({
      width: '100%',
      height: this.config.htmlLayout.headerHeight,
      fill: 'lightgray'
    });
    this.$header.append('g').attr('class', 'main');
    this.$header.append('g').attr('class', 'overlay');

    this.headerUpdateRequired = true;
    this.stackedColumnModified = null;

    this.dragWeight = this.initDragging();

    return this;
  }


  LineUp.prototype = LineUpClass.prototype = $.extend(LineUpClass.prototype, LineUp.prototype);
  LineUp.create = function (storage, $container, options) {
    if (!('storage' in storage)) { // TODO: was '!$.isPlainObject(storage)'
      storage = { storage: storage };

    }
    var r = new LineUpClass(storage, $container, options);
    r.startVis();
    return r;
  };

  LineUp.prototype.scrolled = function (top, left) {
    if (this.config.svgLayout.mode === 'combined') {
      //in single svg mode propagate vertical shift
      this.$header.attr('transform', 'translate(0,' + top + ')');
    } else {
      //in two svg mode propagate horizontal shift
      this.$header.attr('transform', 'translate('+-left+',0)');
    }
  };

  /**
   * default config of LineUp with all available options
   *
   */
  LineUp.defaultConfig = {
    colorMapping: d3.map(),
    columnColors: d3.scale.category20(),
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
      rowActions: [
        /*{
         name: 'explore',
         icon: '\uf067',
         action: function(row) {
         console.log(row);
         }
         }*/]
    },
    /* enables manipulation features, remove column, reorder,... */
    manipulative: true,
    interaction: {
      //enable the table tooltips
      tooltips: true,
      multiselect: function() { return false; },
      rangeselect: function() { return false; }
    },
    filter: {
      skip: 0,
      limit: Number.POSITIVE_INFINITY,
      filter: undefined
    }
  };

  LineUp.prototype.on = function(type, listener) {
    if (arguments.length < 2) {
      return this.listeners.on(type);
    }
    this.listeners.on(type, listener);
    return this;
  };

  LineUp.prototype.changeDataStorage = function (spec) {
//    d3.select('#lugui-table-header-svg').selectAll().remove();
    this.storage = spec.storage;
    this.storage.config = this.config;
    this.spec = spec;
    this.config.columnBundles.primary.sortedColumn = null;
    this.headerUpdateRequired = true;
    delete this.prevRowScale;
    this.startVis();
  };

  /**
   * change a rendering option
   * @param option
   * @param value
   */
  LineUp.prototype.changeRenderingOption = function (option, value) {
    var v = this.config.renderingOptions[option];
    if (v === value) {
      return;
    }
    this.config.renderingOptions[option] = value;
    if (option === 'histograms') {
      if (value) {
        this.storage.resortData({ filteredChanged: true});
      }
    }
    this.updateAll(true);
  };

  /**
   * the function to start the LineUp visualization
   */
  LineUp.prototype.startVis = function () {
    this.assignColors(this.storage.getRawColumns());
    this.headerUpdateRequired = true;
    //initial sort
    this.storage.resortData({});
    this.updateAll();
  };

  LineUp.prototype.assignColors = function (columns) {
    //Color schemes are in config (.columnColors / .grayColor)

    // clear map
    var config = this.config;
    config.colorMapping = d3.map();

    var colCounter = 0;

    columns.forEach(function (d) {
      if (d.color) {
        config.colorMapping.set(d.id, d.color);
      } else if ((d instanceof LineUp.LineUpStringColumn) || (d.id === 'rank')) {
        // gray columns are:
        config.colorMapping.set(d.id, config.grayColor);
      } else {
        config.colorMapping.set(d.id, config.columnColors(colCounter));
        colCounter++;
      }
    });
    //console.log(config.colorMapping);
  };

  LineUp.prototype.updateAll = function (stackTransition, bundle) {
    var that = this;
    function updateBundle(b) {
      var cols = that.storage.getColumnLayout(b);
      that.updateHeader(cols);
      that.updateBody(cols, that.storage.getData(b), stackTransition || false);
    }
    if (bundle) {
      updateBundle(bundle);
    } else {
      Object.keys(this.storage.bundles).forEach(updateBundle);
    }
  };

  /**
   * sort by a column given by name
   * @param column
   * @param asc
   * @returns {boolean}
   */
  LineUp.prototype.sortBy = function (column, asc) {
    column = column || this.storage.primaryKey;
    asc = asc || false;

    var d = this.storage.getColumnByName(column);
    if (!d) {
      return false;
    }
    var bundle = this.config.columnBundles[d.columnBundle];
    bundle.sortingOrderAsc = asc;
    bundle.sortedColumn = d;

    this.listeners['change-sortcriteria'](this, d, bundle.sortingOrderAsc);
    this.storage.resortData({column: d, asc: bundle.sortingOrderAsc});
    this.updateAll(false, d.columnBundle);
  };

  /**
   * toggles the stacked rendering of this table
   */
  LineUp.prototype.toggleStackedRendering = function () {
    this.config.renderingOptions.stacked = !this.config.renderingOptions.stacked;
    this.updateAll(true);
  };

  /**
   * toggles whether values are rendered all the time
   */
  LineUp.prototype.toggleValueRendering = function () {
    this.config.renderingOptions.values = !this.config.renderingOptions.values;
    this.updateAll(true);
  };

  /**
   * set the limits to simulate pagination, similar to SQL skip and limit
   * @param skip start number
   * @param limit number or rows
   */
  LineUp.prototype.setLimits = function (skip, limit) {
    this.config.filter.skip = skip;
    this.config.filter.limit = limit;
    //trigger resort to apply skip
    this.storage.resortData({});
    this.updateAll();
  };

  /**
   * change the weights of the selected column
   * @param column
   * @param weights
   * @returns {boolean}
   */
  LineUp.prototype.changeWeights = function (column, weights) {
    if (typeof column === 'string') {
      column = this.storage.getColumnByName(column);
    }
    column = column || this.config.columnBundles.primary.sortedColumn;
    var bundle = column.columnBundle;
    if (!(column instanceof LineUp.LayoutStackedColumn)) {
      return false;
    }
    column.updateWeights(weights);
    //trigger resort
    if (column === this.config.columnBundles[bundle].sortedColumn) {
      this.listeners['change-sortcriteria'](this, column, this.config.columnBundles[bundle]);
      this.storage.resortData({ key: bundle });
    }
    this.updateAll(false, bundle);
    return true;
  };

    /**
     * manually change/set the filter of a column
     * @param column
     * @param filter
     */
  LineUp.prototype.changeFilter = function (column, filter) {
    if (typeof column === 'string') {
      column = this.storage.getColumnByName(column);
    }
    column.filter = filter;
    this.listeners['change-filter'](this, column);
    this.storage.resortData({filteredChanged: true});
    this.updateBody();
  };

  /**
   * destroys the DOM elements created by this lineup instance, this should be the last call to this lineup instance
   */
  LineUp.prototype.destroy = function () {
    //remove tooltip
    this.tooltip.destroy();
    this.$container.selectAll('*').remove();
    if (this.config.svgLayout.mode === 'combined') {
      this.$container.off('scroll', this.onScroll);
    }
  };
}(LineUp || (LineUp = {}), d3, jQuery));
