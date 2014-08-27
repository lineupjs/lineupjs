/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
/**
 * Render the given headers
 * @param headers - the array of headers, see {@link LineUpColumn}
 */
LineUp.prototype.updateHeader = function (headers, config) {
//    console.log("update Header");
  var rootsvg = this.$header;
  var svg = rootsvg.select('g.main');
  var svgOverlay = rootsvg.select('g.overlay');

  var that = this;

  if (config.headerUpdateRequired) {
    this.layoutHeaders(headers, config)
  }

  var allHeaderData = [];
  headers.forEach(function (d) {
    d.flattenMe(allHeaderData, {addEmptyColumns: true});
  })

  //console.log(allHeaderData);


  // -- Handle the header groups (exit,enter, update)

  var allHeaders = svg.selectAll(".header").data(allHeaderData, function (d) {
    return d.id;
  });
  allHeaders.exit().remove();

  // --- adding Element to class allHeaders
  var allHeadersEnter = allHeaders.enter().append("g").attr({
    "class": "header"
  })
    .classed("emptyHeader", function (d) {

      return d instanceof LayoutEmptyColumn || d instanceof LayoutActionColumn;
    })
    .call(function (d) {
      that.addResortDragging(this, config)
    })

  // --- changing nodes for allHeaders
  allHeaders.attr({
    "transform": function (d) {
      return "translate(" + d.offsetX + "," + d.offsetY + ")";
    }
  })


  // -- handle BackgroundRectangles

  allHeadersEnter.append("rect").attr({
    "class": "labelBG",
    y: 0,
    width: function (d) {
      return d.getColumnWidth()
    },
    height: function (d) {
      return d.height;
    }
  }).style({
    "fill": function (d, i) {
      if (d instanceof LayoutEmptyColumn) {
        return "lightgray"
      } else if (d instanceof LayoutStackedColumn || !config.colorMapping.has(d.column.id) || d instanceof LayoutActionColumn) {
        return config.grayColor;
      } else {
        return config.colorMapping.get(d.column.id);
      }

    }
  }).on({
    "click": function (d) {
      if (d3.event.defaultPrevented || d instanceof LayoutEmptyColumn || d instanceof LayoutActionColumn) return;
      // no sorting for empty stacked columns !!!
      if (d instanceof LayoutStackedColumn && d.children.length < 1) return;

      var bundle = config.columnBundles[d.columnBundle];
      // TODO: adapt to comparison mode !!
      if (bundle.sortedColumn != null && (d.getDataID() == bundle.sortedColumn.getDataID())) {
        bundle.sortingOrderAsc = bundle.sortingOrderAsc ? false : true;
      } else {
        bundle.sortingOrderAsc = false;
      }

      that.storage.resortData({column: d, asc: bundle.sortingOrderAsc});
      that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), false, config);
      bundle.sortedColumn = d;
      that.updateHeader(that.storage.getColumnLayout(), config);
    }
  });

  allHeaders.select(".labelBG").attr({
    width: function (d) {
      return d.getColumnWidth() - 5
    },
    height: function (d) {
      return d.height
    }
  });


  // -- handle WeightHandle


  allHeadersEnter.filter(function (d) {
    return !(d instanceof LayoutEmptyColumn) && !(d instanceof LayoutActionColumn);
  }).append("rect").attr({
    "class": "weightHandle",
    x: function (d) {
      return d.getColumnWidth() - 5
    },
    y: 0,
    width: 5
  })

  allHeaders.select(".weightHandle").attr({
    x: function (d) {
      return (d.getColumnWidth() - 5)
    },
    height: function (d) {
      return d.height
    }
  }).call(this.dragWeight) // TODO: adopt dragWeight function !


  // -- handle Text
  allHeadersEnter.append("text").attr({
    "class": "headerLabel",
    x: 12
  })

  allHeaders.select(".headerLabel")
    .classed("sortedColumn", function (d) {
      var sc = config.columnBundles[d.columnBundle].sortedColumn
      if (sc) {
        return d.getDataID() == sc.getDataID()
      } else {
        return false;
      }
    })
    .attr({
      y: function (d) {
        if (d instanceof LayoutStackedColumn || d.parent != null) return d.height / 2;
        else return d.height * 3 / 4;
      }
    }).text(function (d) {
      if (d instanceof LayoutStackedColumn || d instanceof LayoutEmptyColumn || d instanceof LayoutActionColumn) return d.label
      else return d.column.label;
    })


  // -- handle the Sort Indicator
  allHeadersEnter.append("text").attr({
    'class': 'headerSort',
    y: function (d) {
      return d.height / 2
    },
    x: 2
  });

  allHeaders.select(".headerSort").text(function (d) {
    var sc = config.columnBundles[d.columnBundle].sortedColumn
    return ((sc && d.getDataID() == sc.getDataID()) ?
      ((config.columnBundles[d.columnBundle].sortingOrderAsc) ? '\uf0de' : '\uf0dd')
      : "");
  })
    .attr({
      y: function (d) {
        return d.height / 2
      }
    })


  // add info Button to All Stacked Columns
  allHeadersEnter.filter(function (d) {
    return d instanceof LayoutStackedColumn;
  }).append("text").attr({
    class: "stackedColumnInfo fontawe"
  })
    .text("\uf1de")
    .on("click", function (d) {
      that.stackedColumnOptionsGui(d)
    })


  allHeaders.filter(function (d) {
    return d instanceof LayoutStackedColumn;
  }).select(".stackedColumnInfo").attr({
    x: function (d) {
      return d.getColumnWidth() - 15
    },
    y: function (d) {
      return d.height / 2
    }
  })


  // add delete Button to All Single Columns


  var deleteButton = allHeaders.selectAll(".singleColumnDelete").data(function (d) {
    return (!(d instanceof LayoutStackedColumn)) ? [d] : [];
  });
  deleteButton.exit().remove();

  // --- adding Element to class weightHandle
  var deletButtonEnter = deleteButton.enter().append("text").attr({
    "class": "singleColumnDelete fontawe"
  }).text("\uf014")
    .on("click", function (d) {
      that.storage.removeColumn(d);
      that.updateAll();
    })

  // --- changing nodes for weightHandle
  deleteButton.attr({
    x: function (d) {
      return d.getColumnWidth() - 15
    },
    y: function (d) {
      return d.height / 4
    }
  })
