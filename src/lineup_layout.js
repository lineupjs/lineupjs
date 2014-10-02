/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
var LineUp;
(function (LineUp, d3, $, undefined) {
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
        })

      })

    this.totalWidth = shift;

  };

  LineUp.prototype.assignColors = function (headers) {
    //Color schemes are in config (.columnColors / .grayColor)


    // clear map
    var config = this.config;
    config.colorMapping = d3.map();

    var colCounter = 0;

    headers.forEach(function (d) {
      // gray columns are:
      if ((d instanceof LineUp.LineUpStringColumn)
//            || (d instanceof LineUpStackedColumn)
        || (d.id == "rank")) {
        config.colorMapping.set(d.id, config.grayColor);

      } else {
//            console.log(config.columnColors(colCounter), colCounter, d);
        config.colorMapping.set(d.id, config.columnColors(colCounter));


        colCounter++;
      }


    });

    //console.log(config.colorMapping);
  };
}(LineUp || (LineUp = {}), d3, jQuery));