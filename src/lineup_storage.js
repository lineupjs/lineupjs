/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/18/14.
 */
/**
 * An implementation of data storage for reading locally
 * @param tableId
 * @param data
 * @param columns
 * @param config
 * @class
 */
function LineUpLocalStorage(data, columns, layout, primaryKey, storageConfig) {
  this.storageConfig = $.extend(true, {}, storageConfig, {
    colTypes: {
      "number": LineUpNumberColumn,
      "string": LineUpStringColumn,
//        "max" : LineUpMaxColumn,
//        "stacked" : LineUpStackedColumn,
      "rank": LineUpRankColumn
    },
    layoutColumnTypes: {
      "single": LayoutSingleColumn,
      "stacked": LayoutStackedColumn,
      "rank": LayoutRankColumn,
      "actions": LayoutActionColumn
    }
  });
  this.config = null ; //will be injected by lineup

  var colTypes = this.storageConfig.colTypes;
  var layoutColumnTypes = this.storageConfig.layoutColumnTypes;
  var that = this;

  function toColumn(desc) {
    return new colTypes[desc.type](desc, toColumn);
  }
  this.storageConfig.toColumn = toColumn;

  function toLayoutColumn(desc) {
    var type = desc.type || "single";
    return new layoutColumnTypes[type](desc, that.rawcols, toLayoutColumn, that)
  }
  this.storageConfig.toLayoutColumn = toLayoutColumn;

  this.primaryKey = primaryKey;
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

/**
 * generate a default layout by just showing all columns with 100 px
 * @param columns
 * @returns {{primary: (Array|*)}}
 */
LineUpLocalStorage.generateDefaultLayout = function(columns) {
  var layout = columns.map(function(c) {
    return {
      column: c.id,
      width: c instanceof LineUpStringColumn ? 200 : 100
    }
  });
  return {
    primary : layout
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
    resortData: function (spec) {

      var asc = spec.asc || this.config.columnBundles.primary.sortingOrderAsc;
      var _key = spec.key || "primary";
      var column = spec.column || this.config.columnBundles.primary.sortedColumn;

      if (column == null) return;
      //console.log("resort: ", spec);
      this.data.sort(column.sortBy);

      var rankColumn = this.bundles[_key].layoutColumns.filter(function (d) {
        return d.column instanceof LineUpRankColumn;
      });
      if (rankColumn.length > 0) {
        if (column instanceof LayoutStackedColumn) {
          this.assignRanks(
            this.data,
            function (d) {
              return column.getValue(d)
            },
            rankColumn[0].column
          );
        } else {
          this.assignRanks(
            this.data,
            function (d) {
              return column.column.getValue(d)
            },
            rankColumn[0].column
          );
        }
      }

      if (asc) this.data.reverse();

    },
    /*
     * assigns the ranks to the data which is expected to be sorted in decreasing order
     * */
    assignRanks: function (data, accessor, rankColumn) {

      var actualRank = 1;
      var actualValue = -1;

      data.forEach(function (row, i) {
        if (actualValue == -1) actualValue = accessor(row);

//                console.log(row, accessor(row));
        if (actualValue != accessor(row)) {
          actualRank = i+1; //we have 1,1,3, not 1,1,2
          actualValue = accessor(row);
        }
        rankColumn.setValue(row, actualRank);
      });
    },
    generateLayout: function (layout, bundle) {
      var that = this;
      console.log(that);
      var _bundle = bundle || "primary";

      // create Rank Column
//            new LayoutRankColumn();

      var b  = {};
      b.layoutColumns = layout[_bundle].map(this.storageConfig.toLayoutColumn);
      console.log(b.layoutColumns, layout);
      //if there is no rank column create one
      if (b.layoutColumns.filter(function (d) {
        return d instanceof LayoutRankColumn;
      }).length < 1) {
        b.layoutColumns.unshift(new LayoutRankColumn(null, null, null, this))
      }

      //if we have row actions and no action column create one
      if (this.config.svgLayout.rowActions.length > 0 && b.layoutColumns.filter(function (d) {
        return d instanceof LayoutActionColumn;
      }).length < 1) {
        b.layoutColumns.push(new LayoutActionColumn())
      }

      this.bundles[_bundle] = b;
    },
    addColumn: function(col, bundle) {
      var _bundle = bundle || "primary";
      var cols = this.bundles[_bundle].layoutColumns, i, c;
      //insert the new column after the first non rank, text column
      for(i = 0; i < cols.length; ++i) {
        c = cols[i];
        if (c instanceof LayoutRankColumn || (c instanceof LayoutSingleColumn && c.column instanceof LineUpStringColumn)) {
          continue;
        }
        break;
      }
      cols.splice(i,0, col);
    },
    addStackedColumn: function (spec, bundle) {
      var _spec = spec || {label: "Stacked", children: []};
      this.addColumn(new LayoutStackedColumn(_spec, this.rawcols, this.storageConfig.toLayoutColumn), bundle);
    },
    addSingleColumn: function (spec, bundle) {
      this.addColumn(new LayoutSingleColumn(spec, this.rawcols), bundle);
    },


    removeColumn: function (col, bundle) {
      var _bundle = bundle || "primary";

      var headerColumns = this.bundles[_bundle].layoutColumns;

      if (col instanceof LayoutStackedColumn) {
        var indexOfElement = _.indexOf(headerColumns, col);//function(c){ return (c.id == d.id)});
        if (indexOfElement != undefined) {
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

          Array.prototype.splice.apply(headerColumns, [indexOfElement, 1].concat(addColumns))

        }


      } else if (col instanceof LayoutSingleColumn) {
        if (col.parent == null || col.parent == undefined) {
          headerColumns.splice(headerColumns.indexOf(col), 1);
        } else {
          col.parent.removeChild(col);
          this.resortData({})
        }
      }


    },
    setColumnLabel: function (col, newValue, bundle) {
      var _bundle = bundle || "primary";

      //TODO: could be done for all Column header
      var headerColumns = this.bundles[_bundle].layoutColumns;
      headerColumns.filter(function (d) {
        return d.id == col.id;
      })[0].label = newValue;
    },
    moveColumn: function (column, targetColumn, position, bundle) {
      var _bundle = bundle || "primary";

      var headerColumns = this.bundles[_bundle].layoutColumns;
      var that = this;

      // different cases:
      if (column.parent == null && targetColumn.parent == null) {
        // simple L1 Column movement:

        headerColumns.splice(headerColumns.indexOf(column), 1)

        var targetIndex = headerColumns.indexOf(targetColumn);
        if (position == "r") {
          targetIndex++;
        }
        headerColumns.splice(targetIndex, 0, column)
      }
      else if (!(column.parent == null) && targetColumn.parent == null) {
        // move from stacked Column
        column.parent.removeChild(column);

        var targetIndex = headerColumns.indexOf(targetColumn);
        if (position == "r") {
          targetIndex++;
        }
        headerColumns.splice(targetIndex, 0, column)

      } else if (column.parent == null && !(targetColumn.parent == null)) {

        // move into stacked Column
        if (targetColumn.parent.addChild(column, targetColumn, position)) {
          headerColumns.splice(headerColumns.indexOf(column), 1)
        }
        ;

      } else if (!(column.parent == null) && !(targetColumn.parent == null)) {

        // move from Stacked into stacked Column
        column.parent.removeChild(column);
        targetColumn.parent.addChild(column, targetColumn, position)

      }
      this.resortData({})
    },
    copyColumn: function (column, targetColumn, position, bundle) {
      var _bundle = bundle || "primary";

      var headerColumns = this.bundles[_bundle].layoutColumns;

      var newColumn = column.makeCopy();

      var that = this;

      // different cases:
      if (targetColumn.parent == null) {

        var targetIndex = headerColumns.indexOf(targetColumn);
        if (position == "r") {
          targetIndex++;
        }
        headerColumns.splice(targetIndex, 0, newColumn)
      }
      else if (!(targetColumn.parent == null)) {
        // copy into stacked Column
        targetColumn.parent.addChild(newColumn, targetColumn, position);
      }
      this.resortData({})
    },

    /**
     * returns a column by name
     * @param name
     * @returns {*}
     */
    getColumnByName : function(name) {
      var cols = this.getColumnLayout();
      for(var i = cols.length - 1; i>=0; --i) {
        var col = cols[i];
        if (col.getLabel() === name || (col.column && col.column.column === name)) {
          return col;
        }
      }
      return null;
    }



  });

///**
// * LineUp Query object to send to a storage instance requesting updates
// * @constructor
// */
//function LineUpQuery(rowRange, columnWeights){
//    this.rowRange=[0,100];
//    this.columnWeights = [];
//    this.ranks =[];
//
//    function getRanks(){
//        return this.ranks;
//    }
//
//
//
//}



