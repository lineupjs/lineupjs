/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/17/14.
 */

(function () {
  /**
   * creates a simple popup window with a table
   * @param title
   * @param label optional if an input field is required
   * @returns {{popup: *, table: *, remove: remove, onOK: onOK}}
   */
  function createPopup(title, label, options) {
    options = $.extend({}, options, {
      x : +(window.innerWidth) / 2 - 100,
      y : 100,
      width: 400,
      height: 200
    });
    var popupBG = d3.select("body")
      .append("div").attr("class","lu-popupBG");

    var popup = d3.select("body").append("div")
      .attr({
        "class": "lu-popup"
      }).style({
        left: options.x + "px",
        top: options.y + "px",
        width: options.width+"px",
        height: options.height+"200px"
      })
      .html(
        '<span style="font-weight: bold">' + title + '</span>' +
        (label ? '<input type="text" id="popupInputText" size="35" value="' + label + '"><br>' : '') +
        '<div class="selectionTable"></div>' +
        '<button class="cancel"><i class="fa fa-times"></i> cancel</button>' +
        '<button class="ok"><i class="fa fa-check"></i> ok</button>'
    );

    var theTable = popup.select(".selectionTable").style({
      width: (options.width-10)+"px",
      height: (options.height-40)+"px"
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
    }
  }

  LineUp.prototype.addNewStackedColumnDialog = function () {
    var that = this;

    var popup = createPopup('add stacked column:', 'Stacked');
    // list all data rows !
    var trData = that.storage.getRawColumns().filter(function (d) {
      return (d instanceof LineUpNumberColumn);
    }).map(function (d) {
      return {d: d, isChecked: false, weight: 1.0};
    });

    var trs = popup.table.selectAll("tr").data(trData);
    trs.enter().append("tr");
    trs.append("td").attr("class", "checkmark");
    trs.append("td").attr("class", "datalabel").style("opacity", .8).text(function (d) {
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
        return (d.isChecked) ? '<i class="fa fa-check-square-o"></i>' : '<i class="fa fa-square-o"></i>'
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
      })
    }

    redraw();


    popup.onOK(function () {
      var name = document.getElementById("popupInputText").value;
      if (name.length < 1) {
        window.alert("name must not be empty");
        return;
      }
      console.log(name, trData);

      var allChecked = trData.filter(function (d) {
        return d.isChecked;
      });

      console.log(allChecked);
      var desc = {
        label: name,
        width: (Math.max(allChecked.length * 100, 100)),
        children: allChecked.map(function (d) {
          return {column: d.d.id, weight: d.weight};
        })
      };

      that.storage.addStackedColumn(desc);
      popup.remove();
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
    trs.append("td").attr("class", "datalabel").style("opacity", .8).text(function (d) {
      return d.d.label;
    });


    function redraw() {
      var trs = popup.table.selectAll("tr").data(trData);
      trs.select(".checkmark").html(function (d) {
        return '<i class="fa fa-'+((d.isChecked) ? 'check-':'')+'square-o"></i>'
      })
        .on("click", function (d) {
          d.isChecked = !d.isChecked;
          redraw();
        });
      trs.select(".datalabel").style("opacity", function (d) {
        return d.isChecked ? "1.0" : ".8";
      })
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
        that.storage.addSingleColumn({column: d.d.id})
      });

      popup.remove();
      that.updateAll();
    });
  };

  LineUp.prototype.reweightStackedColumnWidget = function(data, $table) {
    var toWeight = function(d) {
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
        return config.colorMapping.get(d.dataID)
      }
    });

    trs.append("td").attr("class", "datalabel").text(function (d) {
      return d.d;
    });

    function redraw() {
      var trs = $table.selectAll("tr").data(data);
      predictScale.domain([0, d3.max(data,toWeight)]);
      trs.select(".predictBar").transition().style({
        width: function (d) {
          return predictScale(d.weight) + "px";
        }
      })
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
      that.changeWeights(col, trData.map(function(d) {
        return d.weight;
      }));
    });
  };

  LineUp.prototype.openMappingEditor = function(selectedColumn, $button) {
    var col = selectedColumn.column;
    var bak = col.scale;
    var that = this;
    var act = bak;
    var callback = function(newscale) {
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
        '<div class="mappingArea"></div>'+
        '<button class="cancel"><i class="fa fa-times"></i> cancel</button>' +
        '<button class="reset"><i class="fa fa-undo"></i> revert</button>' +
        '<button class="ok"><i class="fa fa-check"></i> ok</button>'
    );
    var access = function(row) {
      return +col.getRawValue(row);
    };
    var editor = LineUp.mappingEditor(bak, col.scaleOri.domain(),this.storage.data, access, callback);
    popup.select('.mappingArea').call(editor);

    function isSame (a, b) {
      return $(a).not(b).length == 0 && $(b).not(a).length == 0;
    }
    popup.select(".ok").on("click", function () {
      col.scale = act;
      console.log(act.domain().toString(),act.range().toString());
      $button.classed('filtered', !isSame(act.range(),col.scaleOri.range()) || !isSame(act.domain(), col.scaleOri.domain()));
      that.storage.resortData({});
      that.updateAll(true);
      popup.remove()
    });
    popup.select(".cancel").on("click", function () {
      col.scale = bak;
      $button.classed('filtered', !isSame(bak.range(),col.scaleOri.range()) || !isSame(bak.domain(), col.scaleOri.domain()));
      popup.remove()
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
    console.log(selectedColumn);
    var config = this.config;
    var svgOverlay = this.$header.select(".overlay");
    var that = this;
    // remove when clicked on already selected item
    var disappear = (this.stackedColumnModified == selectedColumn);
    if (disappear) {
      svgOverlay.selectAll(".stackedOption").remove();
      this.stackedColumnModified = null;
      return;
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


    function removeStackedColumn(col) {
      that.storage.removeColumn(col);
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

      popup.select(".ok").on("click", renameIt);

      popup.select(".cancel").on("click", function () {
        popup.remove()
      });


      function renameIt() {
        var newValue = document.getElementById("popupInputText").value;
        if (newValue.length > 0) {
          that.storage.setColumnLabel(col, newValue);
          that.updateHeader(that.storage.getColumnLayout());
          popup.remove();
        } else {
          window.alert("non empty string required");
        }
      }
    }
  };

  LineUp.prototype.openFilterPopup = function(column, $button) {
    if (!(column instanceof LayoutSingleColumn && column.column instanceof LineUpStringColumn)) {
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

  LineUp.createTooltip = function() {
    var $tooltip = $('<div class="lu-tooltip"/>').appendTo("body");
    function showTooltip(content, xy) {
      $tooltip.html(content).css({
        left: xy.x + "px",
        top: (xy.y + xy.height) + "px"
      }).fadeIn();

      var stickout = ($(window).height() + $(window).scrollTop()) <= ((xy.y + xy.height) + $tooltip.height() - 20);
      var stickouttop = $(window).scrollTop() > (xy.y - $tooltip.height());
      if (stickout && !stickouttop) { //if the bottom is not visible move it on top of the box
        $tooltip.css('top', (xy.y - $tooltip.height())+"px");
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
    }
  };

  /**
   * setter for a scroll container, which is used for determining visibility
   */
  Object.defineProperty(LineUp.prototype,'scrollContainer',{
    enumerable: true,
    set : function($container) {
      $container = $($container);
      var that = this,
          container = $container[0],
          rowHeight = this.config.svgLayout.rowHeight,
          prevScrollTop = container.scrollTop,
          jbody = $(this.$body.node()),
          backupRows = this.config.svgLayout.backupScrollRows,
          shift;
      function l(event) {
        var act = container.scrollTop;
        //at least one row changed
        if (Math.abs(prevScrollTop - act) >= rowHeight*backupRows) {
          prevScrollTop = act;
          that.updateBody();
        }
      }
      $container.on('scroll',l);
      //the shift between the scroll container our svg body
      shift = jbody.offset().top - $container.offset().top;
      //use a resize sensor of a utility lib to also detect resize changes
      //new ResizeSensor($container, function() {
      //  console.log(container.scrollHeight, container.scrollTop, $container.innerHeight(), $container.height(), "resized");
      //  that.updateBody();
      //});
      this.selectVisible = function(data, rowScale) {
        var top = container.scrollTop-shift,
            bottom = top + $container.innerHeight(),
            height = jbody[0].scrollHeight,
            i = 0, j = data.length;
        if (top > 0) {
          i = Math.round(top / rowHeight);
          //count up till really even partial rows are visible
          while(i >= 0 && rowScale(data[i+1]) > top) {
            i--;
          }
          i-=backupRows; //one more row as backup for scrolling
        }
        if (height > bottom) { //some parts from the bottom aren't visible
          j = Math.round(bottom / rowHeight);
          //count down till really even partial rows are visible
          while(j <= data.length && rowScale(data[j-1]) < bottom) {
            j++;
          }
          j+=backupRows; //one more row as backup for scrolling
        }
        return [Math.max(i,0),Math.min(j,data.length)];
      };
      this._scrollContainer = {
        destroy: function() {
          $container.off('scroll', l);
        },
        container: $container
      };
    },
    get : function() {
      return this._scrollContainer || {
        destroy: function() {

        }
      }
    }
  });
  LineUp.prototype.selectVisible = function(data, rowScale) {
    //by default select all
    return [0, data.length];
  }
}());