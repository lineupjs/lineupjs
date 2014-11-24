/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
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
      } else if (d.column && config.colorMapping.has(d.column.id)) {
        return config.colorMapping.get(d.column.id);
      } else {
        return config.grayColor;
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
        if (bundle.sortedColumn !== null && (d === bundle.sortedColumn)) {
          bundle.sortingOrderAsc = !bundle.sortingOrderAsc;
        } else {
          bundle.sortingOrderAsc = d instanceof LineUp.LayoutStringColumn || d instanceof LineUp.LayoutCategoricalColumn || d instanceof LineUp.LayoutRankColumn;
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

    allHeadersEnter.append('g').attr('class', 'hist');
    var allNumberHeaders = allHeaders.filter(function (d) {
      return d instanceof LineUp.LayoutNumberColumn;
    });
    if (this.config.renderingOptions.histograms) {
      allNumberHeaders.selectAll('g.hist').each(function (d) {
        var $this = d3.select(this).attr('transform','scale(1,'+ (d.height)+')');
        var h = d.hist;
        if (!h) {
          return;
        }
        var s = d.value2pixel.copy().range([0, d.value2pixel.range()[1]-5]);
        var $hist = $this.selectAll('rect').data(h);
        $hist.enter().append('rect');
        $hist.attr({
          x : function(bin) {
            return s(bin.x);
          },
          width: function(bin) {
            return s(bin.dx);
          },
          y: function(bin) {
            return 1-bin.y;
          },
          height: function(bin) {
            return bin.y;
          }
        });
      });
    } else {
      allNumberHeaders.selectAll('g.hist').selectAll('*').remove();
    }

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
        return sc === d;
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
        return d.getLabel();
      });
    allHeaders.select('title').text(function (d) {
      return d.getLabel();
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
      return ((sc === d) ?
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
            return (d.column) ? [d] : [];
          },
          action: function (d) {
            if (d instanceof LineUp.LayoutStringColumn) {
              that.openFilterPopup(d, d3.select(this));
            } else if (d instanceof LineUp.LayoutCategoricalColumn) {
              that.openCategoricalFilterPopup(d, d3.select(this));
            } else if (d instanceof LineUp.LayoutNumberColumn) {
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

  LineUp.prototype.hoverHistogramBin = function (row) {
    if (!this.config.renderingOptions.histograms) {
      return;
    }
    var $hists = this.$header.selectAll('g.hist');
    $hists.selectAll('rect').classed('hover',false);
    if (row) {
      this.$header.selectAll('g.hist').each(function(d) {
        if (d instanceof LineUp.LayoutNumberColumn && d.hist) {
          var bin = d.binOf(row);
          if (bin >= 0) {
            d3.select(this).select('rect:nth-child('+(bin+1)+')').classed('hover',true);
          }
        }
      });
    }
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
    this.storage.addStackedColumn(null, -1);
    this.headerUpdateRequired = true;
    this.updateAll();
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
    this.updateAll();
  };
}(LineUp || (LineUp = {}), d3, jQuery));