/* TODO fix mapping editor to be fully functional
  var filterButton = allHeaders.selectAll(".singleColumnFilter").data(function (d) {
    return (d instanceof LayoutSingleColumn && d.column instanceof LineUpNumberColumn) ? [d] : []
  });
  filterButton.exit().remove();

  // --- adding Element to class weightHandle
  filterButton.enter().append("text").attr({
    "class": "singleColumnFilter fontawe"
  }).text("\uf0b0")
    .on("click", function (d) {
      that.openMappingEditor(d);
      //that.updateAll();
    });
  // --- changing nodes for weightHandle
  filterButton.attr({
    x: function (d) {
      return d.getColumnWidth() - 28
    },
    y: function (d) {
      return d.height / 4
    }
  })
*/

//    allHeadersEnter.filter(function(d){return (!(d instanceof LayoutStackedColumn) && d.parent==null)}).append("text").attr({
//        class:"singleColumnDelete fontawe"
//    })
//        .text("\uf014")
//        .on("click", function(d){
//            that.storage.removeSingleColumn(d);
//            that.updateAll();
//        })
//    allHeaders.filter(function(d){return (!(d instanceof LayoutStackedColumn) && d.parent==null);}).select(".singleColumnDelete").attr({
//        x:function(d){return d.getColumnWidth()-15},
//        y:function(d){return d.height/4}
//    })


  // ==================
  // -- Render add ons
  //===================


  // add column sign:
  var plusButton = [];
  if (config.svgLayout.plusSigns.hasOwnProperty("addStackedColumn"))
    plusButton.push(config.svgLayout.plusSigns["addStackedColumn"])

  var addColumnButton = svg.selectAll(".addColumnButton").data(plusButton);
  addColumnButton.exit().remove();


  var addColumnButtonEnter = addColumnButton.enter().append("g").attr({
    class: "addColumnButton"
  })

  addColumnButton.attr({
    "transform": function (d) {
      return "translate(" + d.x + "," + d.y + ")";
    }
  })

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
    console.log(d.action);
    console.log(that);
    if ($.isFunction(d.action)) {
      d.action.call(that, d);
    } else {
      that[d.action](d);
    }
  })

  addColumnButtonEnter.append("text").attr({
    x: function (d) {
      return d.w / 2;
    },
    y: function (d) {
      return d.h / 2;
    }
  }).text('\uf067')


};


