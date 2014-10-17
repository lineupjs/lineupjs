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
    this.storage = spec.storage;
    this.spec = spec;
//    this.sortedColumn = [];
    this.$container = $container;
    this.$table = $container.append('svg').attr('class', 'lu');
    this.tooltip = LineUp.createTooltip($container.node());

    this.config = $.extend(true, {}, LineUp.defaultConfig, config, {
      //TODO internal stuff, should to be extracted
      columnBundles: {
        "primary": {
          sortedColumn: null,
          sortingOrderAsc: true
        },
        "secondary": {
          sortedColumn: [],
          sortingOrderAsc: true
        }
      }});
    this.storage.config = this.config;

    //create basic structure
    var $defs = this.$table.append('defs');
    $defs.append('defs').attr('class', 'columnheader');
    $defs.append('defs').attr('class', 'column');
    $defs.append('defs').attr('class', 'overlay');
    this.$body = this.$table.append('g').attr('transform', 'translate(0,' + this.config.htmlLayout.headerHeight + ')');
    this.$header = this.$table.append('g').attr('class', 'header');
    this.$header.append('rect').attr({
      width: '100%',
      height: this.config.htmlLayout.headerHeight,
      fill: 'lightgray'
    });
    this.$header.append('g').attr('class', 'main');
    this.$header.append('g').attr('class', 'overlay');

    this.headerUpdateRequired = true;
    this.stackedColumnModified = null;

    var r = this.initScrolling($($container.node()));
    this.selectVisible = r.selectVisible;
    this.onScroll = r.onScroll;

    this.dragWeight = this.initDragging();

    return this;
  }

  LineUp.prototype = LineUpClass.prototype = $.extend(LineUpClass.prototype, LineUp.prototype);
  LineUp.create = function (storage, $container, options) {
    if (!$.isPlainObject(storage)) {
      storage = { storage: storage };
    }
    var r = new LineUpClass(storage, $container, options);
    r.startVis();
    return r;
  };

  LineUp.prototype.scrolled = function (top) {
    this.$header.attr('transform', 'translate(0,' + top + ')');
    //TODO use second argument left
  };

  /**
   * default config of LineUp with all available options
   *
   */
  LineUp.defaultConfig = {
    colorMapping: d3.map(),
    columnColors: d3.scale.category20(),
    grayColor: "#999999",
    numberformat: d3.format('.3n'),
    htmlLayout: {
      headerHeight: 50
    },
    renderingOptions: {
      stacked: false,
      values: false,
      animation: true
    },
    svgLayout: {
      rowHeight: 20,
      /**
       * number of backup rows to keep to avoid updating on every small scroll thing
       */
      backupScrollRows: 4,
      animationDuration: 1000,
      plusSigns: {
        /* addStackedColumn: {
         title: "add stacked column",
         action: "addNewEmptyStackedColumn",
         x: 0, y: 2,
         w: 21, h: 21 // LineUpGlobal.htmlLayout.headerHeight/2-4
         }*/
      },
      rowActions: [
        /*{
         name: "explore",
         icon: "\uf067",
         action: function(row) {
         console.log(row);
         }
         }*/]
    },
    /* enables manipulation features, remove column, reorder,... */
    manipulative: true,
    interaction: {
      //enable the table tooltips
      tooltips: true
    },
    filter: {
      skip: 0,
      limit: Number.POSITIVE_INFINITY,
      filter: undefined
    }
  };

  LineUp.prototype.changeDataStorage = function (spec) {
//    d3.select("#lugui-table-header-svg").selectAll().remove();
    this.storage = spec.storage;
    this.storage.config = this.config;
    this.spec = spec;
    this.config.columnBundles.primary.sortedColumn = null;
    this.headerUpdateRequired = true;
    delete this.prevRowScale;
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

  LineUp.prototype.assignColors = function (headers) {
    //Color schemes are in config (.columnColors / .grayColor)

    // clear map
    var config = this.config;
    config.colorMapping = d3.map();

    var colCounter = 0;

    headers.forEach(function (d) {
      if (d.color) {
        config.colorMapping.set(d.id, d.color);
      } else if ((d instanceof LineUp.LineUpStringColumn) || (d.id === "rank")) {
        // gray columns are:
        config.colorMapping.set(d.id, config.grayColor);
      } else {
        config.colorMapping.set(d.id, config.columnColors(colCounter));
        colCounter++;
      }
    });
    //console.log(config.colorMapping);
  };

  LineUp.prototype.updateAll = function (stackTransition) {
    this.updateHeader(this.storage.getColumnLayout());
    this.updateBody(this.storage.getColumnLayout(), this.storage.getData(), stackTransition || false);
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

    this.storage.resortData({column: d, asc: bundle.sortingOrderAsc});
    this.updateAll();
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
    if (!(column instanceof LineUp.LayoutStackedColumn)) {
      return false;
    }
    column.updateWeights(weights);
    //trigger resort
    if (column === this.config.columnBundles.primary.sortedColumn) {
      this.storage.resortData({});
    }
    this.updateAll();
    return true;
  };

  /**
   * destroys the DOM elements created by this lineup instance, this should be the last call to this lineup instance
   */
  LineUp.prototype.destroy = function () {
    //clear the svg elements
    this.$header.selectAll('*').remove();
    this.$body.selectAll('*').remove();
    //remove tooltip
    this.tooltip.destroy();
    this.$container.off('scroll', this.onScroll);
  };
}(LineUp || (LineUp = {}), d3, jQuery));
