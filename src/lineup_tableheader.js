/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
/* global d3, jQuery */
var LineUp;
(function (LineUp, d3) {
  LineUp.prototype = LineUp.prototype || {};

  LineUp.prototype.layoutHeaders = function (headers) {
    var offset = 0;
    var config = this.config,
        headerHeight = config.htmlLayout.headerHeight,
        headerOffset = config.htmlLayout.headerOffset;

    headers.filter(function (d) {
      return (d instanceof LineUp.LayoutStackedColumn);
    })
      .forEach(function (d) {

        d.height = headerHeight / 2 - headerOffset*2;

        var localOffset = 0;
        var parentOffset = d.offsetX;
        var allChilds = d.children.concat(d.emptyColumns);
        allChilds.map(function (child) {
          child.offsetX = parentOffset + localOffset;
          child.localOffsetX = localOffset;
          localOffset += child.getColumnWidth();

          child.offsetY = headerHeight / 2 + headerOffset;
          child.height = headerHeight / 2 - headerOffset*2;
        });
      });
    this.totalWidth = shift;
  };

  /**
   * Render the given headers
   * @param headers - the array of headers, see {@link LineUpColumn}
   */
  LineUp.prototype.updateHeader = function (headers) {
    if (Array.isArray(headers) && headers.length === 0) {
      return;
    }
    headers = headers || this.storage.getColumnLayout();
//    console.log('update Header');
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

    var allHeaders = svg.selectAll('.header').data(allHeaderData, function (d) {
      return d.id;
    });
    allHeaders.exit().remove();

    // --- adding Element to class allHeaders
    var allHeadersEnter = allHeaders.enter().append('g').attr('class', 'header')
      .classed('emptyHeader', function (d) {
        return d instanceof LineUp.LayoutEmptyColumn || d instanceof LineUp.LayoutActionColumn;
      })
      .classed('nestedHeader', function (d) {
          return d && d.parent instanceof LineUp.LayoutStackedColumn;
      })
      .call(function () {
        that.addResortDragging(this, config);
      });

    // --- changing nodes for allHeaders
    allHeaders.attr('transform', function (d) {
      return 'translate(' + d.offsetX + ',' + d.offsetY + ')';
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

    // add info Button to All Stacked Columns
    if (this.config.manipulative) {
      var buttons = [
        {
          'class': 'stackedColumnInfo',
          text: '\uf1de',
          filter: function (d) {
            return d instanceof LineUp.LayoutStackedColumn ? [d] : [];
          },
          action: function (d) {
            that.stackedColumnOptionsGui(d);
          }
        },
        {
          'class': 'singleColumnDelete',
          text: '\uf014',
          filter: function (d) {
            return (d instanceof LineUp.LayoutStackedColumn || d instanceof LineUp.LayoutEmptyColumn || d instanceof LineUp.LayoutActionColumn) ? [] : [d];
          },
          action: function (d) {
            that.storage.removeColumn(d);
            that.headerUpdateRequired = true;
            that.updateAll();
          }
        },
        {
          'class': 'singleColumnFilter',
          text: '\uf0b0',
          filter: function (d) {
            return (d.column) ? [d] : [];
          },
          offset: config.htmlLayout.buttonWidth,
          action: function (d) {
            if (d instanceof LineUp.LayoutStringColumn) {
              that.openFilterPopup(d, d3.select(this));
            } else if (d instanceof LineUp.LayoutCategoricalColumn) {
              that.openCategoricalFilterPopup(d, d3.select(this));
            } else if (d instanceof LineUp.LayoutNumberColumn) {
              that.openMappingEditor(d, d3.select(this));
            }
          }
        }
      ];

      buttons.forEach(function (button) {
        var $button = allHeaders.selectAll('.' + button.class).data(button.filter);
        $button.exit().remove();
        $button.enter().append('text')
          .attr('class', 'fontawe ' + button.class)
          .text(button.text)
          .on('click', button.action);
        $button.attr({
          x: function (d) {
            return d.getColumnWidth() - config.htmlLayout.buttonRightPadding - (button.offset || 0);
          },
          y: config.htmlLayout.buttonTopPadding
        });
      });
    }

    // ==================
    // -- Render add ons
    //===================


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

      d3.select(this).classed('dragObject', true);

      hitted = null;
      moved = false;
    }

    function dragmove(d) {
      if (d instanceof LineUp.LayoutEmptyColumn) {
        return;
      }

      moved = true;
      var dragHeader = svgOverlay.selectAll('.dragHeader').data([d]);
      var dragHeaderEnter = dragHeader.enter().append('g').attr({
        class: 'dragHeader'
      });

      dragHeaderEnter.append('rect').attr({
        class: 'labelBG',
        width: function (d) {
          return d.getColumnWidth();
        },
        height: function (d) {
          return d.height;
        }
      });

      var x = d3.event.x;
      var y = d3.event.y;
      dragHeader.attr('transform', function () {
        return 'translate(' + (d3.event.x + 3) + ',' + (d3.event.y - 10) + ')';
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
              return {column: header, insert: 'l', tickX: (header.offsetX), tickY: (header.offsetY), tickH: header.height};
            } else {
              return {column: header, insert: 'r', tickX: (header.offsetX + header.getColumnWidth()), tickY: (header.offsetY), tickH: header.height};
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

      var columnTick = svgOverlay.selectAll('.columnTick').data(hitted ? [hitted] : []);
      columnTick.exit().remove();
      columnTick.enter().append('rect').attr({
        class: 'columnTick',
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

      d3.select(this).classed('dragObject', false);
      svgOverlay.selectAll('.dragHeader').remove();
      svgOverlay.selectAll('.columnTick').remove();

      if (hitted && hitted.column === this.__data__) {
        return;
      }

      if (hitted) {
//            console.log('EVENT: ', d3.event);
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


    x.on('dragstart', dragstart)
      .on('drag', dragmove)
      .on('dragend', dragend);
  };
}(LineUp || (LineUp = {}), d3));
