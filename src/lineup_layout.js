/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
LineUp.prototype.layoutHeaders = function (headers, config) {
  var offset = 0;

  headers.forEach(function (d) {
//        console.log(d);
    d.offsetX = offset;
    d.offsetY = 2;
    d.height = config.htmlLayout.headerHeight - 4;
    offset += d.getColumnWidth();

//        console.log(d.getColumnWidth());
  })

  //console.log("layout Headers:", headers);

  var addSign = {};
  if (config.svgLayout.plusSigns.hasOwnProperty("addStackedColumn")) {
    addSign = config.svgLayout.plusSigns["addStackedColumn"];
    addSign.x = offset + 4;
  }
//    else{
//        addSign = {
//            title: "add stacked column",
//            action:function(){that.addNewStackedColumnDialog(that)},
//            x:offset+4, y:2,
//            w:LineUpGlobal.htmlLayout.headerHeight/2-4,h:LineUpGlobal.htmlLayout.headerHeight/2-4
//        }
//        LineUpGlobal.svgLayout.plusSigns["addStackedColumn"] = addSign;
//    }


//    console.log( LineUpGlobal.svgLayout.plusSigns["addStackedColumn"]);


  headers.filter(function (d) {
    return (d instanceof LayoutStackedColumn);
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


};

LineUp.prototype.assignColors = function (headers) {
  //Color schemes are in LineUpGlobal (.columnColors / .grayColor)


  // clear map
  LineUpGlobal.colorMapping = d3.map();

  var colCounter = 0;

  headers.forEach(function (d) {
    // gray columns are:
    if ((d instanceof LineUpStringColumn)
//            || (d instanceof LineUpStackedColumn)
      || (d.id == "rank")) {
      LineUpGlobal.colorMapping.set(d.id, LineUpGlobal.grayColor);

    } else {
//            console.log(LineUpGlobal.columnColors(colCounter), colCounter, d);
      LineUpGlobal.colorMapping.set(d.id, LineUpGlobal.columnColors(colCounter));


      colCounter++;
    }


  });

  //console.log(LineUpGlobal.colorMapping);
};