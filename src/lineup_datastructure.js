/*
 * extracted from lineUp.js (created by sam gratzl)
 * modified by hen
 *
 * contains the main  LineUp data structure
 * and a loader for client side storage of whole table
 * */

/**
 * The mother of all Columns
 * @param desc The descriptor object
 * @class
 */
function LineUpColumn(desc) {
  this.column = desc.column;
  this.label = desc.label || desc.column;
  this.id = desc.id || this.column;
  this.missingValue = desc.missingValue;
  this.layout = {};
}
LineUpColumn.prototype = $.extend({}, {}, {
  getValue: function (row) {
    var r= row[this.column];
    if (typeof r === "undefined") {
      return this.missingValue;
    }
    return r;
  },
  getRawValue : function(row) {
    var r =  this.getValue(row);
    if (typeof r === 'undefined') {
      return '';
    }
    return r;
  },
  filter: function(row, filter) {
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
    .domain(desc.domain || [0,100]).range(desc.range || [0, 1]);
  this.scaleOri = this.scale.copy();
  if (typeof this.missingValue === "undefined") {
    this.missingValue = NaN;
  }
}
LineUpNumberColumn.prototype = $.extend({}, LineUpColumn.prototype, {
  getValue: function (row) {
    var r = LineUpColumn.prototype.getValue.call(this, row);
    if (r === '' || r.toString().trim().length === 0) {
      r = this.missingValue;
    }
    return this.scale(+r);
  },
  getRawValue : function(row) {
    var r = LineUpColumn.prototype.getValue.call(this, row);
    if (isNaN(r)) {
      return '';
    }
    return r;
  },
  filter: function(row, filter) {
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

LineUpStringColumn.prototype = $.extend({}, LineUpColumn.prototype, {
  filter: function (row, filter) {
    var r = this.getValue(row);
    if (typeof r === 'boolean') {
      return r && r.trim().length > 0;
    } else if (typeof filter === 'string') {
      return r && r.contains(filter);
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
LineUpRankColumn.prototype = $.extend({}, LineUpColumn.prototype, {
  setValue: function (row, d) {
    this.values.set(row[this.storage.primaryKey], d)
  },
  getValue: function (row) {
    return this.values.get(row[this.storage.primaryKey])
  },
  filter: function(row, filter) {
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
  this.scale = d3.scale.linear().domain([0,1]).range([0, that.columnWidth]);
  this.filter = desc.filter;

  this.parent = desc.parent; // or null
  this.columnBundle = desc.columnBundle || "primary";
  //define it here to have a dedicated this pointer
  this.sortBy = function (a, b) {
    var a = that.column.getValue(a);
    var b = that.column.getValue(b);
    return that.safeSortBy(a,b);
  }
}

LayoutColumn.prototype = $.extend({}, {}, {
  setColumnWidth: function (newWidth, ignoreParent) {
    var _ignoreParent = ignoreParent || false;
//        console.log("UPdate", newWidth, _ignoreParent);
    this.columnWidth = newWidth;
    this.scale.range([0, newWidth]);
    if (!ignoreParent && this.parent) {
      this.parent.updateWidthFromChild({id: this.id, newWidth: newWidth});
    }
  },
  getColumnWidth: function () {
    return this.columnWidth;
  },
  safeSortBy: function(a,b) {
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
    array.push(this)
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
  isFiltered : function() {
    return typeof this.filter !== 'undefined';
  },
  filterBy : function(row) {
    return true;
  }
});


function LayoutSingleColumn(desc, rawColumns) {
  LayoutColumn.call(this, desc);
  this.columnLink = desc.column;
  var that = this;
  this.column = (desc.column == "") ? null : rawColumns.filter(function (d) {
    return d.id == that.columnLink;
  })[0];
  this.id = _.uniqueId(this.columnLink + "_");
  if (this.column) this.init();
}

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

  filterBy: function(row) {
    if (typeof this.filter === 'undefined' || !this.column) {
      return true;
    }
    return this.column.filter(row, this.filter);
  },

  getLabel: function () {
    return this.column.label
  },
  getDataID: function () {
    return this.column.id
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


LayoutRankColumn.prototype = $.extend({}, LayoutColumn.prototype, {
  getLabel: function () {
    return this.column.label
  },
  getDataID: function () {
    return this.column.id
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

LayoutCompositeColumn.prototype = $.extend({}, LayoutColumn.prototype, {
  getDataID: function () {
    return this.id
  },
  getLabel: function () {
    return this.label
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
    that.children.forEach(function (d, i) {
      aAll += d.getWidth(a);
      bAll += d.getWidth(b);
    });
    return that.safeSortBy(aAll, bAll);
  }

}

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
          return +(d.weight || 1)
        });

        this.scale.domain([0, d3.sum(this.childrenWeights)]);

        if (desc.hasOwnProperty('width')) {
          // if the stacked column has a width -- normalize to width
          this.childrenWidths = this.childrenWeights.map(function (d) {
            return that.scale(d);
          })
        } else {
          // if width was artificial set, approximate a total width of x*100
          this.columnWidth = this.children.length * 100;
          this.scale.range([0, that.columnWidth])

        }

      } else {
        // accumulate weights and map 100px to  weight 1.0
        this.childrenWidths = this.childrenLinks.map(function (d) {
          return +(d.width || 100)
        });
        this.childrenWeights = this.childrenWidths.map(function (d) {
          return d / 100.0
        });
        this.columnWidth = d3.sum(this.childrenWidths);
        this.scale.domain([0, d3.sum(this.childrenWeights)]).range([0, this.columnWidth]);
      }

      this.children = this.childrenLinks.map(function (d, i) {
//            console.log(that);
        return that.toLayoutColumn({column: d.column, width: that.childrenWidths[i], parent: that })
      })

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
      })
    }
  },
  filterBy : function(row) {
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
  updateWidthFromChild: function (spec) {
    var that = this;

    // adopt weight and global size
    this.childrenWidths = this.children.map(function (d) {
      return d.getColumnWidth()
    });
    this.childrenWeights = this.childrenWidths.map(function (d) {
      return that.scale.invert(d)
    });

    this.columnWidth = d3.sum(this.childrenWidths);
    this.scale.range([0, this.columnWidth]);
    this.scale.domain([0, d3.sum(this.childrenWeights)])
  },
  setColumnWidth: function (newWidth) {
    var that = this;
    this.columnWidth = newWidth;
    that.scale.range([0, this.columnWidth]);
    this.childrenWidths = this.childrenWeights.map(function (d) {
      return that.scale(d)
    });
//        console.log(this.childrenWidths, this.childrenWeights);
    this.children.forEach(function (d, i) {
      return d.setColumnWidth(that.childrenWidths[i], true)
    });
  },
  updateWeights: function (weights) {
    this.childrenWeights = weights;
    this.scale.domain([0, d3.sum(this.childrenWeights)]);

    var that = this;
    this.childrenWidths = this.childrenWeights.map(function (d) {
      return that.scale(d)
    });
    this.columnWidth = d3.sum(this.childrenWidths);
    this.children.forEach(function (d, i) {
      return d.setColumnWidth(that.childrenWidths[i], true)
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
      this.emptyColumns = [new LayoutEmptyColumn({parent: that})];
      this.columnWidth = 100;
    }

  },
  addChild: function (child, targetChild, position) {
    if (!(child instanceof LayoutSingleColumn && child.column instanceof LineUpNumberColumn)) return false;

    var targetIndex = 0;
    if (targetChild instanceof LayoutEmptyColumn) {
      this.emptyColumns = [];
    } else {
      targetIndex = this.children.indexOf(targetChild);
      if (position == "r") targetIndex++;
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
      return {column: d.columnLink, weight: that.childrenWeights[i]}
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
      d.parent = res
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
    getValue: function (a) {
      return ""
    },
    getRawValue: function (a) {
      return "";
    }};
  this.id = _.uniqueId(this.columnLink + "_");
  this.label = "{empty}";
  this.columnWidth = 50
}
LayoutEmptyColumn.prototype = $.extend({}, LayoutColumn.prototype, {
  getLabel: function () {
    return this.label
  },
  getDataID: function () {
    return this.id
  }
});



function LayoutActionColumn(spec) {
  spec = spec || {};
  LayoutColumn.call(this, spec, []);
  this.columnLink = 'action';
  this.column = {
    getValue: function (a) {
      return ""
    },
    getRawValue: function (a) {
      return "";
    }};
  this.id = _.uniqueId(this.columnLink + "_a");
  this.label = "";
  this.columnWidth = spec.width || 50
}
LayoutActionColumn.prototype = $.extend({}, LayoutColumn.prototype, {
  getLabel: function () {
    return this.label
  },
  getDataID: function () {
    return this.id
  },
  description : function() {
    var res = LayoutColumn.prototype.description.call(this);
    res.type = 'actions';
    return res;
  }
});







