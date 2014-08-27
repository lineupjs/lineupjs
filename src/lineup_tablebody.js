/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
/**
 * updates the table body
 * @param headers - the headers as in {@link updateHeader}
 * @param data - the data array from {@link LineUpLocalStorage.prototype#getData()}
 */
(function() {
  function updateText(allHeaders, allRows, svg, config) {
    // -- the text columns

    var allTextHeaders = allHeaders.filter(function (d) {
      return (d.hasOwnProperty('column') && (d.column instanceof LineUpStringColumn || d instanceof LayoutRankColumn));
    });

    //generate clip paths for the text columns to avoid text overflow
    //see http://stackoverflow.com/questions/11742812/cannot-select-svg-foreignobject-element-in-d3
    //there is a bug in webkit which present camelCase selectors
    var textClipPath = svg.select('defs').selectAll(function () {
      return this.getElementsByTagName("clipPath");
    }).data(allTextHeaders);
    textClipPath.enter().append('clipPath')
      .attr('id', function (d) {
        return 'clip-' + d.column.id;
      })
      .append('rect').attr({
        y: 0,
        height: '1000'
      });
    textClipPath.exit().remove();
    textClipPath.select('rect')
      .attr({
        x: function (d) {
          return d.offsetX;
        },
        width: function (d) {
          return Math.max(d.getColumnWidth() - 2, 0);
        }
      });

    const rowCenter = (config.svgLayout.rowHeight / 2);

    var textRows = allRows.selectAll(".tableData.text")
      .data(function (d) {

        var data = allTextHeaders.map(function (column) {
          return {
            value: column.column.getValue(d),
            label: column.column.getRawValue(d),
            offsetX: column.offsetX,
            columnW: column.getColumnWidth(),
            isRank: (column instanceof LayoutRankColumn),
            clip: 'url(#clip-' + column.column.id + ')'
          };
        });
        return data;
      });

    textRows.exit().remove();


    textRows.enter()
      .append("text")
      .attr({
        'class': function (d) {
          return "tableData text" + (d.isRank ? ' rank' : '');
        },
        x: function (d) {
          return d.offsetX
        },
        y: rowCenter,
        'clip-path': function (d) {
          return d.clip;
        }
      })
      .text(function (d) {
        return d.label;
      });

    textRows
      .attr({
        x: function (d) {
//                console.log("u", d.offsetX);
          return d.offsetX
        }
      })

    allRows.selectAll(".tableData.text.rank").text(function (d) {
      return d.value;
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

  function updateSingleBars(headers, allRows, config) {
    // -- handle the Single columns  (!! use unflattened headers for filtering)
    var allSingleBarHeaders = headers.filter(function (d) {
      return (d.hasOwnProperty('column') && (d.column instanceof LineUpNumberColumn));
    });
    var barRows = allRows.selectAll(".tableData.bar")
      .data(function (d) {
        var data = allSingleBarHeaders.map(function (column) {
          return {key: column.getDataID(), value: column.getWidth(d),
            label: column.column.getRawValue(d),
            offsetX: column.offsetX};
        });
        return data;
      });

    barRows.exit().remove();

    barRows.enter()
      .append("rect")
      .attr({
        "class": "tableData bar",
        y: 2,
        height: config.svgLayout.rowHeight - 4
      });

    barRows
      .attr({
        x: function (d) {
          return d.offsetX
        },
        width: function (d) {
          return Math.max(+d.value - 2, 0)
        }
      }).style({
        fill: function (d) {
          return config.colorMapping.get(d.key)
        }
      });
  }

  function updateStackBars(headers, allRows, _stackTransition, config) {
    // -- RENDER the stacked columns (update, exit, enter)
    var allStackedHeaders = headers.filter(function (d) {
      return (d instanceof LayoutStackedColumn);
    });

    // -- render StackColumnGroups
    var stackRows = allRows.selectAll(".tableData.stacked")
      .data(function (d, i) {

        var data = allStackedHeaders.map(function (column) {
          return {key: column.getDataID(), childs: column.children, parent: column, row: d};
        });
        return data;
      });
    stackRows.exit().remove();
    stackRows.enter()
      .append("g")
      .attr({
        "class": "tableData stacked"
//            y:2,
//            height:20-4
      });

    stackRows
      .attr({
        "transform": function (d) {
          return "translate(" + d.parent.offsetX + "," + 0 + ")";
        }
      });


    // -- render all Bars in the Group
    var allStackOffset = 0;
    var allStackW = 0;
    var allStackRes = {};

    var allStack = stackRows.selectAll("rect").data(function (d) {

        allStackOffset = 0;
        allStackW = 0;

        return d.childs.map(function (child) {
          allStackW = child.getWidth(d.row)

          allStackRes = {child: child, width: allStackW, offsetX: allStackOffset}

          if (config.renderingOptions.stacked) {
            allStackOffset += allStackW;
          } else {
            allStackOffset += child.getColumnWidth();
          }

          return allStackRes

        })


      }
    );
    allStack.exit().remove();
    allStack.enter().append("rect").attr({
      y: 2,
      height: config.svgLayout.rowHeight - 4
    });

    (_stackTransition ? allStack.transition() : allStack)
      .attr({
        x: function (d) {
          return d.offsetX;
        },
        width: function (d) {
          return (d.width > 2) ? d.width - 2 : d.width
        }
      }).style({
        fill: function (d) {
          return config.colorMapping.get(d.child.getDataID())
        }
      });

  }

  function createActions($elem, item, config) {
    var $r = $elem.selectAll('text').data(config.svgLayout.rowActions);
    $r.enter().append('text').append('title');
    $r.exit().remove();
    $r.attr({
      x : function(d,i) {
        return i*config.svgLayout.rowHeight;
      }
    }).text(function(d) {
      return d.icon;
    }).on('click', function(d) {
      d.action.call(this, item, d);
    }).select('title').text(function(d) { return d.name;});
  }

  function updateActionBars(headers, allRows, config) {
    // -- handle the Single columns  (!! use unflattened headers for filtering)
    var allActionBarHeaders = headers.filter(function (d) {
      return (d instanceof LayoutActionColumn);
    });
    var actionRows = allRows.selectAll(".tableData.action")
      .data(function (d) {
        var data = allActionBarHeaders.map(function (column) {
          return {key: column.getDataID(), value: column.getColumnWidth(d),
            data: d,
            offsetX: column.offsetX};
        });
        return data;
      });
    actionRows.enter()
      .append("g")
      .attr('class',"tableData action")
      .each(function(item) {
        createActions(d3.select(this), item, config);
      });

    actionRows.exit().remove();

    actionRows
      .attr('transform',function (d) {
        return 'translate(' + (d.offsetX+10) + ','+(config.svgLayout.rowHeight*0.5+1)+')';
      });
  }

  LineUp.prototype.updateBody = function (headers, data, stackTransition, config) {
    var svg = this.$body;
    //console.log("bupdate");
    stackTransition = stackTransition || false;

    var allHeaders = [];
    headers.forEach(function (d) {
      d.flattenMe(allHeaders)
    });

    var datLength = data.length;
    var rowScale = d3.scale.ordinal()
      .domain(data.map(function (d, i) {
        return d[config.primaryKey]
      }))
      .rangeBands([0, (datLength * config.svgLayout.rowHeight)], 0, .2);
    svg.attr({
      height: datLength * config.svgLayout.rowHeight
    });


    // -- handle all row groups

    var allRowsSuper = svg.selectAll(".row").data(data, function (d) {
      return d[config.primaryKey]
    });
    allRowsSuper.exit().remove();

    // --- append ---
    var allRowsSuperEnter = allRowsSuper.enter().append("g").attr({
      "class": "row"
    })

    //    //--- update ---
    allRowsSuper.transition().duration(1000).attr({
      "transform": function (d, i) {
        return  "translate(" + 0 + "," + rowScale(d[config.primaryKey]) + ")"
      }
    });
allRowsSuperEnter.append("g").attr("class", "content");


    allRowsSuperEnter.append("g").attr("class", "overlay").append("rect").attr({
      x: 0, y: 0, height: config.svgLayout.rowHeight, width: '100%', opacity: .000001
    });

    allRowsSuper.select(".overlay").on({
      "mouseenter": function (row) {
        d3.select('rect').attr({
          opacity: .4,
          fill: "#ffffff"
        });

        var zeroFormat = d3.format(".1f");
//            d3.select(this.parent).classed("hovered", true)
        var textOverlays = [];
        headers.forEach(function (col) {
            if (col instanceof LayoutSingleColumn && col.column instanceof LineUpNumberColumn) {
              textOverlays.push({value: col.column.getValue(row), label: col.column.getRawValue(row),
                x: col.offsetX,
                needsWhiteBG: false,
                w: col.getColumnWidth()})
            } else if (col instanceof LayoutSingleColumn) {
              textOverlays.push({value: col.column.getValue(row), label: col.column.getRawValue(row),
                x: col.offsetX,
                needsWhiteBG: true,
                w: col.getColumnWidth()})
            } else if (col instanceof LayoutRankColumn) {
              textOverlays.push({value: col.column.getValue(row), label: col.column.getRawValue(row),
                x: col.offsetX,
                needsWhiteBG: true,
                w: col.getColumnWidth()})
            } else if (col instanceof LayoutActionColumn) {
              textOverlays.push({
                action: true,
                x : col.offsetX,
                needsWhiteBG : false,
                w: col.getColumnWidth()
              })
            } else if (col instanceof  LayoutStackedColumn) {


              var allStackOffset = 0;

              col.children.forEach(function (child) {
                var allStackW = child.getWidth(row);

                textOverlays.push({
                    label: child.column.getRawValue(row)
                      + " -> (" + zeroFormat(child.getWidth(row)) + ")",
                    needsWhiteBG: false,
                    w: allStackW,
                    x: (allStackOffset + col.offsetX)}
                );
                if (config.renderingOptions.stacked) {
                  allStackOffset += allStackW;
                } else {
                  allStackOffset += child.getColumnWidth();
                }
              })
            }
          }
        );

        /** TODO: CLIPPING ???? -- http://jsfiddle.net/dsummersl/EqLBJ/1/
         *   var clip = chart.append("defs").append("svg:clipPath")
         .attr("id", "clip")
         .append("svg:rect")
         .attr("id", "clip-rect")
         .attr("x", "0")
         .attr("y", "0")
         .attr("width", width)
         .attr("height", height);

         var chartBody = chart.append("g")
         .attr("clip-path", "url(#clip)")
         */


        d3.select(this).selectAll(".whiteRect")
          .data(textOverlays.filter(function (e) {
            return e.needsWhiteBG;
          })).enter()
          .append("rect").attr({
            class: "whiteRect",
            x: function (d) {
              return d.x;
            },
            y: 0,
            height: config.svgLayout.rowHeight,
            width: function (d) {
              return d.w;
            }
          }).style({
            fill: "#ffffff",
            opacity: 1,
            "pointer-events": "none"
          });

        d3.select(this).selectAll("text").data(textOverlays.filter(function (e) {
          return !e.action;
        })).enter().append("text").
          attr({
            class: "tableData",
            x: function (d) {
              return d.x + ((d.needsWhiteBG) ? +0 : +3);
            },
            y: config.svgLayout.rowHeight / 2
          }).style({
            fill: "black",
            "font-weight": "bold",
            "pointer-events": "none"
//                    "font-size":"7pt"
//                    "text-anchor":"end"
          }).text(function (d) {
            return d.label;
          })
        d3.select(this).selectAll("g").data(textOverlays.filter(function (e) {
          return e.action;
        })).enter().append("g").
          attr({
            'class': "tableData action",
            'transform' : function (d) {
              return 'translate(' + (d.x+10) + ','+(config.svgLayout.rowHeight*0.5+1)+')';
            }
          }).each(function(item) {
            createActions(d3.select(this), row, config);
          });

      },
      "mouseleave": function (d) {
        d3.select(this).selectAll("text,g").remove();
        d3.select(this).selectAll(".whiteRect").remove();
        d3.select('rect').attr({
          opacity: 0.000001
//                fill:white
        })
      }
    });
    allRowsSuper.selectAll(".overlay rect").attr({
      width: '100%'
    });
    var allRows = allRowsSuper.selectAll(".content");


    updateText(allHeaders, allRows, svg, config);
    updateSingleBars(headers, allRows, config);
    updateStackBars(headers, allRows, stackTransition, config);
    updateActionBars(headers, allRows, config);
  }
}());