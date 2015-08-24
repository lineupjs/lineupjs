/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/17/14.
 */
/* global d3, jQuery, window, document */
var LineUp;
(function (LineUp, d3, $, undefined) {
  LineUp.prototype = LineUp.prototype || {};
  /**
   * creates a simple popup window with a table
   * @param title
   * @param label optional if an input field is
   * @param options optional options like the dimension of the popup
   * @returns {{popup: *, table: *, remove: remove, onOK: onOK}}
   */
  function createPopup(title, label, options) {
    options = $.extend({}, options, {
      x: +(window.innerWidth) / 2 - 100,
      y: 100,
      width: 400,
      height: 200
    });
    var popupBG = d3.select("body")
      .append("div").attr("class", "lu-popupBG");

    var popup = d3.select("body").append("div")
      .attr({
        "class": "lu-popup"
      }).style({
        left: options.x + "px",
        top: options.y + "px",
        width: options.width + "px",
        height: options.height + "px"
      })
      .html(
        '<span style="font-weight: bold">' + title + '</span>' +
        (label ? '<input type="text" id="popupInputText" size="35" value="' + label + '"><br>' : '') +
        '<div class="selectionTable"></div>' +
        '<button class="cancel"><i class="fa fa-times"></i> cancel</button>' +
        '<button class="ok"><i class="fa fa-check"></i> ok</button>'
    );

    var theTable = popup.select(".selectionTable").style({
      width: (options.width - 10) + "px",
      height: (options.height - 40) + "px"
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
    };
  }

  LineUp.prototype.addNewStackedColumnDialog = function () {
    var that = this;

    var popup = createPopup('add stacked column:', 'Stacked');
    // list all data rows !
    var trData = that.storage.getRawColumns().filter(function (d) {
      return (d instanceof LineUp.LineUpNumberColumn);
    }).map(function (d) {
      return {d: d, isChecked: false, weight: 1.0};
    });

    var trs = popup.table.selectAll("tr").data(trData);
    trs.enter().append("tr");
    trs.append("td").attr("class", "checkmark");
    trs.append("td").attr("class", "datalabel").style("opacity", 0.8).text(function (d) {
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
        return (d.isChecked) ? '<i class="fa fa-check-square-o"></i>' : '<i class="fa fa-square-o"></i>';
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
      });
    }

    redraw();


    popup.onOK(function () {
      var name = document.getElementById("popupInputText").value;
      if (name.length < 1) {
        window.alert("name must not be empty");
        return;
      }
      //console.log(name, trData);

      var allChecked = trData.filter(function (d) {
        return d.isChecked;
      });

      //console.log(allChecked);
      var desc = {
        label: name,
        width: (Math.max(allChecked.length * 100, 100)),
        children: allChecked.map(function (d) {
          return {column: d.d.column, type: 'number', weight: d.weight};
        })
      };

      that.storage.addStackedColumn(desc);
      popup.remove();
      that.headerUpdateRequired = true;
      that.updateAll();
    });

  };


  LineUp.createTooltip = function (container) {
    var $container = $(container), $tooltip = $('<div class="lu-tooltip"/>').appendTo($container);

    function showTooltip(content, xy) {
      $tooltip.html(content).css({
        left: xy.x + 'px',
        top: (xy.y + xy.height - $container.offset().top) + 'px'
      }).fadeIn();

      var stickout = ($(window).height() + $(window).scrollTop()) <= ((xy.y + xy.height) + $tooltip.height() - 20);
      var stickouttop = $(window).scrollTop() > (xy.y - $tooltip.height());
      if (stickout && !stickouttop) { //if the bottom is not visible move it on top of the box
        $tooltip.css('top', (xy.y - $tooltip.height() - $container.offset().top) + 'px');
      }
    }

    function hideTooltip() {
      $tooltip.stop(true).hide();
    }

    function moveTooltip(xy) {
      if (xy.x) {
        $tooltip.css({
          left: xy.x + 'px'
        });
      }
      if (xy.y) {
        $tooltip.css({
          top: xy.y  - $container.offset().top + 'px'
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
    };
  };
}(LineUp || (LineUp = {}), d3, jQuery));
