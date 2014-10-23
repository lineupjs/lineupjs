/*
 * extracted from lineUp.js (created by sam gratzl)
 * modified by hen
 *
 * contains the main  LineUp data structure
 * and a loader for client side storage of whole table
 * */
/*global d3, jQuery, _ */
var LineUp;
(function (LineUp, d3, $, _, undefined) {
  function fixCSS(id) {
    return  id.replace(/[\s!\'#$%&'\(\)\*\+,\.\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, '_'); //replace non css stuff to _
  }
  /**
   * The mother of all Columns
   * @param desc The descriptor object
   * @class
   */
  function LineUpColumn(desc) {
    this.column = desc.column;
    this.label = desc.label || desc.column;
    this.color = desc.color;
    this.id = fixCSS(desc.id || this.column);
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

    this.domain = desc.domain || [0, 100];
    this.range = desc.range || [0, 1];
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
      return +r;
    },
    getRawValue: function (row) {
      var r = LineUpColumn.prototype.getValue.call(this, row);
      if (isNaN(r)) {
        return '';
      }
      return r;
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

  });

  /**
   *A {@link LineUpColumn} implementation for Strings
   * @param desc The description object
   * @constructor
   * @extends LineUpColumn
   */
  function LineUpCategoricalColumn(desc) {
    LineUpColumn.call(this, desc);
    this.categories = desc.categories || [];
  }

  LineUp.LineUpCategoricalColumn = LineUpCategoricalColumn;

  LineUpCategoricalColumn.prototype = $.extend({}, LineUpColumn.prototype, {

  });

  /**
   *  --- FROM HERE ON ONLY Layout Columns ---
   */

  function LayoutColumn(desc) {
    var that = this;
    this.columnWidth = desc.width || 100;
    this.id = _.uniqueId("Column_");
    this.filter = desc.filter;

    this.parent = desc.parent || null; // or null
    this.columnBundle = desc.columnBundle || "primary";
    //define it here to have a dedicated this pointer
    this.sortBy = function (a, b) {
      a = that.getValue(a);
      b = that.getValue(b);
      return that.safeSortBy(a, b);
    };
  }

  LineUp.LayoutColumn = LayoutColumn;

  LayoutColumn.prototype = $.extend({}, {}, {
    setColumnWidth: function (newWidth, ignoreParent) {
      this.columnWidth = newWidth;
      if (!ignoreParent && this.parent) {
        this.parent.updateWidthFromChild({id: this.id, newWidth: newWidth});
      }
    },
    getColumnWidth: function () {
      return this.columnWidth;
    },
    prepare: function(/*data*/) {

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
    this.column = rawColumns.get(desc.column);
    this.id = fixCSS(_.uniqueId(this.columnLink + "_"));
  }

  LineUp.LayoutSingleColumn = LayoutSingleColumn;

  LayoutSingleColumn.prototype = $.extend({}, LayoutColumn.prototype, {
    getValue: function (row, mode) {
      if (mode === 'raw') {
        return this.column.getRawValue(row);
      }
      return this.column.getValue(row);
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
      var lookup = d3.map();
      lookup.set(this.columnLink, this.column);
      var res = new LayoutSingleColumn(description, lookup);
      return res;
    }

  });

  function LayoutNumberColumn(desc, rawColumns) {
    LayoutSingleColumn.call(this, desc, rawColumns);

    //from normalized value to width value
    this.value2pixel = d3.scale.linear().domain([0, 1]).range([0, this.columnWidth]);
    this.scale = d3.scale.linear().clamp(true).domain(desc.domain || this.column.domain).range(desc.range || this.column.range);
    this.histgenerator = d3.layout.histogram();
    var that = this;
    this.histgenerator.range(this.scale.range());
    this.histgenerator.value(function (row) { return that.getValue(row) ;});
    this.hist = [];
  }
  LineUp.LayoutNumberColumn = LayoutNumberColumn;

  LayoutNumberColumn.prototype = $.extend({}, LayoutSingleColumn.prototype, {
    mapping : function(newscale) {
      if (arguments.length < 1) {
        return this.scale;
      }
      this.scale = newscale.clamp(true);
      this.histgenerator.range(newscale.range());
    },
    originalMapping: function() {
      return  d3.scale.linear().clamp(true).domain(this.column.domain).range(this.column.range);
    },
    prepare: function(data, showHistograms) {
      if (!showHistograms) {
        this.hist = [];
        return;
      }
      //remove all the direct values to save space
      this.hist = this.histgenerator(data).map(function (bin) {
        return {
          x : bin.x,
          dx : bin.dx,
          y: bin.y
        };
      });
      var max = d3.max(this.hist, function(d) { return d.y; });
      this.hist.forEach(function (d) {
        d.y /= max;
      });
    },
    binOf : function (row) {
      var v = this.getValue(row), i;
      for(i = this.hist.length -1 ; i>= 0; --i) {
        var bin = this.hist[i];
        if (bin.x <= v && v < (bin.x+bin.dx)) {
          return i;
        }
      }
      return -1;
    },
    setColumnWidth: function (newWidth, ignoreParent) {
      this.value2pixel.range([0, newWidth]);
      LayoutSingleColumn.prototype.setColumnWidth.call(this, newWidth, ignoreParent);
    },
    getValue: function (row, mode) {
      if (mode === 'raw') {
        return this.column.getRawValue(row);
      }
      return this.scale(this.column.getValue(row));
    },
    getWidth: function (row) {
      var r = this.getValue(row);
      if (isNaN(r) || typeof r === 'undefined') {
        return 0;
      }
      return this.value2pixel(r);
    },
    filterBy : function (row) {
      var filter = this.filter;
      if (typeof filter === 'undefined' || !this.column) {
        return true;
      }
      var r = this.getValue(row);
      if (isNaN(filter)) {
        return !isNaN(r);
      } else if (typeof filter === 'number') {
        return r >= filter;
      } else if (Array.isArray(filter)) {
        return filter[0] <= r && r <= filter[1];
      }
      return true;
    },

    description: function () {
      var res = LayoutColumn.prototype.description.call(this);
      res.column = this.columnLink;
      res.type = 'number';
      var a = this.scale.domain();
      var b = this.column.domain;
      if (a[0] !== b[0] || a[1] !== b[1]) {
        res.domain = a;
      }
      a = this.scale.range();
      b = this.column.range;
      if (a[0] !== b[0] || a[1] !== b[1]) {
        res.range = a;
      }
      return res;
    },
    makeCopy: function () {
      var lookup = d3.map();
      lookup.set(this.columnLink, this.column);
      var res = new LayoutNumberColumn(this.description(), lookup);
      return res;
    }
  });
  function LayoutStringColumn(desc, rawColumns) {
    LayoutSingleColumn.call(this, desc, rawColumns);
  }
  LineUp.LayoutStringColumn = LayoutStringColumn;

  LayoutStringColumn.prototype = $.extend({}, LayoutSingleColumn.prototype, {
    filterBy : function (row) {
      var filter = this.filter;
      if (typeof filter === 'undefined' || !this.column) {
        return true;
      }
      var r = this.getValue(row);
      if (typeof r === 'boolean') {
        return r && r.trim().length > 0;
      } else if (typeof filter === 'string' && filter.length > 0) {
        return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      } else if (filter instanceof RegExp) {
        return r && r.match(filter);
      }
      return true;
    },
    makeCopy: function () {
      var lookup = d3.map();
      lookup.set(this.columnLink, this.column);
      var res = new LayoutStringColumn(this.description(), lookup);
      return res;
    }
  });
  function LayoutCategoricalColumn(desc, rawColumns) {
    LayoutSingleColumn.call(this, desc, rawColumns);
  }
  LineUp.LayoutCategoricalColumn = LayoutCategoricalColumn;

  LayoutCategoricalColumn.prototype = $.extend({}, LayoutSingleColumn.prototype, {
    filterBy : function (row) {
      var filter = this.filter;
      if (typeof filter === 'undefined' || !this.column) {
        return true;
      }
      var r = this.getValue(row);
      if (Array.isArray(filter) && filter.length > 0) {
        return filter.indexOf(r) >= 0;
      } else if (typeof filter === 'string' && filter.length > 0) {
        return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      } else if (filter instanceof RegExp) {
        return r && r.match(filter);
      }
      return true;
    },
    makeCopy: function () {
      var lookup = d3.map();
      lookup.set(this.columnLink, this.column);
      var res = new LayoutCategoricalColumn(this.description(), lookup);
      return res;
    }
  });

  function LayoutRankColumn(desc, _dummy, _dummy2, storage) {
    LayoutColumn.call(this, desc ? desc : {}, []);
    this.columnWidth = desc ? (desc.width || 50) : 50;
    this.id = fixCSS(_.uniqueId('rank_'));
    //maps keys to ranks
    this.values = d3.map();
    this.storage = storage;
  }

  LineUp.LayoutRankColumn = LayoutRankColumn;


  LayoutRankColumn.prototype = $.extend({}, LayoutColumn.prototype, {
    setValue: function (row, d) {
      this.values.set(row[this.storage.primaryKey], d);
    },
    getValue: function (row) {
      return this.values.get(row[this.storage.primaryKey]);
    },
    filter: function (row) {
      var r = this.getValue(row);
      if (typeof r === 'undefined') {
        return true;
      } else if (typeof this.filter === 'number') {
        return r >= this.filter;
      } else if (Array.isArray(this.filter)) {
        return this.filter[0] <= r && r <= this.filter[1];
      }
      return true;
    },
    getLabel: function () {
      return 'Rank';
    },
    getDataID: function () {
      return this.id;
    },
    description: function () {
      var res = LayoutColumn.prototype.description.call(this);
      res.type = 'rank';
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
    this.scale = d3.scale.linear().domain([0,1]).range([0, this.columnWidth]);
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
        var r = d.getValue(row);
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
          d.width = that.childrenWidths[i];
          d.parent = that;
          return that.toLayoutColumn(d);
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
      if (!(child instanceof LineUp.LayoutNumberColumn)) {
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
      res.type = 'stacked';
      var that = this;
      res.children = this.children.map(function (d, i) {
        var r = d.description();
        r.weight = that.childrenWeights[i];
        return r;
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
    this.id = _.uniqueId('empty_');
    this.label = '{empty}';
    this.columnWidth = 50;
  }

  LineUp.LayoutEmptyColumn = LayoutEmptyColumn;

  LayoutEmptyColumn.prototype = $.extend({}, LayoutColumn.prototype, {
    getLabel: function () {
      return this.label;
    },
    getDataID: function () {
      return this.id;
    },
    getValue : function() {
      return '';
    }
  });


  function LayoutActionColumn(spec) {
    spec = spec || {};
    LayoutColumn.call(this, spec, []);
    this.id = _.uniqueId('action_');
    this.label = '';
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
    },
    getValue : function() {
      return '';
    }
  });
}(LineUp || (LineUp = {}), d3, jQuery, _));