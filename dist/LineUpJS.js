/*! LineUpJS - v0.1.0 - 2014-10-21
* https://github.com/Caleydo/lineup.js
* Copyright (c) 2014 ; Licensed BSD */
(function() {
  function LineUpLoader(jQuery, d3, _) {

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
    if (this.config.svgLayout.mode === 'combined') {
      //within a single svg with "fixed" header
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
      this.$header = this.$table.append('svg').attr('class', 'lu lu-header');
      this.$header.attr('height',this.config.htmlLayout.headerHeight);
      this.$header.append('defs').attr('class', 'columnheader');
      this.$headerSVG = this.$header;
      this.$body = this.$table.append('div').attr('class','lu-wrapper').append('svg').attr('class','lu lu-body');
      $defs = this.$body.append('defs');
      $defs.append('defs').attr('class', 'column');
      $defs.append('defs').attr('class', 'overlay');
      this.$bodySVG = this.$body;
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
    if (!$.isPlainObject(storage)) {
      storage = { storage: storage };
    }
    var r = new LineUpClass(storage, $container, options);
    r.startVis();
    return r;
  };

  LineUp.prototype.scrolled = function (top) {
    if (this.config.svgLayout.mode === 'combined') {
      this.$header.attr('transform', 'translate(0,' + top + ')');
    }
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
      /**
       * mode of this lineup instance, either combined = a single svg with header and body combined or separate ... separate header and body
       */
      mode: 'combined', //modes: combined vs separate
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
    //remove tooltip
    this.tooltip.destroy();
    this.$container.selectAll('*').remove();
    if (this.config.svgLayout.mode === 'combined') {
      this.$container.off('scroll', this.onScroll);
    }
  };
}(LineUp || (LineUp = {}), d3, jQuery));

/*global d3, jQuery, _ */
var LineUp;
(function (LineUp, d3, $, _, undefined) {
  /**
   * The mother of all Columns
   * @param desc The descriptor object
   * @class
   */
  function LineUpColumn(desc) {
    this.column = desc.column;
    this.label = desc.label || desc.column;
    this.color = desc.color;
    this.id = (desc.id || this.column).replace(/[\s!\'#$%&'\(\)\*\+,\.\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, '_'); //replace non css stuff to _
    this.missingValue = desc.missingValue;
    this.layout = {};
  }

  LineUp.LineUpColumn = LineUpColumn;

  LineUpColumn.prototype = $.extend({}, {}, {
    getValue: function (row) {
      var r = row[this.column];
      if (typeof r === "undefined") {
        return this.missingValue;
      }
      return r;
    },
    getRawValue: function (row) {
      var r = this.getValue(row);
      if (typeof r === 'undefined') {
        return '';
      }
      return r;
    },
    filter: function (/*row, filter*/) {
      return true;
    }
  });

  /**
   * A {@link LineUpColumn} implementation for Numbers
   * @param desc The descriptor object
   * @constructor
   * @extends LineUpColumn
   */
  function LineUpNumberColumn(desc) {
    LineUpColumn.call(this, desc);

    this.scale = d3.scale.linear().clamp(true)
      .domain(desc.domain || [0, 100]).range(desc.range || [0, 1]);
    this.scaleOri = this.scale.copy();
    if (typeof this.missingValue === "undefined") {
      this.missingValue = NaN;
    }
  }

  LineUp.LineUpNumberColumn = LineUpNumberColumn;

  LineUpNumberColumn.prototype = $.extend({}, LineUpColumn.prototype, {
    getValue: function (row) {
      var r = LineUpColumn.prototype.getValue.call(this, row);
      if (r === '' || r.toString().trim().length === 0) {
        r = this.missingValue;
      }
      return this.scale(+r);
    },
    getRawValue: function (row) {
      var r = LineUpColumn.prototype.getValue.call(this, row);
      if (isNaN(r)) {
        return '';
      }
      return r;
    },
    filter: function (row, filter) {
      var r = this.getValue(row);
      if (isNaN(filter)) {
        return !isNaN(r);
      } else if (typeof filter === 'number') {
        return r >= filter;
      } else if (Array.isArray(filter)) {
        return filter[0] <= r && r <= filter[1];
      }
    }
  });

  /**
   *A {@link LineUpColumn} implementation for Strings
   * @param desc The description object
   * @constructor
   * @extends LineUpColumn
   */
  function LineUpStringColumn(desc) {
    LineUpColumn.call(this, desc);
  }

  LineUp.LineUpStringColumn = LineUpStringColumn;

  LineUpStringColumn.prototype = $.extend({}, LineUpColumn.prototype, {
    filter: function (row, filter) {
      var r = this.getValue(row);
      if (typeof r === 'boolean') {
        return r && r.trim().length > 0;
      } else if (typeof filter === 'string' && filter.length > 0) {
        return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      } else if (filter instanceof RegExp) {
        return r && r.match(filter);
      }
      return true;
    }
  });

  /**
   * A {@link LineUpColumn} implementation for Rank Values
   * @param desc The description object
   * @constructor
   * @extends LineUpColumn
   */
  function LineUpRankColumn(desc, storage) {
    LineUpColumn.call(this, desc);
    this.label = desc.label || "Rank";
    //maps keys to ranks
    this.values = d3.map();
    this.storage = storage;
  }

  LineUp.LineUpRankColumn = LineUpRankColumn;

  LineUpRankColumn.prototype = $.extend({}, LineUpColumn.prototype, {
    setValue: function (row, d) {
      this.values.set(row[this.storage.primaryKey], d);
    },
    getValue: function (row) {
      return this.values.get(row[this.storage.primaryKey]);
    },
    filter: function (row, filter) {
      var r = this.getValue(row);
      if (typeof r === 'undefined') {
        return true;
      } else if (typeof filter === 'number') {
        return r >= filter;
      } else if (Array.isArray(filter)) {
        return filter[0] <= r && r <= filter[1];
      }
    }
  });


  /**
   *  --- FROM HERE ON ONLY Layout Columns ---
   */

  function LayoutColumn(desc) {
    var that = this;
    this.columnWidth = desc.width || 100;
    this.id = _.uniqueId("Column_");

    //from normalized value to width value
    this.scale = d3.scale.linear().domain([0, 1]).range([0, that.columnWidth]);
    this.filter = desc.filter;

    this.parent = desc.parent; // or null
    this.columnBundle = desc.columnBundle || "primary";
    //define it here to have a dedicated this pointer
    this.sortBy = function (a, b) {
      a = that.column.getValue(a);
      b = that.column.getValue(b);
      return that.safeSortBy(a, b);
    };
  }

  LineUp.LayoutColumn = LayoutColumn;

  LayoutColumn.prototype = $.extend({}, {}, {
    setColumnWidth: function (newWidth, ignoreParent) {
      this.columnWidth = newWidth;
      this.scale.range([0, newWidth]);
      if (!ignoreParent && this.parent) {
        this.parent.updateWidthFromChild({id: this.id, newWidth: newWidth});
      }
    },
    getColumnWidth: function () {
      return this.columnWidth;
    },
    safeSortBy: function (a, b) {
      var an = typeof a === 'number' && isNaN(a);
      var bn = typeof b === 'number' && isNaN(b);
      if (an && bn) {
        return 0;
      }
      if (an) {
        return 1;
      }
      if (bn) {
        return -1;
      }
      return d3.descending(a, b);
    },

    flattenMe: function (array) {
      array.push(this);
    },
    description: function () {
      var res = {};
      res.width = this.columnWidth;
      res.columnBundle = this.columnBundle;
      res.filter = this.filter;

      return res;
    },
    makeCopy: function () {
      return new LayoutColumn(this.description());
    },
    isFiltered: function () {
      return typeof this.filter !== 'undefined';
    },
    filterBy: function (/*row*/) {
      return true;
    }
  });

  function LayoutSingleColumn(desc, rawColumns) {
    LayoutColumn.call(this, desc);
    this.columnLink = desc.column;
    var that = this;
    this.column = (desc.column === "") ? null : rawColumns.filter(function (d) {
      return d.id === that.columnLink;
    })[0];
    this.id = _.uniqueId(this.columnLink + "_");
    if (this.column) {
      this.init();
    }
  }

  LineUp.LayoutSingleColumn = LayoutSingleColumn;

  LayoutSingleColumn.prototype = $.extend({}, LayoutColumn.prototype, {

    init: function () {
      /*if (this.column.hasOwnProperty("scale") && this.column.scale != null) {
       this.scale.domain(this.column.scale.domain());
       }*/

    },
    // ONLY for numerical columns
    getWidth: function (row) {
      var r = this.column.getValue(row);
      if (isNaN(r) || typeof r === 'undefined') {
        return 0;
      }
      return this.scale(r);
    },

    filterBy: function (row) {
      if (typeof this.filter === 'undefined' || !this.column) {
        return true;
      }
      return this.column.filter(row, this.filter);
    },

    getLabel: function () {
      return this.column.label;
    },
    getDataID: function () {
      return this.column.id;
    },

    description: function () {
      var res = LayoutColumn.prototype.description.call(this);
      res.column = this.columnLink;
      return res;
    },
    makeCopy: function () {
      var description = this.description();
      description.column = "";
      var res = new LayoutSingleColumn(description);
      res.columnLink = this.columnLink.slice(0);
      res.column = this.column;
      res.id = _.uniqueId(this.columnLink + "_");

      res.init();
      return res;
    }

  });


  function LayoutRankColumn(desc, _dummy, _dummy2, storage) {
    LayoutColumn.call(this, desc ? desc : {}, []);
    this.columnLink = 'rank';
    this.columnWidth = desc ? (desc.width || 50) : 50;
    this.column = new LineUpRankColumn({column: "rank"}, storage);
    this.id = _.uniqueId(this.columnLink + "_");
  }

  LineUp.LayoutRankColumn = LayoutRankColumn;


  LayoutRankColumn.prototype = $.extend({}, LayoutColumn.prototype, {
    getLabel: function () {
      return this.column.label;
    },
    getDataID: function () {
      return this.column.id;
    },
    description: function () {
      var res = LayoutColumn.prototype.description.call(this);
      res.type = "rank";
      return res;
    },
    makeCopy: function () {
      var description = this.description();
      var res = new LayoutRankColumn(description, null, null, this.column.storage);
      return res;
    }

  });


// TODO: maybe remove??
  function LayoutCompositeColumn(desc, rawColumns) {
    LayoutColumn.call(this, desc, rawColumns);
    this.childrenLinks = desc.children || [];
    this.label = desc.label || this.id;
  }

  LineUp.LayoutCompositeColumn = LayoutCompositeColumn;

  LayoutCompositeColumn.prototype = $.extend({}, LayoutColumn.prototype, {
    getDataID: function () {
      return this.id;
    },
    getLabel: function () {
      return this.label;
    }
  });


  function LayoutStackedColumn(desc, rawColumns, toLayoutColumn) {
    LayoutCompositeColumn.call(this, desc, rawColumns);
    this.childrenWeights = [];
    this.childrenWidths = [];
    this.toLayoutColumn = toLayoutColumn;
    this.children = [];
    this.emptyColumns = [];
    this.init(desc);
    var that = this;
    this.sortBy = function (a, b) {
      var aAll = 0;
      var bAll = 0;
      that.children.forEach(function (d) {
        aAll += d.getWidth(a);
        bAll += d.getWidth(b);
      });
      return that.safeSortBy(aAll, bAll);
    };
  }

  LineUp.LayoutStackedColumn = LayoutStackedColumn;

  LayoutStackedColumn.prototype = $.extend({}, LayoutCompositeColumn.prototype, {

    getValue: function (row) {
      // TODO: a caching strategy might work here
      var that = this;
      var all = 0;
      this.children.forEach(function (d, i) {
        var r = d.column.getValue(row);
        if (isNaN(r) || typeof r === 'undefined') {
          r = 0;
        }
        all += r * that.childrenWeights[i];
      });
      return all;
    },
    init: function (desc) {
      var that = this;
      if (this.childrenLinks.length < 1) {
        this.emptyColumns.push(new LayoutEmptyColumn({parent: that}));
      } else {
        // check if weights or width are given
        if (this.childrenLinks[0].hasOwnProperty("weight")) {
          this.childrenWeights = this.childrenLinks.map(function (d) {
            return +(d.weight || 1);
          });

          this.scale.domain([0, d3.sum(this.childrenWeights)]);

          if (desc.hasOwnProperty('width')) {
            // if the stacked column has a width -- normalize to width
            this.childrenWidths = this.childrenWeights.map(function (d) {
              return that.scale(d);
            });
          } else {
            // if width was artificial set, approximate a total width of x*100
            this.columnWidth = this.children.length * 100;
            this.scale.range([0, that.columnWidth]);
          }
        } else {
          // accumulate weights and map 100px to  weight 1.0
          this.childrenWidths = this.childrenLinks.map(function (d) {
            return +(d.width || 100);
          });
          this.childrenWeights = this.childrenWidths.map(function (d) {
            return d / 100.0;
          });
          this.columnWidth = d3.sum(this.childrenWidths);
          this.scale.domain([0, d3.sum(this.childrenWeights)]).range([0, this.columnWidth]);
        }
        this.children = this.childrenLinks.map(function (d, i) {
          return that.toLayoutColumn({column: d.column, width: that.childrenWidths[i], parent: that });
        });
      }
    },
    flattenMe: function (array, spec) {
      var addEmptyColumns = false;
      if (spec) {
        addEmptyColumns = spec.addEmptyColumns || false;
      }
      array.push(this);
      this.children.forEach(function (d) {
        d.flattenMe(array);
      });

      if (addEmptyColumns) {
        this.emptyColumns.forEach(function (d) {
          return d.flattenMe(array);
        });
      }
    },
    filterBy: function (row) {
      if (typeof this.filter === 'undefined') {
        return true;
      }
      var val = this.getValue(row);
      if (typeof this.filter === 'number') {
        return val <= this.filter;
      } else if (Array.isArray(this.filter)) {
        return this.filter[0] <= val && val <= this.filter[1];
      }
      return true;
    },
    updateWidthFromChild: function () {
      var that = this;

      // adopt weight and global size
      this.childrenWidths = this.children.map(function (d) {
        return d.getColumnWidth();
      });
      this.childrenWeights = this.childrenWidths.map(function (d) {
        return that.scale.invert(d);
      });

      this.columnWidth = d3.sum(this.childrenWidths);
      this.scale.range([0, this.columnWidth]);
      this.scale.domain([0, d3.sum(this.childrenWeights)]);
    },
    setColumnWidth: function (newWidth) {
      var that = this;
      this.columnWidth = newWidth;
      that.scale.range([0, this.columnWidth]);
      this.childrenWidths = this.childrenWeights.map(function (d) {
        return that.scale(d);
      });
//        console.log(this.childrenWidths, this.childrenWeights);
      this.children.forEach(function (d, i) {
        return d.setColumnWidth(that.childrenWidths[i], true);
      });
    },
    updateWeights: function (weights) {
      this.childrenWeights = weights;
      this.scale.domain([0, d3.sum(this.childrenWeights)]);

      var that = this;
      this.childrenWidths = this.childrenWeights.map(function (d) {
        return that.scale(d);
      });
      this.columnWidth = d3.sum(this.childrenWidths);
      this.children.forEach(function (d, i) {
        return d.setColumnWidth(that.childrenWidths[i], true);
      });

      //console.log(this.childrenWeights);
      //console.log(this.childrenWidths);
    },
    removeChild: function (child) {
      var indexOfChild = this.children.indexOf(child);
      var that = this;
      this.childrenWeights.splice(indexOfChild, 1);
      this.childrenWidths.splice(indexOfChild, 1);

      this.columnWidth = d3.sum(this.childrenWidths);
      this.scale.range([0, this.columnWidth]);
      this.scale.domain([0, d3.sum(this.childrenWeights)]);


      this.children.splice(indexOfChild, 1);
      child.parent = null;
      if (this.children.length < 1) {
        this.emptyColumns = [new LineUp.LayoutEmptyColumn({parent: that})];
        this.columnWidth = 100;
      }

    },
    addChild: function (child, targetChild, position) {
      if (!(child instanceof LineUp.LayoutSingleColumn && child.column instanceof LineUp.LineUpNumberColumn)) {
        return false;
      }

      var targetIndex = 0;
      if (targetChild instanceof LineUp.LayoutEmptyColumn) {
        this.emptyColumns = [];
      } else {
        targetIndex = this.children.indexOf(targetChild);
        if (position === "r") {
          targetIndex++;
        }
      }

      this.childrenWeights.splice(targetIndex, 0, this.scale.invert(child.getColumnWidth()));
      this.childrenWidths.splice(targetIndex, 0, child.getColumnWidth());

      this.columnWidth = d3.sum(this.childrenWidths);
      this.scale.range([0, this.columnWidth]);
      this.scale.domain([0, d3.sum(this.childrenWeights)]);

      child.parent = this;
      this.children.splice(targetIndex, 0, child);

//        console.log("added Child:",this.children[targetIndex]);

      return true;

    },
    description: function () {
      var res = LayoutColumn.prototype.description.call(this);
      res.type = "stacked";
      var that = this;
      res.children = this.children.map(function (d, i) {
        return {column: d.columnLink, weight: that.childrenWeights[i]};
      });
      res.label = this.label;
      return res;
    },
    makeCopy: function () {
      var that = this;
      var description = that.description();
      description.childrenLinks = [];
      var res = new LayoutStackedColumn(description, {}, that.toLayoutColumn);

      res.children = that.children.map(function (d) {
        return d.makeCopy();
      });
      res.children.forEach(function (d) {
        d.parent = res;
      });
      res.childrenWeights = this.childrenWeights.slice(0);
      res.scale.domain([0, d3.sum(this.childrenWeights)]);
      res.childrenWidths = this.childrenWeights.map(function (d) {
        return that.scale(d);
      });

      return res;
    }
  });


  function LayoutEmptyColumn(spec) {
    LayoutColumn.call(this, spec, []);
    this.columnLink = 'empty';
    this.column = {
      getValue: function () {
        return "";
      },
      getRawValue: function () {
        return "";
      }};
    this.id = _.uniqueId(this.columnLink + "_");
    this.label = "{empty}";
    this.columnWidth = 50;
  }

  LineUp.LayoutEmptyColumn = LayoutEmptyColumn;

  LayoutEmptyColumn.prototype = $.extend({}, LayoutColumn.prototype, {
    getLabel: function () {
      return this.label;
    },
    getDataID: function () {
      return this.id;
    }
  });


  function LayoutActionColumn(spec) {
    spec = spec || {};
    LayoutColumn.call(this, spec, []);
    this.columnLink = 'action';
    this.column = {
      getValue: function () {
        return "";
      },
      getRawValue: function () {
        return "";
      }};
    this.id = _.uniqueId(this.columnLink + "_a");
    this.label = "";
    this.columnWidth = spec.width || 50;
  }

  LineUp.LayoutActionColumn = LayoutActionColumn;

  LayoutActionColumn.prototype = $.extend({}, LayoutColumn.prototype, {
    getLabel: function () {
      return this.label;
    },
    getDataID: function () {
      return this.id;
    },
    description: function () {
      var res = LayoutColumn.prototype.description.call(this);
      res.type = 'actions';
      return res;
    }
  });
}(LineUp || (LineUp = {}), d3, jQuery, _));
/* global d3, jQuery, window, document */
var LineUp;
(function (LineUp, d3, $, undefined) {
  LineUp.prototype = LineUp.prototype || {};
  /**
   * creates a simple popup window with a table
   * @param title
   * @param label optional if an input field is
   * @param options optional options like the dimension of the popup
   * @returns {{popup: *, table: *, remove: remove, onOK: onOK}}
   */
  function createPopup(title, label, options) {
    options = $.extend({}, options, {
      x: +(window.innerWidth) / 2 - 100,
      y: 100,
      width: 400,
      height: 200
    });
    var popupBG = d3.select("body")
      .append("div").attr("class", "lu-popupBG");

    var popup = d3.select("body").append("div")
      .attr({
        "class": "lu-popup"
      }).style({
        left: options.x + "px",
        top: options.y + "px",
        width: options.width + "px",
        height: options.height + "200px"
      })
      .html(
        '<span style="font-weight: bold">' + title + '</span>' +
        (label ? '<input type="text" id="popupInputText" size="35" value="' + label + '"><br>' : '') +
        '<div class="selectionTable"></div>' +
        '<button class="cancel"><i class="fa fa-times"></i> cancel</button>' +
        '<button class="ok"><i class="fa fa-check"></i> ok</button>'
    );

    var theTable = popup.select(".selectionTable").style({
      width: (options.width - 10) + "px",
      height: (options.height - 40) + "px"
    }).append("table");

    popup.select(".cancel").on("click", function () {
      popupBG.remove();
      popup.remove();
    });

    return {
      popup: popup,
      table: theTable,
      remove: function () {
        popup.remove();
        popupBG.remove();
      },
      onOK: function (handler) {
        return popup.select(".ok").on("click", handler);
      }
    };
  }

  LineUp.prototype.addNewStackedColumnDialog = function () {
    var that = this;

    var popup = createPopup('add stacked column:', 'Stacked');
    // list all data rows !
    var trData = that.storage.getRawColumns().filter(function (d) {
      return (d instanceof LineUp.LineUpNumberColumn);
    }).map(function (d) {
      return {d: d, isChecked: false, weight: 1.0};
    });

    var trs = popup.table.selectAll("tr").data(trData);
    trs.enter().append("tr");
    trs.append("td").attr("class", "checkmark");
    trs.append("td").attr("class", "datalabel").style("opacity", 0.8).text(function (d) {
      return d.d.label;
    });
    trs.append("td").append("input").attr({
      class: "weightInput",
      type: "text",
      value: function (d) {
        return d.weight;
      },
      'disabled': true,
      size: 5
    }).on("input", function (d) {
      d.weight = +this.value;
      redraw();
    });

    function redraw() {
      var trs = popup.table.selectAll("tr").data(trData);
      trs.select(".checkmark").html(function (d) {
        return (d.isChecked) ? '<i class="fa fa-check-square-o"></i>' : '<i class="fa fa-square-o"></i>';
      })
        .on("click", function (d) {
          d.isChecked = !d.isChecked;
          redraw();
        });
      trs.select(".datalabel").style("opacity", function (d) {
        return d.isChecked ? "1.0" : ".8";
      });
      trs.select(".weightInput").attr('disabled', function (d) {
        return d.isChecked ? null : true;
      });
    }

    redraw();


    popup.onOK(function () {
      var name = document.getElementById("popupInputText").value;
      if (name.length < 1) {
        window.alert("name must not be empty");
        return;
      }
      //console.log(name, trData);

      var allChecked = trData.filter(function (d) {
        return d.isChecked;
      });

      //console.log(allChecked);
      var desc = {
        label: name,
        width: (Math.max(allChecked.length * 100, 100)),
        children: allChecked.map(function (d) {
          return {column: d.d.id, weight: d.weight};
        })
      };

      that.storage.addStackedColumn(desc);
      popup.remove();
      that.headerUpdateRequired = true;
      that.updateAll();
    });

  };

  LineUp.prototype.addNewSingleColumnDialog = function () {
    var that = this;
    var popup = createPopup('add single columns', undefined);
    // list all data rows !
    var trData = that.storage.getRawColumns()
//        .filter(function(d){return (d instanceof LineUpNumberColumn);})
      .map(function (d) {
        return {d: d, isChecked: false, weight: 1.0};
      });

    var trs = popup.table.selectAll("tr").data(trData);
    trs.enter().append("tr");
    trs.append("td").attr("class", "checkmark");
    trs.append("td").attr("class", "datalabel").style("opacity", 0.8).text(function (d) {
      return d.d.label;
    });


    function redraw() {
      var trs = popup.table.selectAll("tr").data(trData);
      trs.select(".checkmark").html(function (d) {
        return '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>';
      })
        .on("click", function (d) {
          d.isChecked = !d.isChecked;
          redraw();
        });
      trs.select(".datalabel").style("opacity", function (d) {
        return d.isChecked ? "1.0" : ".8";
      });
    }

    redraw();


    popup.onOK(function () {
      var allChecked = trData.filter(function (d) {
        return d.isChecked;
      });

//        console.log(allChecked);
//        var desc = {
//            label:name,
//            width:(Math.max(allChecked.length*100,100)),
//            children:allChecked.map(function(d){return {column: d.d.id, weight: d.weight};})
//        }

      allChecked.forEach(function (d) {
        that.storage.addSingleColumn({column: d.d.id});
      });

      popup.remove();
      that.headerUpdateRequired = true;
      that.updateAll();
    });
  };

  LineUp.prototype.reweightStackedColumnWidget = function (data, $table) {
    var toWeight = function (d) {
      return d.weight;
    };
    var predictScale = d3.scale.linear().domain([0, d3.max(data, toWeight)]).range([0, 120]);
    var trs = $table.selectAll("tr").data(data);
    var config = this.config;

    trs.enter().append("tr");
//    trs.append("td").attr("class", "checkmark")
    trs.append("td")
      .style({
        width: "20px"
      })
      .append("input").attr({
        class: "weightInput",
        type: "text",
        value: function (d) {
          return d.weight;
        },
        size: 5
      }).on("input", function (d) {
        data[d.index].weight = +this.value;
        redraw();
      });

    trs.append("td").append("div").attr("class", "predictBar").style({
      width: function (d) {
        return predictScale(d.weight) + "px";
      },
      height: 20 + "px",
      "background-color": function (d) {
        return config.colorMapping.get(d.dataID);
      }
    });

    trs.append("td").attr("class", "datalabel").text(function (d) {
      return d.d;
    });

    function redraw() {
      var trs = $table.selectAll("tr").data(data);
      predictScale.domain([0, d3.max(data, toWeight)]);
      trs.select(".predictBar").transition().style({
        width: function (d) {
          return predictScale(d.weight) + "px";
        }
      });
    }

    redraw();
  };

  LineUp.prototype.reweightStackedColumnDialog = function (col) {
    var that = this;
    var popup = createPopup('re-weight column "' + col.label + '"', undefined);

    //console.log(col.childrenWeights);
    // list all data rows !
    var trData = col.children
      .map(function (d, i) {
        return {
          d: d.column.label,
          dataID: d.getDataID(),
          weight: +col.childrenWeights[i],
          index: i
        };
      });

    this.reweightStackedColumnWidget(trData, popup.table);

    popup.onOK(function () {
      popup.remove();
      that.changeWeights(col, trData.map(function (d) {
        return d.weight;
      }));
    });
  };

  LineUp.prototype.openMappingEditor = function (selectedColumn, $button) {
    var col = selectedColumn.column;
    var bak = col.scale;
    var that = this;
    var act = bak;
    var callback = function (newscale) {
      //scale = newscale;
      act = newscale.clamp(true);
    };

    var popup = d3.select("body").append("div")
      .attr({
        "class": "lu-popup"
      }).style({
        left: +(window.innerWidth) / 2 - 100 + "px",
        top: 100 + "px",
        width: "420px",
        height: "450px"
      })
      .html(
        '<div style="font-weight: bold"> change mapping: </div>' +
        '<div class="mappingArea"></div>' +
        '<button class="cancel"><i class="fa fa-times"></i> cancel</button>' +
        '<button class="reset"><i class="fa fa-undo"></i> revert</button>' +
        '<button class="ok"><i class="fa fa-check"></i> ok</button>'
    );
    var access = function (row) {
      return +col.getRawValue(row);
    };
    var editor = LineUp.mappingEditor(bak, col.scaleOri.domain(), this.storage.data, access, callback);
    popup.select('.mappingArea').call(editor);

    function isSame(a, b) {
      return $(a).not(b).length === 0 && $(b).not(a).length === 0;
    }

    popup.select(".ok").on("click", function () {
      col.scale = act;
      //console.log(act.domain().toString(), act.range().toString());
      $button.classed('filtered', !isSame(act.range(), col.scaleOri.range()) || !isSame(act.domain(), col.scaleOri.domain()));
      that.storage.resortData({});
      that.updateAll(true);
      popup.remove();
    });
    popup.select(".cancel").on("click", function () {
      col.scale = bak;
      $button.classed('filtered', !isSame(bak.range(), col.scaleOri.range()) || !isSame(bak.domain(), col.scaleOri.domain()));
      popup.remove();
    });
    popup.select(".reset").on("click", function () {
      act = bak = col.scale = col.scaleOri;
      $button.classed('filtered', false);
      editor = LineUp.mappingEditor(bak, col.scaleOri.domain(), that.storage.data, access, callback);
      popup.selectAll('.mappingArea *').remove();
      popup.select('.mappingArea').call(editor);
    });
  };

  /**
   * handles the rendering and action of StackedColumn options menu
   * @param selectedColumn -- the stacked column
   */
  LineUp.prototype.stackedColumnOptionsGui = function (selectedColumn) {
    //console.log(selectedColumn);
    var config = this.config;
    var svgOverlay = this.$header.select(".overlay");
    var that = this;
    // remove when clicked on already selected item
    var disappear = (this.stackedColumnModified === selectedColumn);
    if (disappear) {
      svgOverlay.selectAll(".stackedOption").remove();
      this.stackedColumnModified = null;
      return;
    }



    function removeStackedColumn(col) {
      that.storage.removeColumn(col);
      that.headerUpdateRequired = true;
      that.updateAll();
    }

    function renameStackedColumn(col) {
      var x = +(window.innerWidth) / 2 - 100;
      var y = +100;

      var popup = d3.select("body").append("div")
        .attr({
          "class": "lu-popup"
        }).style({
          left: x + "px",
          top: y + "px",
          width: "200px",
          height: "70px"

        })
        .html(
          '<div style="font-weight: bold"> rename column: </div>' +
          '<input type="text" id="popupInputText" size="20" value="' + col.label + '"><br>' +
          '<button class="cancel"><i class="fa fa-times"></i> cancel</button>' +
          '<button class="ok"><i class="fa fa-check"></i> ok</button>'
      );

      popup.select(".ok").on("click", function() {
        var newValue = document.getElementById("popupInputText").value;
        if (newValue.length > 0) {
          that.storage.setColumnLabel(col, newValue);
          that.updateHeader(that.storage.getColumnLayout());
          popup.remove();
        } else {
          window.alert("non empty string required");
        }
      });

      popup.select(".cancel").on("click", function () {
        popup.remove();
      });
    }

    // else:
    this.stackedColumnModified = selectedColumn;
    var options = [
      {name: "\uf014 remove", action: removeStackedColumn},
      {name: "\uf044 rename", action: renameStackedColumn},
      {name: "\uf0ae re-weight", action: that.reweightStackedColumnDialog}
    ];

    var menuLength = options.length * 100;

    var stackedOptions = svgOverlay.selectAll(".stackedOption").data([
      {d: selectedColumn, o: options}
    ]);
    stackedOptions.exit().remove();


    var stackedOptionsEnter = stackedOptions.enter().append("g")
      .attr({
        "class": "stackedOption",
        "transform": function (d) {
          return "translate(" + (d.d.offsetX + d.d.columnWidth - menuLength) + "," + (config.htmlLayout.headerHeight / 2 - 2) + ")";
        }
      });
    stackedOptionsEnter.append("rect").attr({
      x: 0,
      y: 0,
      width: menuLength,
      height: config.htmlLayout.headerHeight / 2 - 4
    });
    stackedOptionsEnter.selectAll("text").data(function (d) {
      return d.o;
    }).enter().append("text")
      .attr({
        x: function (d, i) {
          return i * 100 + 5;
        },
        y: config.htmlLayout.headerHeight / 4 - 2
      })
      .text(function (d) {
        return d.name;
      });

    stackedOptions.selectAll("text").on("click", function (d) {
      svgOverlay.selectAll(".stackedOption").remove();
      d.action.call(that, selectedColumn);
    });

    stackedOptions.transition().attr({
      "transform": function (d) {
        return "translate(" + (d.d.offsetX + d.d.columnWidth - menuLength) + "," + (config.htmlLayout.headerHeight / 2 - 2) + ")";
      }
    });
  };

  LineUp.prototype.openFilterPopup = function (column, $button) {
    if (!(column instanceof LineUp.LayoutSingleColumn && column.column instanceof LineUp.LineUpStringColumn)) {
      //can't filter other than string columns
      return;
    }
    var pos = $(this.$header.node()).offset();
    pos.left += column.offsetX;
    pos.top += column.offsetY;
    var bak = column.filter || '';

    var popup = d3.select("body").append("div")
      .attr({
        "class": "lu-popup2"
      }).style({
        left: pos.left + "px",
        top: pos.top + "px"
      })
      .html(
        '<form onsubmit="return false"><input type="text" id="popupInputText" placeholder="containing..." autofocus="true" size="18" value="' + bak + '"><br>' +
        '<button class="ok"><i class="fa fa-check" title="ok"></i></button>' +
        '<button class="cancel"><i class="fa fa-times" title="cancel"></i></button>' +
        '<button class="reset"><i class="fa fa-undo" title="reset"></i></button></form>'
    );

    var that = this;

    function updateData(filter) {
      column.filter = filter;
      $button.classed('filtered', (filter && filter.length > 0));
      that.storage.resortData({});
      that.updateBody();
    }

    popup.select(".cancel").on("click", function () {
      document.getElementById("popupInputText").value = bak;
      updateData(bak);
      popup.remove();
    });
    popup.select(".reset").on("click", function () {
      document.getElementById("popupInputText").value = '';
      updateData(null);
    });
    popup.select(".ok").on("click", function () {
      updateData(document.getElementById("popupInputText").value);
      popup.remove();
    });
  };

  LineUp.createTooltip = function (container) {
    var $container = $(container), $tooltip = $('<div class="lu-tooltip"/>').appendTo($container);

    function showTooltip(content, xy) {
      $tooltip.html(content).css({
        left: xy.x + "px",
        top: (xy.y + xy.height) + "px"
      }).fadeIn();

      var stickout = ($(window).height() + $(window).scrollTop()) <= ((xy.y + xy.height) + $tooltip.height() - 20);
      var stickouttop = $(window).scrollTop() > (xy.y - $tooltip.height());
      if (stickout && !stickouttop) { //if the bottom is not visible move it on top of the box
        $tooltip.css('top', (xy.y - $tooltip.height()) + "px");
      }
    }

    function hideTooltip() {
      $tooltip.stop(true).hide();
    }

    function moveTooltip(xy) {
      if (xy.x) {
        $tooltip.css({
          left: xy.x + "px"
        });
      }
      if (xy.y) {
        $tooltip.css({
          top: xy.y + "px"
        });
      }
    }

    function sizeOfTooltip() {
      return [$tooltip.width(), $tooltip.height()];
    }

    function destroyTooltip() {
      $tooltip.remove();
    }

    return {
      show: showTooltip,
      hide: hideTooltip,
      move: moveTooltip,
      size: sizeOfTooltip,
      destroy: destroyTooltip
    };
  };

  LineUp.prototype.initScrolling = function ($container, topShift) {
    var that = this,
      container = $container[0],
      rowHeight = this.config.svgLayout.rowHeight,
      prevScrollTop = container.scrollTop,
      jbody = $(this.$table.node()),
      backupRows = this.config.svgLayout.backupScrollRows,
      shift;

    function onScroll() {
      var act = container.scrollTop;
      var left = container.scrollLeft;
      //at least one row changed
      that.scrolled(act, left);
      if (Math.abs(prevScrollTop - act) >= rowHeight * backupRows) {
        prevScrollTop = act;
        that.updateBody();
      }
    }

    $container.on('scroll', onScroll);
    //the shift between the scroll container our svg body
    shift = jbody.offset().top - $container.offset().top + topShift;
    //use a resize sensor of a utility lib to also detect resize changes
    //new ResizeSensor($container, function() {
    //  console.log(container.scrollHeight, container.scrollTop, $container.innerHeight(), $container.height(), "resized");
    //  that.updateBody();
    //});
    function selectVisibleRows(data, rowScale) {
      var top = container.scrollTop - shift,
        bottom = top + $container.innerHeight(),
        i = 0, j;
      if (top > 0) {
        i = Math.round(top / rowHeight);
        //count up till really even partial rows are visible
        while (i >= 0 && rowScale(data[i + 1]) > top) {
          i--;
        }
        i -= backupRows; //one more row as backup for scrolling
      }
      { //some parts from the bottom aren't visible
        j = Math.round(bottom / rowHeight);
        //count down till really even partial rows are visible
        while (j <= data.length && rowScale(data[j - 1]) < bottom) {
          j++;
        }
        j += backupRows; //one more row as backup for scrolling
      }
      return [Math.max(i, 0), Math.min(j, data.length)];
    }

    return {
      selectVisible: selectVisibleRows,
      onScroll: onScroll
    };
  };

  LineUp.prototype.initDragging = function () {
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
      that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), false);
    }

    function dragWeightEnded() {
      d3.select(this).classed("dragging", false);

      if (that.config.columnBundles.primary.sortedColumn instanceof LineUp.LayoutStackedColumn) {
        that.storage.resortData({column: that.config.columnBundles.primary.sortedColumn});
        that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), false);
      }
//        that.updateBody(that.storage.getColumnLayout(), that.storage.getData())

//      that.updateAll();
      // TODO: integrate columnbundles dynamically !!
    }


    return d3.behavior.drag()
      .origin(function (d) {
        return d;
      })
      .on("dragstart", dragWeightStarted)
      .on("drag", draggedWeight)
      .on("dragend", dragWeightEnded);
  };
}(LineUp || (LineUp = {}), d3, jQuery));
/* global d3 */
var LineUp;
(function (LineUp, d3) {

  function addLine($svg, x1, y1, x2, y2, clazz) {
    return $svg.append("line").attr({
      x1: x1, y1: y1, x2: x2, y2: y2, 'class': clazz
    });
  }

  function addText($svg, x, y, text, dy, clazz) {
    dy = dy || null;
    clazz = clazz || null;
    return $svg.append("text").attr({
      x: x, y: y, dy: dy, 'class': clazz
    }).text(text);
  }

  function addCircle($svg, x, shift, y, radius) {
    shift -= x;
    return $svg
      .append("circle")
      .attr({
        'class': 'handle',
        r: radius,
        cx: x,
        cy: y,
        transform: 'translate(' + shift + ',0)'
      });
  }

  LineUp.mappingEditor = function (scale, dataDomain, data, data_accessor, callback) {
    var editor = function ($root) {

      var width = 400,
        height = 400,
      //radius for mapper circles
        radius = 10;

      var $svg = $root.append("svg").attr({
        "class": "lugui-me",
        width: width,
        height: height
      });
      //left limit for the axes
      var lowerLimitX = 50;
      //right limit for the axes
      var upperLimitX = 350;
      //location for the score axis
      var scoreAxisY = 50;
      //location for the raw2pixel value axis
      var raw2pixelAxisY = 350;
      //this is needed for filtering the shown datalines
      var raw2pixel = d3.scale.linear().domain(dataDomain).range([lowerLimitX, upperLimitX]);
      var normal2pixel = d3.scale.linear().domain([0, 1]).range([lowerLimitX, upperLimitX]);

      //x coordinate for the score axis lower bound
      var lowerNormalized = normal2pixel(scale.range()[0]);
      //x coordinate for the score axis upper bound
      var upperNormalized = normal2pixel(scale.range()[1]);
      //x coordinate for the raw2pixel axis lower bound
      var lowerRaw = raw2pixel(scale.domain()[0]);
      //x coordinate for the raw2pixel axis upper bound
      var upperRaw = raw2pixel(scale.domain()[1]);

      scale = d3.scale.linear()
        .clamp(true)
        .domain(scale.domain())
        .range([lowerNormalized, upperNormalized]);
      var $base = $svg.append('g');
      //upper axis for scored values
      addLine($base, lowerLimitX, scoreAxisY, upperLimitX, scoreAxisY, 'axis');
      //label for minimum scored value
      addText($base, lowerLimitX, scoreAxisY - 25, 0, ".75em");
      //label for maximum scored value
      addText($base, upperLimitX, scoreAxisY - 25, 1, ".75em");
      addText($base, width / 2, scoreAxisY - 25, "Score", ".75em", 'centered');

      //lower axis for raw2pixel values
      addLine($base, lowerLimitX, raw2pixelAxisY, upperLimitX, raw2pixelAxisY, 'axis');
      //label for minimum raw2pixel value
      addText($base, lowerLimitX, raw2pixelAxisY + 20, dataDomain[0], ".75em");
      //label for maximum raw2pixel value
      addText($base, upperLimitX, raw2pixelAxisY + 20, dataDomain[1], ".75em");
      addText($base, width / 2, raw2pixelAxisY + 20, "Raw", ".75em", 'centered');

      //lines that show mapping of individual data items
      var datalines = $svg.append('g').classed('data', true).selectAll("line").data(data);
      datalines.enter().append("line")
        .attr({
          x1: function (d) {
            return scale(data_accessor(d));
          },
          y1: scoreAxisY,
          x2: function (d) {
            return raw2pixel(data_accessor(d));
          },
          y2: raw2pixelAxisY
        }).style('visibility', function (d) {
          var a;
          if (lowerRaw < upperRaw) {
            a = (raw2pixel(data_accessor(d)) < lowerRaw || raw2pixel(data_accessor(d)) > upperRaw);
          } else {
            a = (raw2pixel(data_accessor(d)) > lowerRaw || raw2pixel(data_accessor(d)) < upperRaw);
          }
          return a ? 'hidden' : null;
        });
      //line that defines lower bounds for the scale
      var mapperLineLowerBounds = addLine($svg, lowerNormalized, scoreAxisY, lowerRaw, raw2pixelAxisY, 'bound');
      //line that defines upper bounds for the scale
      var mapperLineUpperBounds = addLine($svg, upperNormalized, scoreAxisY, upperRaw, raw2pixelAxisY, 'bound');
      //label for lower bound of normalized values
      var lowerBoundNormalizedLabel = addText($svg, lowerLimitX + 5, scoreAxisY - 15, d3.round(normal2pixel.invert(lowerNormalized), 2), ".25em", 'drag').attr('transform', 'translate(' + (lowerNormalized - lowerLimitX) + ',0)');
      //label for lower bound of raw2pixel values
      var lowerBoundRawLabel = addText($svg, lowerLimitX + 5, raw2pixelAxisY - 15, d3.round(raw2pixel.invert(lowerRaw), 2), ".25em", 'drag').attr('transform', 'translate(' + (lowerRaw - lowerLimitX) + ',0)');
      //label for upper bound of normalized values
      var upperBoundNormalizedLabel = addText($svg, upperLimitX + 5, scoreAxisY - 15, d3.round(normal2pixel.invert(upperNormalized), 2), ".25em", 'drag').attr('transform', 'translate(' + (upperNormalized - upperLimitX) + ',0)');
      //label for upper bound of raw2pixel values
      var upperBoundRawLabel = addText($svg, upperLimitX + 5, raw2pixelAxisY - 15, d3.round(raw2pixel.invert(upperRaw), 2), ".25em", 'drag').attr('transform', 'translate(' + (upperRaw - upperLimitX) + ',0)');

      function createDrag(label, move) {
        return d3.behavior.drag()
          .on("dragstart", function () {
            d3.select(this)
              .classed("dragging", true)
              .attr("r", radius * 1.1);
            label.style("visibility", "visible");
          })
          .on("drag", move)
          .on("dragend", function () {
            d3.select(this)
              .classed("dragging", false)
              .attr("r", radius);
            label.style("visibility", null);
          })
          .origin(function () {
            var t = d3.transform(d3.select(this).attr("transform"));
            return {x: t.translate[0], y: t.translate[1]};
          });
      }

      function updateNormalized() {
        scale.range([lowerNormalized, upperNormalized]);
        datalines.attr("x1", function (d) {
          return scale(data_accessor(d));
        });
        updateScale();
      }

      function updateRaw() {
        var hiddenDatalines, shownDatalines;
        if (lowerRaw < upperRaw) {
          hiddenDatalines = datalines.filter(function (d) {
            return (raw2pixel(data_accessor(d)) < lowerRaw || raw2pixel(data_accessor(d)) > upperRaw);
          });
          shownDatalines = datalines.filter(function (d) {
            return !(raw2pixel(data_accessor(d)) < lowerRaw || raw2pixel(data_accessor(d)) > upperRaw);
          });
        }
        else {
          hiddenDatalines = datalines.filter(function (d) {
            return (raw2pixel(data_accessor(d)) > lowerRaw || raw2pixel(data_accessor(d)) < upperRaw);
          });
          shownDatalines = datalines.filter(function (d) {
            return !(raw2pixel(data_accessor(d)) > lowerRaw || raw2pixel(data_accessor(d)) < upperRaw);
          });
        }
        hiddenDatalines.style("visibility", "hidden");
        scale.domain([raw2pixel.invert(lowerRaw), raw2pixel.invert(upperRaw)]);
        shownDatalines
          .style("visibility", null)
          .attr("x1", function (d) {
            return scale(data_accessor(d));
          });
        updateScale();
      }

      //draggable circle that defines the lower bound of normalized values
      addCircle($svg, lowerLimitX, lowerNormalized, scoreAxisY, radius)
        .call(createDrag(lowerBoundNormalizedLabel, function () {
          if (d3.event.x >= 0 && d3.event.x <= (upperLimitX - lowerLimitX)) {
            mapperLineLowerBounds.attr("x1", lowerLimitX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            lowerNormalized = d3.event.x + lowerLimitX;
            lowerBoundNormalizedLabel
              .text(d3.round(normal2pixel.invert(lowerNormalized), 2))
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            updateNormalized();
          }
        }));
      //draggable circle that defines the upper bound of normalized values
      addCircle($svg, upperLimitX, upperNormalized, scoreAxisY, radius)
        .call(createDrag(upperBoundNormalizedLabel, function () {
          if (d3.event.x >= (-1 * (upperLimitX - lowerLimitX)) && d3.event.x <= 0) {
            mapperLineUpperBounds.attr("x1", upperLimitX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            upperNormalized = d3.event.x + upperLimitX;
            upperBoundNormalizedLabel
              .text(d3.round(normal2pixel.invert(upperNormalized), 2))
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            updateNormalized();
          }
        }));
      //draggable circle that defines the lower bound of raw2pixel values
      addCircle($svg, lowerLimitX, lowerRaw, raw2pixelAxisY, radius)
        .call(createDrag(lowerBoundRawLabel, function () {
          if (d3.event.x >= 0 && d3.event.x <= (upperLimitX - lowerLimitX)) {
            mapperLineLowerBounds.attr("x2", lowerLimitX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            lowerRaw = d3.event.x + lowerLimitX;
            lowerBoundRawLabel
              .text(d3.round(raw2pixel.invert(lowerRaw), 2))
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            updateRaw();
          }
        }));
      //draggable circle that defines the upper bound of raw2pixel values
      addCircle($svg, upperLimitX, upperRaw, raw2pixelAxisY, radius)
        .call(createDrag(upperBoundRawLabel, function () {
          if (d3.event.x >= (-1 * (upperLimitX - lowerLimitX)) && d3.event.x <= 0) {
            mapperLineUpperBounds.attr("x2", upperLimitX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            upperRaw = d3.event.x + upperLimitX;
            upperBoundRawLabel
              .text(d3.round(raw2pixel.invert(upperRaw), 2))
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            updateRaw();
          }
        }));

      function updateScale() {
        var newScale = d3.scale.linear()
          .domain([raw2pixel.invert(lowerRaw), raw2pixel.invert(upperRaw)])
          .range([normal2pixel.invert(lowerNormalized), normal2pixel.invert(upperNormalized)]);
        callback(newScale);
      }
    };
    return editor;
  };
}(LineUp || (LineUp = {}), d3));
/* global d3, jQuery, _ */
var LineUp;
(function (LineUp, d3, $, _, undefined) {
  /**
   * An implementation of data storage for reading locally
   * @param tableId
   * @param data
   * @param columns
   * @param config
   * @class
   */
  function LineUpLocalStorage(data, columns, layout, primaryKey, storageConfig) {
    this.storageConfig = $.extend(true, {}, {
      colTypes: {
        "number": LineUp.LineUpNumberColumn,
        "string": LineUp.LineUpStringColumn,
//        "max" : LineUp.LineUpMaxColumn,
//        "stacked" : LineUp.LineUpStackedColumn,
        "rank": LineUp.LineUpRankColumn
      },
      layoutColumnTypes: {
        "single": LineUp.LayoutSingleColumn,
        "stacked": LineUp.LayoutStackedColumn,
        "rank": LineUp.LayoutRankColumn,
        "actions": LineUp.LayoutActionColumn
      }
    }, storageConfig);
    this.config = null; //will be injected by lineup

    var colTypes = this.storageConfig.colTypes;
    var layoutColumnTypes = this.storageConfig.layoutColumnTypes;
    var that = this;

    function toColumn(desc) {
      return new colTypes[desc.type](desc, toColumn);
    }

    this.storageConfig.toColumn = toColumn;

    function toLayoutColumn(desc) {
      var type = desc.type || "single";
      return new layoutColumnTypes[type](desc, that.rawcols, toLayoutColumn, that);
    }

    this.storageConfig.toLayoutColumn = toLayoutColumn;

    this.primaryKey = primaryKey;
    this.rawdata = data;
    this.data = data;
    this.rawcols = columns.map(toColumn);
    this.layout = layout || LineUpLocalStorage.generateDefaultLayout(this.rawcols);

    this.bundles = {
      "primary": {
        layoutColumns: [],
        needsLayout: true  // this triggers the layout generation at first access to "getColumnLayout"
      }
    };
  }

  LineUp.LineUpLocalStorage = LineUpLocalStorage;
  LineUp.createLocalStorage = function (data, columns, layout, primaryKey, storageConfig) {
    return new LineUpLocalStorage(data, columns, layout, primaryKey, storageConfig);
  };

  /**
   * generate a default layout by just showing all columns with 100 px
   * @param columns
   * @returns {{primary: (Array|*)}}
   */
  LineUpLocalStorage.generateDefaultLayout = function (columns) {
    var layout = columns.map(function (c) {
      return {
        column: c.id,
        width: c instanceof LineUp.LineUpStringColumn ? 200 : 100
      };
    });
    return {
      primary: layout
    };
  };

  LineUpLocalStorage.prototype = $.extend({}, {},
    /** @lends LineUpLocalStorage.prototype */
    {
      getRawColumns: function () {
        return this.rawcols;
      },
      getColumnLayout: function (key) {
        var _key = key || "primary";
        if (this.bundles[_key].needsLayout) {
          this.generateLayout(this.layout, _key);
          this.bundles[_key].needsLayout = false;
        }

        return this.bundles[_key].layoutColumns;
      },

      /**
       *  get the data
       *  @returns data
       */
      getData: function () {
        return this.data;
      },
      filterData: function (columns) {
        columns = columns || this.bundles["primary"].layoutColumns;

        var flat = [];
        columns.forEach(function (d) {
          d.flattenMe(flat);
        });
        flat = flat.filter(function (d) {
          return d.isFiltered();
        });
        if ($.isFunction(this.config.filter.filter)) {
          flat.push(this.config.filter.filter);
        }
        if (flat.length === 0) {
          this.data = this.rawdata;
        } else {
          this.data = this.rawdata.filter(function (row) {
            return flat.every(function (f) {
              return f.filterBy(row);
            });
          });
        }
      },
      resortData: function (spec) {

        var _key = spec.key || "primary";
        var bundle = this.bundles[_key];
        var asc = spec.asc || this.config.columnBundles.primary.sortingOrderAsc;
        var column = spec.column || this.config.columnBundles.primary.sortedColumn;

        //console.log("resort: ", spec);
        this.filterData(bundle.layoutColumns);
        if (column) {
          this.data.sort(column.sortBy);
          if (asc) {
            this.data.reverse();
          }
        }

        var start = this.config.filter.skip ? this.config.filter.skip : 0;
        if ((this.config.filter.limit && isFinite(this.config.filter.limit))) {
          this.data = this.data.slice(start, start + this.config.filter.limit);
        } else {
          this.data = this.data.slice(start);
        }

        var rankColumn = bundle.layoutColumns.filter(function (d) {
          return d.column instanceof LineUp.LineUpRankColumn;
        });
        if (rankColumn.length > 0) {
          var accessor = function (d, i) {
            return i;
          };
          if (column instanceof LineUp.LayoutStackedColumn) {
            accessor = function (d) {
              return column.getValue(d);
            };
          } else if (column) {
            accessor = function (d) {
              return column.column.getValue(d);
            };
          }
          this.assignRanks(this.data, accessor, rankColumn[0].column);
        }
      },
      /*
       * assigns the ranks to the data which is expected to be sorted in decreasing order
       * */
      assignRanks: function (data, accessor, rankColumn) {

        var actualRank = 1;
        var actualValue = -1;

        data.forEach(function (row, i) {
          if (actualValue === -1) {
            actualValue = accessor(row, i);
          }
          if (actualValue !== accessor(row, i)) {
            actualRank = i + 1; //we have 1,1,3, not 1,1,2
            actualValue = accessor(row, i);
          }
          rankColumn.setValue(row, actualRank);
        });
      },
      generateLayout: function (layout, bundle) {
        var _bundle = bundle || "primary";

        // create Rank Column
//            new LayoutRankColumn();

        var b = {};
        b.layoutColumns = layout[_bundle].map(this.storageConfig.toLayoutColumn);
        //console.log(b.layoutColumns, layout);
        //if there is no rank column create one
        if (b.layoutColumns.filter(function (d) {
          return d instanceof LineUp.LayoutRankColumn;
        }).length < 1) {
          b.layoutColumns.unshift(new LineUp.LayoutRankColumn(null, null, null, this));
        }

        //if we have row actions and no action column create one
        if (this.config.svgLayout.rowActions.length > 0 && b.layoutColumns.filter(function (d) {
          return d instanceof LineUp.LayoutActionColumn;
        }).length < 1) {
          b.layoutColumns.push(new LineUp.LayoutActionColumn());
        }

        this.bundles[_bundle] = b;
      },
      addColumn: function (col, bundle) {
        var _bundle = bundle || "primary";
        var cols = this.bundles[_bundle].layoutColumns, i, c;
        //insert the new column after the first non rank, text column
        for (i = 0; i < cols.length; ++i) {
          c = cols[i];
          if (c instanceof LineUp.LayoutRankColumn || (c instanceof LineUp.LayoutSingleColumn && c.column instanceof LineUp.LineUpStringColumn)) {
            continue;
          }
          break;
        }
        cols.splice(i, 0, col);
      },
      addStackedColumn: function (spec, bundle) {
        var _spec = spec || {label: "Stacked", children: []};
        this.addColumn(new LineUp.LayoutStackedColumn(_spec, this.rawcols, this.storageConfig.toLayoutColumn), bundle);
      },
      addSingleColumn: function (spec, bundle) {
        this.addColumn(new LineUp.LayoutSingleColumn(spec, this.rawcols), bundle);
      },


      removeColumn: function (col, bundle) {
        var _bundle = bundle || "primary";

        var headerColumns = this.bundles[_bundle].layoutColumns;

        if (col instanceof LineUp.LayoutStackedColumn) {
          var indexOfElement = _.indexOf(headerColumns, col);//function(c){ return (c.id == d.id)});
          if (indexOfElement !== undefined) {
            var addColumns = [];
//                d.children.forEach(function(ch){
//
//                    // if there is NO column of same data type
//                   if (headerColumns.filter(function (hc) {return hc.getDataID() == ch.getDataID()}).length ==0){
//                       ch.parent=null;
//                       addColumns.push(ch);
//                   }
//
//                })

//                headerColumns.splice(indexOfElement,1,addColumns)

            Array.prototype.splice.apply(headerColumns, [indexOfElement, 1].concat(addColumns));

          }


        } else if (col instanceof LineUp.LayoutSingleColumn) {
          if (col.parent === null || col.parent === undefined) {
            headerColumns.splice(headerColumns.indexOf(col), 1);
          } else {
            col.parent.removeChild(col);
            this.resortData({});
          }
        }


      },
      setColumnLabel: function (col, newValue, bundle) {
        var _bundle = bundle || "primary";

        //TODO: could be done for all Column header
        var headerColumns = this.bundles[_bundle].layoutColumns;
        headerColumns.filter(function (d) {
          return d.id === col.id;
        })[0].label = newValue;
      },
      moveColumn: function (column, targetColumn, position, bundle) {
        var _bundle = bundle || "primary",
          headerColumns = this.bundles[_bundle].layoutColumns,
          targetIndex;

        // different cases:
        if (column.parent == null && targetColumn.parent == null) {
          // simple L1 Column movement:

          headerColumns.splice(headerColumns.indexOf(column), 1);

          targetIndex = headerColumns.indexOf(targetColumn);
          if (position === "r") {
            targetIndex++;
          }
          headerColumns.splice(targetIndex, 0, column);
        }
        else if ((column.parent !== null) && targetColumn.parent === null) {
          // move from stacked Column
          column.parent.removeChild(column);

          targetIndex = headerColumns.indexOf(targetColumn);
          if (position === "r") {
            targetIndex++;
          }
          headerColumns.splice(targetIndex, 0, column);

        } else if (column.parent === null && (targetColumn.parent !== null)) {

          // move into stacked Column
          if (targetColumn.parent.addChild(column, targetColumn, position)) {
            headerColumns.splice(headerColumns.indexOf(column), 1);
          }

        } else if ((column.parent !== null) && (targetColumn.parent !== null)) {

          // move from Stacked into stacked Column
          column.parent.removeChild(column);
          targetColumn.parent.addChild(column, targetColumn, position);
        }
        this.resortData({});
      },
      copyColumn: function (column, targetColumn, position, bundle) {
        var _bundle = bundle || "primary";

        var headerColumns = this.bundles[_bundle].layoutColumns;

        var newColumn = column.makeCopy();

        // different cases:
        if (targetColumn.parent == null) {

          var targetIndex = headerColumns.indexOf(targetColumn);
          if (position === "r") {
            targetIndex++;
          }
          headerColumns.splice(targetIndex, 0, newColumn);
        }
        else if ((targetColumn.parent !== null)) {
          // copy into stacked Column
          targetColumn.parent.addChild(newColumn, targetColumn, position);
        }
        this.resortData({});
      },

      /**
       * returns a column by name
       * @param name
       * @returns {*}
       */
      getColumnByName: function (name) {
        var cols = this.getColumnLayout();
        for (var i = cols.length - 1; i >= 0; --i) {
          var col = cols[i];
          if (col.getLabel() === name || (col.column && col.column.column === name)) {
            return col;
          }
        }
        return null;
      }



    });
}(LineUp || (LineUp = {}), d3, jQuery, _));

/* global d3, jQuery, document */
var LineUp;
(function (LineUp, d3, $, undefined) {
  LineUp.prototype = LineUp.prototype || {};
  LineUp.updateClipPaths = function (headers, svg, prefix, shift, defclass) {
    defclass = defclass || 'column';
    //generate clip paths for the text columns to avoid text overflow
    //see http://stackoverflow.com/questions/11742812/cannot-select-svg-foreignobject-element-in-d3
    //there is a bug in webkit which present camelCase selectors
    var textClipPath = svg.select('defs.' + defclass).selectAll(function () {
      return this.getElementsByTagName("clipPath");
    }).data(headers, function (d) {
      return d.id;
    });
    textClipPath.enter().append('clipPath')
      .attr('id', function (d) {
        return 'clip-' + prefix + d.id;
      })
      .append('rect').attr({
        y: 0,
        height: '1000'
      });
    textClipPath.exit().remove();
    textClipPath.select('rect')
      .attr({
        x: function (d) {
          return shift ? d.offsetX : null;
        },
        width: function (d) {
          return Math.max(d.getColumnWidth() - 5, 0);
        }
      });
  };
  function updateText(allHeaders, allRows, svg, config) {
    // -- the text columns

    var allTextHeaders = allHeaders.filter(function (d) {
      return d.column instanceof LineUp.LineUpStringColumn || d instanceof LineUp.LayoutRankColumn;
    });

    var rowCenter = (config.svgLayout.rowHeight / 2);

    var textRows = allRows.selectAll(".tableData.text")
      .data(function (d) {
        var dd = allTextHeaders.map(function (column) {
          return {
            value: column.column.getValue(d),
            label: column.column.getRawValue(d),
            offsetX: column.offsetX,
            columnW: column.getColumnWidth(),
            isRank: (column instanceof LineUp.LayoutRankColumn),
            clip: 'url(#clip-B' + column.id + ')'
          };
        });
        return dd;
      });
    textRows.enter()
      .append("text")
      .attr({
        'class': function (d) {
          return "tableData text" + (d.isRank ? ' rank' : '');
        },
        y: rowCenter,
        'clip-path': function (d) {
          return d.clip;
        }
      });
    textRows.exit().remove();

    textRows
      .attr('x', function (d) {
        return d.offsetX;
      })
      .text(function (d) {
        return d.label;
      });

    allRows.selectAll(".tableData.text.rank").text(function (d) {
      return d.label;
    });// only changed texts:
    ///// TODO ---- IMPORTANT  ----- DO NOT DELETE

    //            data.push({key:"rank",value:d["rank"]});// TODO: use Rank column
    //    allRows.selectAll(".tableData.text.rank")
//        .data(function(d){
////            console.log(d);
//            return [{key:"rank",value:d["rank"]}]
//        }
//    )
  }

  function showStacked(config) {
    //if not enabled or values are shown
    if (!config.renderingOptions.stacked || config.renderingOptions.values) {
      return false;
    }
    //primary is a stacked one
    var current = config.columnBundles.primary.sortedColumn;
    return !(current && (current.parent instanceof LineUp.LayoutStackedColumn));
  }

  function updateSingleBars(headers, allRows, config) {
    // -- handle the Single columns  (!! use unflattened headers for filtering)
    var allSingleBarHeaders = headers.filter(function (d) {
      return d.column instanceof LineUp.LineUpNumberColumn;
    });
    var barRows = allRows.selectAll(".tableData.bar")
      .data(function (d) {
        var data = allSingleBarHeaders.map(function (column) {
          return {
            key: column.getDataID(),
            value: column.getWidth(d),
            label: column.column.getRawValue(d),
            offsetX: column.offsetX
          };
        });
        return data;
      });

    barRows.enter()
      .append("rect")
      .attr({
        "class": "tableData bar",
        y: 2,
        height: config.svgLayout.rowHeight - 4
      });
    barRows.exit().remove();

    barRows
      .attr({
        x: function (d) {
          return d.offsetX;
        },
        width: function (d) {
          return Math.max(+d.value - 2, 0);
        }
      }).style({
        fill: function (d) {
          return config.colorMapping.get(d.key);
        }
      });
  }

  function updateStackBars(headers, allRows, _stackTransition, config) {
    // -- RENDER the stacked columns (update, exit, enter)
    var allStackedHeaders = headers.filter(function (d) {
      return (d instanceof LineUp.LayoutStackedColumn);
    });

    // -- render StackColumnGroups
    var stackRows = allRows.selectAll(".tableData.stacked")
      .data(function (d) {
        var dd = allStackedHeaders.map(function (column) {
          return {key: column.getDataID(), childs: column.children, parent: column, row: d};
        });
        return dd;
      });
    stackRows.exit().remove();
    stackRows.enter()
      .append("g")
      .attr("class", "tableData stacked");

    stackRows
      .attr("transform", function (d) {
        return "translate(" + d.parent.offsetX + "," + 0 + ")";
      });

    // -- render all Bars in the Group
    var allStackOffset = 0;
    var allStackW = 0;
    var allStackRes = {};

    var asStacked = showStacked(config);

    var allStack = stackRows.selectAll("rect").data(function (d) {

        allStackOffset = 0;
        allStackW = 0;

        return d.childs.map(function (child) {
          allStackW = child.getWidth(d.row);

          allStackRes = {child: child, width: allStackW, offsetX: allStackOffset};
          if (asStacked) {
            allStackOffset += allStackW;
          } else {
            allStackOffset += child.getColumnWidth();
          }
          return allStackRes;
        });
      }
    );
    allStack.exit().remove();
    allStack.enter().append("rect").attr({
      y: 2,
      height: config.svgLayout.rowHeight - 4
    });

    (_stackTransition ? allStack.transition(config.svgLayout.animationDuration) : allStack)
      .attr({
        x: function (d) {
          return d.offsetX;
        },
        width: function (d) {
          return (d.width > 2) ? d.width - 2 : d.width;
        }
      }).style({
        fill: function (d) {
          return config.colorMapping.get(d.child.getDataID());
        }
      });
  }

  function createActions($elem, item, config) {
    var $r = $elem.selectAll('text').data(config.svgLayout.rowActions);
    $r.enter().append('text').append('title');
    $r.exit().remove();
    $r.attr('x', function (d, i) {
      return i * config.svgLayout.rowHeight;
    }).text(function (d) {
      return d.icon;
    }).on('click', function (d) {
      d.action.call(this, item.data, d);
    }).select('title').text(function (d) {
      return d.name;
    });
  }

  function updateActionBars(headers, allRows, config) {
    // -- handle the Single columns  (!! use unflattened headers for filtering)
    var allActionBarHeaders = headers.filter(function (d) {
      return (d instanceof LineUp.LayoutActionColumn);
    });
    var actionRows = allRows.selectAll(".tableData.action")
      .data(function (d) {
        var dd = allActionBarHeaders.map(function (column) {
          return {key: column.getDataID(), value: column.getColumnWidth(d),
            data: d,
            offsetX: column.offsetX};
        });
        return dd;
      });
    actionRows.enter()
      .append("g")
      .attr('class', "tableData action")
      .each(function (item) {
        createActions(d3.select(this), item, config);
      });

    actionRows.exit().remove();

    actionRows
      .attr('transform', function (d) {
        return 'translate(' + (d.offsetX + 10) + ',' + (config.svgLayout.rowHeight * 0.5 + 1) + ')';
      });
  }

  function createRepr(col, row) {
    if (col instanceof LineUp.LayoutStackedColumn) {
      return col.getValue(row);
    }
    if (col instanceof LineUp.LayoutSingleColumn && col.column instanceof LineUp.LineUpNumberColumn) {
      var r = col.column.getRawValue(row);
      return isNaN(r) || r.toString() === '' ? '' : +r;
    }
    if (col.column) {
      return col.column.getValue(row);
    }
    return "";
    //}
    //if (col instanceof LineUpRankColumn || header instanceof )
  }

  function generateTooltip(row, headers, config) {
    var $table = $('<div><table><thead><tr><th>Column</th><th>Value</th></tr></thead><tbody></tbody></table></div>');
    var $body = $table.find('tbody');
    headers.forEach(function (header) {
      var r = createRepr(header, row);
      if (typeof r === 'undefined') {
        r = '';
      } else if (typeof r === 'number') {
        r = config.numberformat(r);
      }
      $('<tr><th>' + header.getLabel() + '</th><td>' + r + '</td></tr>').appendTo($body);
    });
    return $table.html();
  }

  /**
   * updates the table body
   * @param headers - the headers as in {@link updateHeader}
   * @param data - the data array from {@link LineUpLocalStorage.prototype#getData()}
   */
  LineUp.prototype.updateBody = function (headers, data, stackTransition) {
    //default values
    headers = headers || this.storage.getColumnLayout();
    data = data || this.storage.getData();
    stackTransition = stackTransition || false;


    var svg = this.$body;
    var that = this;
    var primaryKey = this.storage.primaryKey;
    var zeroFormat = d3.format(".1f");
    //console.log("bupdate");
    stackTransition = stackTransition || false;

    var allHeaders = [];
    headers.forEach(function (d) {
      d.flattenMe(allHeaders);
    });

    var datLength = data.length;
    var rowScale = d3.scale.ordinal()
        .domain(data.map(function (d) {
          return d[primaryKey];
        }))
        .rangeBands([0, (datLength * that.config.svgLayout.rowHeight)], 0, 0.2),
      prevRowScale = this.prevRowScale || rowScale;
    //backup the rowscale from the previous call to have a previous "old" position
    this.prevRowScale = rowScale;

    this.$bodySVG.attr("height", datLength * that.config.svgLayout.rowHeight + that.config.htmlLayout.headerHeight);

    var visibleRange = this.selectVisible(data, rowScale);
    if (visibleRange[0] > 0 || visibleRange[1] < data.length) {
      data = data.slice(visibleRange[0], visibleRange[1]);
    }
    // -- handle all row groups

    var allRowsSuper = svg.selectAll(".row").data(data, function (d) {
      return d[primaryKey];
    });
    allRowsSuper.exit().remove();

    // --- append ---
    var allRowsSuperEnter = allRowsSuper.enter().append("g").attr({
      "class": "row",
      transform: function (d) { //init with its previous position
        var prev = prevRowScale(d[primaryKey]);
        if (typeof prev === 'undefined') { //if not defined from the bottom
          prev = rowScale.range()[1];
        }
        return "translate(" + 0 + "," + prev + ")";
      }
    });
    allRowsSuperEnter.append('rect').attr({
      'class': 'filler',
      width: '100%',
      height: that.config.svgLayout.rowHeight
    });

    //    //--- update ---
    (this.config.renderingOptions.animation ? allRowsSuper.transition().duration(this.config.svgLayout.animationDuration) : allRowsSuper).attr({
      "transform": function (d) {
        return  "translate(" + 0 + "," + rowScale(d[primaryKey]) + ")";
      }
    });
    var asStacked = showStacked(this.config);

    function createOverlays(row) {
      var textOverlays = [];

      function toValue(v) {
        if (isNaN(v) || v === '' || typeof v === "undefined") {
          return '';
        }
        return that.config.numberformat(+v);
      }

      headers.forEach(function (col) {
          if (col.column instanceof LineUp.LineUpNumberColumn) {
            textOverlays.push({id: col.id, value: col.column.getValue(row), label: that.config.numberformat(+col.column.getRawValue(row)),
              x: col.offsetX,
              w: col.getColumnWidth()});
          } else if (col instanceof  LineUp.LayoutStackedColumn) {
            var allStackOffset = 0;

            col.children.forEach(function (child) {
              var allStackW = child.getWidth(row);

              textOverlays.push({
                  id: child.id,
                  label: toValue(child.column.getRawValue(row)) + " -> (" + zeroFormat(child.getWidth(row)) + ")",
                  w: asStacked ? allStackW : child.getColumnWidth(),
                  x: (allStackOffset + col.offsetX)}
              );
              if (asStacked) {
                allStackOffset += allStackW;
              } else {
                allStackOffset += child.getColumnWidth();
              }
            });
          }
        }
      );
      return textOverlays;
    }

    function renderOverlays($row, textOverlays, clazz, clipPrefix) {
      $row.selectAll("text." + clazz).data(textOverlays).enter().append("text").
        attr({
          'class': "tableData " + clazz,
          x: function (d) {
            return d.x;
          },
          y: that.config.svgLayout.rowHeight / 2,
          'clip-path': function (d) {
            return 'url(#clip-' + clipPrefix + d.id + ')';
          }
        }).text(function (d) {
          return d.label;
        });
    }

    allRowsSuper.on({
      mouseenter: function (row) {
        var $row = d3.select(this);
        $row.classed('hover', true);
//            d3.select(this.parent).classed("hovered", true)
        var textOverlays = createOverlays(row);
        //create clip paths which clips the overlay text of the bars
        var shift = rowScale(row[primaryKey]);
        //generate clip paths for the text columns to avoid text overflow
        //see http://stackoverflow.com/questions/11742812/cannot-select-svg-foreignobject-element-in-d3
        //there is a bug in webkit which present camelCase selectors
        var textClipPath = that.$bodySVG.select('defs.overlay').selectAll(function () {
          return this.getElementsByTagName("clipPath");
        }).data(textOverlays);
        textClipPath.enter().append('clipPath')
          .append('rect').attr({
            height: '1000'
          });
        textClipPath.exit().remove();
        textClipPath.attr('y', shift).attr('id', function (d) {
          return 'clip-M' + d.id;
        });
        textClipPath.select('rect')
          .attr({
            x: function (d) {
              return d.x;
            },
            width: function (d) {
              return Math.max(d.w - 2, 0);
            }
          });
        renderOverlays($row, textOverlays, 'hoveronly', 'M');

        function absoluteRowPos(elem) {
          var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
          var matrix = elem.getScreenCTM(),
            tbbox = elem.getBBox(),
            point = that.$bodySVG.node().createSVGPoint();
          point.x = tbbox.x;
          point.y = tbbox.y;
          point = point.matrixTransform(matrix);
          return scrollTop + point.y;
        }
        if (that.config.interaction.tooltips) {
          that.tooltip.show(generateTooltip(row, allHeaders, that.config), {
            x: d3.event.x + 10,
            y: absoluteRowPos(this),
            height: that.config.svgLayout.rowHeight
          });
        }
      },
      mousemove: function () {
        if (that.config.interaction.tooltips) {
          that.tooltip.move({
            x: d3.event.x
          });
        }
      },
      mouseleave: function () {
        if (that.config.interaction.tooltips) {
          that.tooltip.hide();
        }
        d3.select(this).classed('hover', false);
        d3.select(this).selectAll('text.hoveronly').remove();
      }
    });

    var allRows = allRowsSuper;

    updateSingleBars(headers, allRows, that.config);
    updateStackBars(headers, allRows, this.config.renderingOptions.animation && stackTransition, that.config);
    updateActionBars(headers, allRows, that.config);

    LineUp.updateClipPaths(allHeaders, this.$bodySVG, 'B', true);
    updateText(allHeaders, allRows, svg, that.config);
    if (that.config.renderingOptions.values) {
      allRowsSuper.classed('values', true);
      allRowsSuper.each(function (row) {
        var $row = d3.select(this);
        renderOverlays($row, createOverlays(row), 'valueonly', 'B');
      });
    } else {
      allRowsSuper.classed('values', false).selectAll('text.valueonly').remove();
    }
  };
}(LineUp || (LineUp = {}), d3, jQuery));
/* global d3, jQuery */
var LineUp;
(function (LineUp, d3, $, undefined) {
  LineUp.prototype = LineUp.prototype || {};

  LineUp.prototype.layoutHeaders = function (headers) {
    var offset = 0;
    var config = this.config;

    headers.forEach(function (d) {
//        console.log(d);
      d.offsetX = offset;
      d.offsetY = 2;
      d.height = config.htmlLayout.headerHeight - 4;
      offset += d.getColumnWidth();

//        console.log(d.getColumnWidth());
    });

    //console.log("layout Headers:", headers);

    //update all the plusSigns shifts
    var shift = offset + 4;
    d3.values(config.svgLayout.plusSigns).forEach(function (addSign) {
      addSign.x = shift;
      shift += addSign.w + 4;
    });

    headers.filter(function (d) {
      return (d instanceof LineUp.LayoutStackedColumn);
    })
      .forEach(function (d) {

        d.height = config.htmlLayout.headerHeight / 2 - 4;

        var localOffset = 0;
        var parentOffset = d.offsetX;
        var allChilds = d.children.concat(d.emptyColumns);
        allChilds.map(function (child) {
          child.offsetX = parentOffset + localOffset;
          child.localOffsetX = localOffset;
          localOffset += child.getColumnWidth();

          child.offsetY = config.htmlLayout.headerHeight / 2 + 2;
          child.height = config.htmlLayout.headerHeight / 2 - 4;
        });
      });
    this.totalWidth = shift;
  };

  /**
   * Render the given headers
   * @param headers - the array of headers, see {@link LineUpColumn}
   */
  LineUp.prototype.updateHeader = function (headers) {
    headers = headers || this.storage.getColumnLayout();
//    console.log("update Header");
    var rootsvg = this.$header;
    var svg = rootsvg.select('g.main');

    var that = this;
    var config = this.config;

    if (this.headerUpdateRequired) {
      this.layoutHeaders(headers);
      this.$headerSVG.attr('width', this.totalWidth);
      this.$bodySVG.attr('width', this.totalWidth);
      this.headerUpdateRequired = false;
    }

    var allHeaderData = [];
    headers.forEach(function (d) {
      d.flattenMe(allHeaderData, {addEmptyColumns: true});
    });
    //reverse order to render from right to left
    allHeaderData.reverse();

    LineUp.updateClipPaths(allHeaderData, this.$headerSVG, 'H', false, 'columnheader');
    //console.log(allHeaderData);


    // -- Handle the header groups (exit,enter, update)

    var allHeaders = svg.selectAll(".header").data(allHeaderData, function (d) {
      return d.id;
    });
    allHeaders.exit().remove();

    // --- adding Element to class allHeaders
    var allHeadersEnter = allHeaders.enter().append("g").attr("class", "header")
      .classed("emptyHeader", function (d) {
        return d instanceof LineUp.LayoutEmptyColumn || d instanceof LineUp.LayoutActionColumn;
      })
      .call(function () {
        that.addResortDragging(this, config);
      });

    // --- changing nodes for allHeaders
    allHeaders.attr("transform", function (d) {
      return "translate(" + d.offsetX + "," + d.offsetY + ")";
    });


    // -- handle BackgroundRectangles

    allHeadersEnter.append("rect").attr({
      "class": "labelBG",
      y: 0
    }).style("fill", function (d) {
      if (d instanceof LineUp.LayoutEmptyColumn) {
        return "lightgray";
      } else if (d instanceof LineUp.LayoutStackedColumn || !config.colorMapping.has(d.column.id) || d instanceof LineUp.LayoutActionColumn) {
        return config.grayColor;
      } else {
        return config.colorMapping.get(d.column.id);
      }
    })
      .on("click", function (d) {
        if (d3.event.defaultPrevented || d instanceof LineUp.LayoutEmptyColumn || d instanceof LineUp.LayoutActionColumn) {
          return;
        }
        // no sorting for empty stacked columns !!!
        if (d instanceof LineUp.LayoutStackedColumn && d.children.length < 1) {
          return;
        }

        var bundle = config.columnBundles[d.columnBundle];
        // TODO: adapt to comparison mode !!
        //same sorting swap order
        if (bundle.sortedColumn !== null && (d.getDataID() === bundle.sortedColumn.getDataID())) {
          bundle.sortingOrderAsc = !bundle.sortingOrderAsc;
        } else {
          bundle.sortingOrderAsc = false;
        }

        that.storage.resortData({column: d, asc: bundle.sortingOrderAsc});
        bundle.sortedColumn = d;
        that.updateAll(false);
      });

    allHeaders.select(".labelBG").attr({
      width: function (d) {
        return d.getColumnWidth() - 5;
      },
      height: function (d) {
        return d.height;
      }
    });

    // -- handle WeightHandle

    if (this.config.manipulative) {
      allHeadersEnter.filter(function (d) {
        return !(d instanceof LineUp.LayoutEmptyColumn) && !(d instanceof LineUp.LayoutActionColumn);
      }).append("rect").attr({
        "class": "weightHandle",
        x: function (d) {
          return d.getColumnWidth() - 5;
        },
        y: 0,
        width: 5
      });

      allHeaders.select(".weightHandle").attr({
        x: function (d) {
          return (d.getColumnWidth() - 5);
        },
        height: function (d) {
          return d.height;
        }
      }).call(this.dragWeight); // TODO: adopt dragWeight function !
    }

    // -- handle Text
    allHeadersEnter.append("text").attr({
      "class": "headerLabel",
      x: 12
    });
    allHeadersEnter.append("title");

    allHeaders.select(".headerLabel")
      .classed("sortedColumn", function (d) {
        var sc = config.columnBundles[d.columnBundle].sortedColumn;
        if (sc) {
          return d.getDataID() === sc.getDataID();
        } else {
          return false;
        }
      })
      .attr({
        y: function (d) {
          if (d instanceof LineUp.LayoutStackedColumn || d.parent != null) {
            return d.height / 2;
          }
          return d.height * 3 / 4;
        },
        'clip-path': function (d) {
          return 'url(#clip-H' + d.id + ')';
        }
      }).text(function (d) {
        if (d instanceof LineUp.LayoutStackedColumn || d instanceof LineUp.LayoutEmptyColumn || d instanceof LineUp.LayoutActionColumn) {
          return d.label;
        }
        return d.column.label;
      });
    allHeaders.select('title').text(function (d) {
      if (d instanceof LineUp.LayoutStackedColumn || d instanceof LineUp.LayoutEmptyColumn || d instanceof LineUp.LayoutActionColumn) {
        return d.label;
      }
      return d.column.label;
    });


    // -- handle the Sort Indicator
    allHeadersEnter.append("text").attr({
      'class': 'headerSort',
      y: function (d) {
        return d.height / 2;
      },
      x: 2
    });

    allHeaders.select(".headerSort").text(function (d) {
      var sc = config.columnBundles[d.columnBundle].sortedColumn;
      return ((sc && d.getDataID() === sc.getDataID()) ?
        ((config.columnBundles[d.columnBundle].sortingOrderAsc) ? '\uf0de' : '\uf0dd')
        : "");
    })
      .attr({
        y: function (d) {
          return d.height / 2;
        }
      });


    // add info Button to All Stacked Columns
    if (this.config.manipulative) {
      var buttons = [
        {
          'class': 'stackedColumnInfo',
          text: "\uf1de",
          filter: function (d) {
            return d instanceof LineUp.LayoutStackedColumn ? [d] : [];
          },
          action: function (d) {
            that.stackedColumnOptionsGui(d);
          },
          shift: 15
        },
        {
          'class': 'singleColumnDelete',
          text: "\uf014",
          filter: function (d) {
            return (d instanceof LineUp.LayoutStackedColumn || d instanceof LineUp.LayoutEmptyColumn || d instanceof LineUp.LayoutActionColumn) ? [] : [d];
          },
          action: function (d) {
            that.storage.removeColumn(d);
            that.headerUpdateRequired = true;
            that.updateAll();
          },
          shift: 15
        },
        {
          'class': 'singleColumnFilter',
          text: "\uf0b0",
          filter: function (d) {
            return (d instanceof LineUp.LayoutSingleColumn && (d.column instanceof LineUp.LineUpNumberColumn || d.column instanceof LineUp.LineUpStringColumn)) ? [d] : [];
          },
          action: function (d) {
            if (d.column instanceof LineUp.LineUpStringColumn) {
              that.openFilterPopup(d, d3.select(this));
            } else {
              that.openMappingEditor(d, d3.select(this));
            }
          },
          shift: 28
        }
      ];

      buttons.forEach(function (button) {
        var $button = allHeaders.selectAll('.' + button.class).data(button.filter);
        $button.exit().remove();
        $button.enter().append("text")
          .attr("class", "fontawe " + button.class)
          .text(button.text)
          .on("click", button.action);
        $button.attr({
          x: function (d) {
            return d.getColumnWidth() - button.shift;
          },
          y: 10
        });
      });
    }

    // ==================
    // -- Render add ons
    //===================


    // add column signs:
    var plusButton = d3.values(config.svgLayout.plusSigns);
    var addColumnButton = svg.selectAll(".addColumnButton").data(plusButton);
    addColumnButton.exit().remove();


    var addColumnButtonEnter = addColumnButton.enter().append("g").attr({
      class: "addColumnButton"
    });

    addColumnButton.attr({
      "transform": function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      }
    });

    addColumnButtonEnter.append("rect").attr({
      x: 0,
      y: 0,
      rx: 5,
      ry: 5,
      width: function (d) {
        return d.w;
      },
      height: function (d) {
        return d.h;
      }
    }).on("click", function (d) {
      if ($.isFunction(d.action)) {
        d.action.call(that, d);
      } else {
        that[d.action](d);
      }
    });

    addColumnButtonEnter.append("text").attr({
      x: function (d) {
        return d.w / 2;
      },
      y: function (d) {
        return d.h / 2;
      }
    }).text('\uf067');


  };


// ===============
// Helperfunctions
// ===============


  LineUp.prototype.addResortDragging = function (xss) {
    if (!this.config.manipulative) {
      return;
    }

    var x = d3.behavior.drag(),
      that = this,
      rootsvg = this.$header,
      svgOverlay = rootsvg.select('g.overlay'),
      hitted = null,
      moved = false;
    x.call(xss);

    function dragstart(d) {
      if (d instanceof LineUp.LayoutEmptyColumn) {
        return;
      }

      d3.event.sourceEvent.stopPropagation(); // silence other listeners

      d3.select(this).classed("dragObject", true);

      hitted = null;
      moved = false;
    }

    function dragmove(d) {
      if (d instanceof LineUp.LayoutEmptyColumn) {
        return;
      }

      moved = true;
      var dragHeader = svgOverlay.selectAll(".dragHeader").data([d]);
      var dragHeaderEnter = dragHeader.enter().append("g").attr({
        class: "dragHeader"
      });

      dragHeaderEnter.append("rect").attr({
        class: "labelBG",
        width: function (d) {
          return d.getColumnWidth();
        },
        height: function (d) {
          return d.height;
        }
      });

      var x = d3.event.x;
      var y = d3.event.y;
      dragHeader.attr("transform", function () {
        return "translate(" + (d3.event.x + 3) + "," + (d3.event.y - 10) + ")";
      });


      var allHeaderData = [];
      that.storage.getColumnLayout().forEach(function (d) {
        d.flattenMe(allHeaderData, {addEmptyColumns: true});
      });

      function contains(header, x, y) {
        //TODO check if types match
        if (x > header.offsetX && (x - header.offsetX) < header.getColumnWidth()) {
          if (y > header.offsetY && (y - header.offsetY) < header.height) {
            if ((x - header.offsetX < header.getColumnWidth() / 2)) {
              return {column: header, insert: "l", tickX: (header.offsetX), tickY: (header.offsetY), tickH: header.height};
            } else {
              return {column: header, insert: "r", tickX: (header.offsetX + header.getColumnWidth()), tickY: (header.offsetY), tickH: header.height};
            }
          }
        }

        return null;
      }

      var it = 0;
      hitted = null;
      while (it < allHeaderData.length && hitted == null) {
        hitted = contains(allHeaderData[it], x, y);
        it++;
      }

//        console.log(hitted);

      var columnTick = svgOverlay.selectAll(".columnTick").data(hitted ? [hitted] : []);
      columnTick.exit().remove();
      columnTick.enter().append("rect").attr({
        class: "columnTick",
        width: 10
      });

      columnTick.attr({
        x: function (d) {
          return d.tickX - 5;
        },
        y: function (d) {
          return d.tickY;
        },
        height: function (d) {
          return d.tickH;
        }
      });
    }


    function dragend(d) {
      if (d3.event.defaultPrevented || d instanceof LineUp.LayoutEmptyColumn) {
        return;
      }

      d3.select(this).classed("dragObject", false);
      svgOverlay.selectAll(".dragHeader").remove();
      svgOverlay.selectAll(".columnTick").remove();

      if (hitted && hitted.column === this.__data__) {
        return;
      }

      if (hitted) {
//            console.log("EVENT: ", d3.event);
        if (d3.event.sourceEvent.altKey) {
          that.storage.copyColumn(this.__data__, hitted.column, hitted.insert);
        } else {
          that.storage.moveColumn(this.__data__, hitted.column, hitted.insert);
        }

//            that.layoutHeaders(that.storage.getColumnLayout());
        that.headerUpdateRequired = true;
        that.updateAll();

      }

      if (hitted == null && moved) {
        that.headerUpdateRequired = true;
        that.storage.removeColumn(this.__data__);
        that.updateAll();
      }
    }


    x.on("dragstart", dragstart)
      .on("drag", dragmove)
      .on("dragend", dragend);
  };


  LineUp.prototype.addNewEmptyStackedColumn = function () {
    this.storage.addStackedColumn();
    this.headerUpdateRequired = true;
    this.updateHeader();
  };


  /**
   * called when a Header width changed, calls {@link updateHeader}
   * @param change - the change information
   * @param change.column - the changed column, see {@link LineUpColumn}
   * @param change.value - the new column width
   */
  LineUp.prototype.reweightHeader = function (change) {
//    console.log(change);
    change.column.setColumnWidth(change.value);
    this.headerUpdateRequired = true;
    this.updateHeader();
  };
}(LineUp || (LineUp = {}), d3, jQuery));
return LineUp;
  }
  if (typeof define === "function" && define.amd) {
    define(['jquery','d3','underscore'], LineUpLoader);
  } else if (typeof module === "object" && module.exports) {
    module.exports = LineUpLoader(require('jquery'), require('d3'), require('underscore'));
  } else {
    this.LineUp = LineUpLoader(jQuery, d3, _);
  }
}.call(this));
