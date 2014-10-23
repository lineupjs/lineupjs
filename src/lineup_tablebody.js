/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
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
      return d instanceof LineUp.LayoutCategoricalColumn || d instanceof LineUp.LayoutStringColumn|| d instanceof LineUp.LayoutRankColumn;
    });

    var rowCenter = (config.svgLayout.rowHeight / 2);

    var textRows = allRows.selectAll(".tableData.text")
      .data(function (d) {
        var dd = allTextHeaders.map(function (column) {
          return {
            value: column.getValue(d),
            label: column.getValue(d, 'raw'),
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
    var r =col.getValue(row, 'raw');
    if (col instanceof LineUp.LayoutNumberColumn || col instanceof LineUp.LayoutStackedColumn) {
      r = isNaN(r) || r.toString() === '' ? '' : +r;
    }
    return r;
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

    var headerShift = 0;
    if (that.config.svgLayout.mode === 'combined') {
      headerShift = that.config.htmlLayout.headerHeight;
    }
    this.$bodySVG.attr("height", datLength * that.config.svgLayout.rowHeight + headerShift);

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
            textOverlays.push({id: col.id, value: col.getValue(row), label: that.config.numberformat(+col.getValue(row,'raw')),
              x: col.offsetX,
              w: col.getColumnWidth()});
          } else if (col instanceof  LineUp.LayoutStackedColumn) {
            var allStackOffset = 0;

            col.children.forEach(function (child) {
              var allStackW = child.getWidth(row);

              textOverlays.push({
                  id: child.id,
                  label: toValue(child.getValue(row,'raw')) + " -> (" + zeroFormat(child.getWidth(row)) + ")",
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
        that.hoverHistogramBin(row);
        that.listeners['hover'](row, shift);
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
        that.hoverHistogramBin(null);
        that.listeners['hover'](null);
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
