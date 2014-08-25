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
  function createPopup(title, label) {
    var x = +(window.innerWidth) / 2 - 100;
    var y = +100;

    var popupBG = d3.select("body")
      .append("div").attr({
        "class": "popupBG"
      }).style({
        position: "fixed",
        left: 0 + "px",
        top: 0 + "px",
        width: window.innerWidth + "px",
        height: window.innerHeight + "px",
        background: "white",
        opacity: ".3"
      });

    var popup = d3.select("body").append("div")
      .attr({
        "class": "popup"
      }).style({
        position: "fixed",
        left: x + "px",
        top: y + "px",
        width: "400px",
        height: "200px"

      })
      .html(
        '<span style="font-weight: bold">' + title + '</span>' +
        (label ? '<input type="text" id="popupInputText"  size="35" value="' + label + '"><br>' : '') +
        '<div class="selectionTable"></div>' +
        '<button class="cancel"><i class="fa fa-times"></i> cancel</button>' +
        '<button class="ok"><i class="fa fa-check"></i> ok</button>'
    );

    var theTable = popup.select(".selectionTable").style({
      width: "390px",
      height: "160px",
      background: "white",
      "overflow-x": "auto",
      "overflow-y": "scroll"
    }).append("table").style({
      width: "95%",
      border: 0
    });

    popup.select(".cancel").on("click", function () {
      popupBG.remove();
      popup.remove();
    });

    popup.select(".ok").style({
      position: "absolute",
      right: 10 + "px"
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
    var popup = createPopup('add single columns');
    // list all data rows !
    var trData = that.storage.getRawColumns()
//        .filter(function(d){return (d instanceof LineUpNumberColumn);})
      .map(function (d) {
        return {d: d, isChecked: false, weight: 1.0};
      });

    var trs = popup.table.selectAll("tr").data(trData)
    trs.enter().append("tr");
    trs.append("td").attr("class", "checkmark");
    trs.append("td").attr("class", "datalabel").style("opacity", .8).text(function (d) {
      return d.d.label;
    });


    function redraw() {
      var trs = popup.table.selectAll("tr").data(trData)
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
        return LineUpGlobal.colorMapping.get(d.dataID)
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
      col.updateWeights(trData.map(function(d) {
        return d.weight;
      }));
      that.storage.resortData({});

      popup.remove();
      that.updateAll();
    });
  };

  /**
   * handles the rendering and action of StackedColumn options menu
   * @param selectedColumn -- the stacked column
   */
  LineUp.prototype.stackedColumnOptionsGui = function (selectedColumn) {
    console.log(selectedColumn);
    var svgOverlay = d3.select(LineUpGlobal.htmlLayout.headerID).select(".overlay");
    var that = this;
    // remove when clicked on already selected item
    var disappear = (LineUpGlobal.modes.stackedColumnModified == selectedColumn);
    if (disappear) {
      svgOverlay.selectAll(".stackedOption").remove();
      LineUpGlobal.modes.stackedColumnModified = null;
      return;
    }


    // else:
    LineUpGlobal.modes.stackedColumnModified = selectedColumn;
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
          return "translate(" + (d.d.offsetX + d.d.columnWidth - menuLength) + "," + (LineUpGlobal.htmlLayout.headerHeight / 2 - 2) + ")";
        }
      });
    stackedOptionsEnter.append("rect").attr({
      x: 0,
      y: 0,
      width: menuLength,
      height: LineUpGlobal.htmlLayout.headerHeight / 2 - 4
    });
    stackedOptionsEnter.selectAll("text").data(function (d) {
      return d.o;
    }).enter().append("text")
      .attr({
        x: function (d, i) {
          return i * 100 + 5;
        },
        y: LineUpGlobal.htmlLayout.headerHeight / 4 - 2
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
        return "translate(" + (d.d.offsetX + d.d.columnWidth - menuLength) + "," + (LineUpGlobal.htmlLayout.headerHeight / 2 - 2) + ")";
      }
    });


    function removeStackedColumn(col) {
      that.storage.removeColumn(col);
      that.updateAll();

    };

    function renameStackedColumn(col) {
      var x = +(window.innerWidth) / 2 - 100;
      var y = +100;

      var popup = d3.select("body").append("div")
        .attr({
          "class": "popup"
        }).style({
          position: "fixed",
          left: x + "px",
          top: y + "px",
          width: "200px",
          height: "70px"

        })
        .html(
          '<div style="font-weight: bold"> rename column: </div>' +
          '<input type="text" id="popupInputText"  size="35" value="' + col.label + '"><br>' +
          '<button class="cancel"><i class="fa fa-times"></i> cancel</button>' +
          '<button class="ok"><i class="fa fa-check"></i> ok</button>'
      );

      popup.select(".ok").style({
        position: "absolute",
        right: 10 + "px"
      }).on("click", renameIt)

      popup.select(".cancel").on("click", function () {
        popup.remove()
      });


      function renameIt() {
        var newValue = document.getElementById("popupInputText").value;
        if (newValue.length > 0) {
          that.storage.setColumnLabel(col, newValue);
          that.updateHeader(that.storage.getColumnLayout(), LineUpGlobal);
          popup.remove();
        } else {
          window.alert("non empty string required");
        }
      }
    }
  }
}());