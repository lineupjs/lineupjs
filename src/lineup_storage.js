/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/18/14.
 */
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
        'number': LineUp.LineUpNumberColumn,
        'string': LineUp.LineUpStringColumn,
        'categorical': LineUp.LineUpCategoricalColumn
      },
      layoutColumnTypes: {
        'number': LineUp.LayoutNumberColumn,
        'single': LineUp.LayoutStringColumn,
        'string': LineUp.LayoutStringColumn,
        'categorical': LineUp.LayoutCategoricalColumn,
        'stacked': LineUp.LayoutStackedColumn,
        'rank': LineUp.LayoutRankColumn,
        'actions': LineUp.LayoutActionColumn
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

    this.primaryKey = primaryKey;
    this.rawdata = data;
    this.data = data;
    this.initialSort = true;
    this.rawcols = columns.map(toColumn);
    this.layout = layout || LineUpLocalStorage.generateDefaultLayout(this.rawcols);

    var colLookup = d3.map();
    this.rawcols.forEach(function (col) {
      colLookup.set(col.column, col);
    });
    function toLayoutColumn(desc) {
      var type = desc.type || 'single';
      if (type === 'single') {
        var col = colLookup.get(desc.column);
        if (col instanceof LineUp.LineUpNumberColumn) {
          type = 'number';
        } else if (col instanceof LineUp.LineUpCategoricalColumn) {
          type = 'categorical';
        }
      }
      return new layoutColumnTypes[type](desc, colLookup, toLayoutColumn, that);
    }

    this.storageConfig.toLayoutColumn = toLayoutColumn;

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
        column: c.column,
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

        var _key = spec.key || "primary", that = this;
        var bundle = this.bundles[_key];
        var asc = spec.asc || this.config.columnBundles.primary.sortingOrderAsc;
        var column = spec.column || this.config.columnBundles.primary.sortedColumn;

        //console.log("resort: ", spec);
        this.filterData(bundle.layoutColumns);
        if (spec.filteredChanged || this.initialSort) {
          //trigger column updates
          var flat = [];
          bundle.layoutColumns.forEach(function (d) {
            d.flattenMe(flat);
          });
          flat.forEach(function (col) {
            col.prepare(that.data, that.config.renderingOptions.histograms);
          });
          this.initialSort = false;
        }

        function sort(a,b) {
          var r = column.sortBy(a,b);
          return asc ? -r : r;
        }
        if (column) {
          this.data.sort(sort);
        }

        var start = this.config.filter.skip ? this.config.filter.skip : 0;
        if ((this.config.filter.limit && isFinite(this.config.filter.limit))) {
          this.data = this.data.slice(start, start + this.config.filter.limit);
        } else {
          this.data = this.data.slice(start);
        }

        var rankColumn = bundle.layoutColumns.filter(function (d) {
          return d instanceof LineUp.LayoutRankColumn;
        });
        if (rankColumn.length > 0) {
          var accessor = function (d, i) {
            return i;
          };
          if (column) {
            accessor = function (d) {
              return column.getValue(d);
            };
          }
          this.assignRanks(this.data, accessor, rankColumn);
        }
      },
      /*
       * assigns the ranks to the data which is expected to be sorted in decreasing order
       * */
      assignRanks: function (data, accessor, rankColumns) {

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
          rankColumns.forEach(function (r) {
            r.setValue(row, actualRank);
          });
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
      addColumn: function (col, bundle, position) {
        var _bundle = bundle || "primary";
        var cols = this.bundles[_bundle].layoutColumns, i, c;
        //insert the new column after the first non rank, text column
        if (typeof position === 'undefined' || position === null) {
          for (i = 0; i < cols.length; ++i) {
            c = cols[i];
            if (c instanceof LineUp.LayoutRankColumn || (c instanceof LineUp.LayoutStringColumn)) {
              continue;
            }
            break;
          }
        } else {
          if (position < 0) {
            position = cols.length + 1 + position;
          }
          i =  Math.max(0, Math.min(cols.length, position));
        }
        cols.splice(i, 0, col);
      },
      addStackedColumn: function (spec, position) {
        var _spec = $.extend({ type: 'stacked', label: 'Stacked', children: []}, spec);
        this.addColumn(this.storageConfig.toLayoutColumn(_spec), null, position);
      },
      addSingleColumn: function (spec, position) {
        this.addColumn(this.storageConfig.toLayoutColumn(spec), null, position);
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


        } else if (col.column) {
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
