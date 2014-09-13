
/**
 * Constructor to Create a LineUp Visualization
 * @param spec - the specifications object
 * @param spec.storage - a LineUp Storage, see {@link LineUpLocalStorage}
 * @constructor
 */
var LineUp = function (spec, $header, $body, config) {
  this.storage = spec.storage;
  this.spec = spec;
//    this.sortedColumn = [];
  this.$header = $header;
  this.$body = $body;

  //create basic structure
  this.$header.append('defs').attr('class','column');
  this.$header.append('g').attr('class','main');
  this.$header.append('g').attr('class','overlay');
  var $defs = this.$body.append('defs');
  $defs.append('defs').attr('class','column');
  $defs.append('defs').attr('class','overlay');

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

  this.headerUpdateRequired = true;
  this.stackedColumnModified = null;

  var that = this;

  /*
   * define dragging behaviour for header weights
   * */

  function dragWeightStarted() {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
  }


  function draggedWeight() {
    var newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
    that.reweightHeader({column: d3.select(this).data()[0], value: newValue});
    that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), false)
  }

  function dragWeightEnded() {
    d3.select(this).classed("dragging", false);

    if (that.config.columnBundles.primary.sortedColumn instanceof LayoutStackedColumn) {
      that.storage.resortData({column: that.config.columnBundles.primary.sortedColumn});
      that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), false);
    }
//        that.updateBody(that.storage.getColumnLayout(), that.storage.getData())

//      that.updateAll();
    // TODO: integrate columnbundles dynamically !!
  }


  this.dragWeight = d3.behavior.drag()
    .origin(function (d) {
      return d;
    })
    .on("dragstart", dragWeightStarted)
    .on("drag", draggedWeight)
    .on("dragend", dragWeightEnded);
};

/**
 * default config of LineUp with all available options
 *
 */
LineUp.defaultConfig = {
  colorMapping: d3.map(),
  columnColors: d3.scale.category20(),
  grayColor: "#999999",
  numberformat : d3.format('.3n'),
  htmlLayout: {
    headerHeight: 50
  },
  renderingOptions: {
    stacked: false
  },
  svgLayout: {
    rowHeight: 20,
    plusSigns: {
      /* addStackedColumn: {
       title: "add stacked column",
       action: "addNewEmptyStackedColumn",
       x: 0, y: 2,
       w: 21, h: 21 // LineUpGlobal.htmlLayout.headerHeight/2-4
       }*/
    },
    rowActions : [
      /*{
       name: "explore",
       icon: "\uf067",
       action: function(row) {
       console.log(row);
       }
       }*/]
  },
  /* enables manipualation features, remove colum, reorder,... */
  manipulative: true
};

LineUp.prototype.changeDataStorage = function (spec) {
//    d3.select("#lugui-table-header-svg").selectAll().remove();
  this.storage = spec.storage;
  this.storage.config = this.config;
  this.spec = spec;
  this.config.columnBundles.primary.sortedColumn = null;
};

/**
 * the function to start the LineUp visualization
 */
LineUp.prototype.startVis = function () {
  this.assignColors(this.storage.getRawColumns());
  //initial sort
  //this.storage.resortData({});
  this.updateAll();
};

LineUp.prototype.updateAll = function (stackTransition) {
  this.updateHeader(this.storage.getColumnLayout());
  this.updateBody(this.storage.getColumnLayout(), this.storage.getData(), stackTransition || false)
};

/**
 * sort by a column given by name
 * @param column
 * @param asc
 * @returns {boolean}
 */
LineUp.prototype.sortBy = function(column, asc) {
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
LineUp.prototype.toggleStackedRendering = function() {
  this.config.renderingOptions.stacked = !this.config.renderingOptions.stacked;
  this.updateAll(true);
};

/**
 * change the weights of the selected column
 * @param column
 * @param weights
 * @returns {boolean}
 */
LineUp.prototype.changeWeights = function(column, weights) {
  if (typeof column === 'string') {
    column = this.storage.getColumnByName(column)
  }
  column = column || this.config.columnBundles.primary.sortedColumn;
  if (!(column instanceof LayoutStackedColumn)) {
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