// ===============
// Helperfunctions
// ===============


LineUp.prototype.addResortDragging = function (xss, config) {
  if (config.config.nodragging) {
    return;
  }

  var x = d3.behavior.drag()
//                .origin(function(d) { return d; })
    .on("dragstart", dragstart)
    .on("drag", dragmove)
    .on("dragend", dragend);

  var that = this;
  var rootsvg = this.$header;
  var svgOverlay = rootsvg.select('g.overlay');
  x.call(xss)


  var hitted = null;
  var moved = false;


  function dragstart(d) {
    if (d instanceof LayoutEmptyColumn) return;

    d3.event.sourceEvent.stopPropagation(); // silence other listeners

    d3.select(this).classed("dragObject", true);

    hitted = null;
    moved = false;
  }


  function dragmove(d) {
    if (d instanceof LayoutEmptyColumn) return;

    moved = true;
    var dragHeader = svgOverlay.selectAll(".dragHeader").data([d])
    var dragHeaderEnter = dragHeader.enter().append("g").attr({
      class: "dragHeader"
    })

    dragHeaderEnter.append("rect").attr({
      class: "labelBG",
      width: function (d) {
        return d.getColumnWidth();
      },
      height: function (d) {
        return d.height
      }

    })

    var x = d3.event.x;
    var y = d3.event.y;
    dragHeader.attr({
      "transform": function () {
        return "translate(" + (d3.event.x + 3) + "," + (d3.event.y - 10) + ")";
      }
    })


    var allHeaderData = [];
    that.storage.getColumnLayout().forEach(function (d) {
      d.flattenMe(allHeaderData, {addEmptyColumns: true});
    })

    function contains(header, x, y) {
      //TODO check if types match
      if (x > header.offsetX && (x - header.offsetX) < header.getColumnWidth()) {
        if (y > header.offsetY && (y - header.offsetY) < header.height) {
          if ((x - header.offsetX < header.getColumnWidth() / 2))
            return {column: header, insert: "l", tickX: (header.offsetX), tickY: (header.offsetY), tickH: header.height}
          else
            return {column: header, insert: "r", tickX: (header.offsetX + header.getColumnWidth()), tickY: (header.offsetY), tickH: header.height}
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

    var columnTick = svgOverlay.selectAll(".columnTick").data(hitted ? [hitted] : [])
    columnTick.exit().remove();
    columnTick.enter().append("rect").attr({
      class: "columnTick",
      width: 10
    })

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
    })

  }


  function dragend(d) {
    if (d3.event.defaultPrevented) return;
    if (d instanceof LayoutEmptyColumn) return;

    d3.select(this).classed("dragObject", false);
    svgOverlay.selectAll(".dragHeader").remove();
    svgOverlay.selectAll(".columnTick").remove();

    if (hitted && hitted.column == this.__data__) return;

    if (hitted) {
//            console.log("EVENT: ", d3.event);
      if (d3.event.sourceEvent.altKey) {
        that.storage.copyColumn(this.__data__, hitted.column, hitted.insert)
      } else {
        that.storage.moveColumn(this.__data__, hitted.column, hitted.insert)
      }

//            that.layoutHeaders(that.storage.getColumnLayout());
      that.updateAll();

    }

    if (hitted == null && moved) {
      that.storage.removeColumn(this.__data__);
      that.updateAll();
    }


  }
}


LineUp.prototype.addNewEmptyStackedColumn = function () {
  this.storage.addStackedColumn();
  this.updateHeader(this.storage.getColumnLayout(), LineUpGlobal);
}


/**
 * called when a Header width changed, calls {@link updateHeader}
 * @param change - the change information
 * @param change.column - the changed column, see {@link LineUpColumn}
 * @param change.value - the new column width
 */
LineUp.prototype.reweightHeader = function (change) {

//    console.log(change);
  change.column.setColumnWidth(change.value);
  this.updateHeader(this.storage.getColumnLayout(), LineUpGlobal);


};


