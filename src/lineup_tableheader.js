/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
/**
 * Render the given headers
 * @param headers - the array of headers, see {@link LineUpColumn}
 */
LineUp.prototype.updateHeader = function(headers){
//    console.log("update Header");

    d3.select("#lugui-table-header-svg").selectAll(".main").data([1]).enter().append("g").attr("class","main");
    d3.select("#lugui-table-header-svg").selectAll(".overlay").data([1]).enter().append("g").attr("class","overlay");


    var svg = d3.select("#lugui-table-header-svg .main");
    var svgOverlay = d3.select("#lugui-table-header-svg .overlay");
    var that = this;

    if (LineUpGlobal.headerUpdateRequired) this.layoutHeaders(headers)

    var allHeaderData = [];
    headers.forEach(function(d){
        d.flattenMe(allHeaderData);
    })

    //console.log(allHeaderData);


    // -- Handle the header groups (exit,enter, update)

    var allHeaders = svg.selectAll(".header").data(allHeaderData, function(d){return d.id;});
    allHeaders.exit().remove();

    // --- adding Element to class allHeaders
    var allHeadersEnter = allHeaders.enter().append("g").attr({
        "class":"header"
    })

    // --- changing nodes for allHeaders
    allHeaders.attr({
        "transform":function(d){return "translate("+ d.offsetX+","+ d.offsetY+")";}
    })



    // -- handle BackgroundRectangles

    allHeadersEnter.append("rect").attr({
        "class":"labelBG",
        y:0,
        width:function(d){return d.getColumnWidth()},
        height:function(d){return d.height;}
    }).style({
        "fill":function(d,i){
            if (d instanceof LayoutStackedColumn || !LineUpGlobal.colorMapping.has(d.column.id)){
                return LineUpGlobal.grayColor;
            }else{
                return LineUpGlobal.colorMapping.get(d.column.id);
            }

        }
    }).on({
        "click":function(d){

            // no sorting for empty stacked columns !!!
            if (d instanceof LayoutStackedColumn && d.children.length<1) return;

            // TODO: adapt to comparison mode !!
            if (LineUpGlobal.columnBundles[d.columnBundle].sortedColumn!=null && (d.getDataID() ==   LineUpGlobal.columnBundles[d.columnBundle].sortedColumn.getDataID()))
            {

                LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc = LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc?false:true;
            }else{
                LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc = false;
            }

            that.storage.resortData({column: d, asc:LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc});
            that.updateBody(that.storage.getColumnLayout(), that.storage.getData())
            LineUpGlobal.columnBundles[d.columnBundle].sortedColumn= d;
            that.updateHeader(that.storage.getColumnLayout());
        }
    });

    allHeaders.select(".labelBG").attr({
        width:function(d){return d.getColumnWidth()-5},
        height: function(d){ return d.height}
    });


    // -- handle WeightHandle

    allHeadersEnter.append("rect").attr({
        "class":"weightHandle",
        x:function(d){return d.getColumnWidth()-5},
        y:0,
        width:5
    })

    allHeaders.select(".weightHandle").attr({
        x:function(d){
            return (d.getColumnWidth()-5)
        },
        height:function(d){return d.height}
    }).call(this.dragWeight) // TODO: adopt dragWeight function !


    // -- handle Text
    allHeadersEnter.append("text").attr({
        "class":"headerLabel",
        x:12
    })

    allHeaders.select(".headerLabel")
        .classed("sortedColumn",function(d){
            var sc = LineUpGlobal.columnBundles[d.columnBundle].sortedColumn
            if (sc){
                return d.getDataID() == sc.getDataID()
            }else{
                return false;
            }
        })
        .attr({
            y: function (d) {
                if (d instanceof LayoutStackedColumn || d.parent!=null) return d.height/2;
                else return d.height*3/4;
            }
        }).text(function (d) {
            if (d instanceof LayoutStackedColumn) return d.label
            else return d.column.label;
        })



    // -- handle the Sort Indicator
    allHeadersEnter.append("text").attr({
        'class':'headerSort',
        y: function (d) {
           return d.height/2
        },
        x:2
    }).style({
        'font-family':'FontAwesome',
        'font-size':'10pt',
        'fill':'white'
    })



    allHeaders.select(".headerSort").text(function(d){
        var sc = LineUpGlobal.columnBundles[d.columnBundle].sortedColumn
        return ((sc && d.getDataID() == LineUpGlobal.columnBundles[d.columnBundle].sortedColumn.getDataID())?
            ((LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc)?'\uf0de':'\uf0dd')
            :"");})
        .attr({
            y: function (d) {
                return d.height/2
            }
        })





    // add info Button to All Stacked Columns
    allHeadersEnter.filter(function(d){return d instanceof LayoutStackedColumn;}).append("text").attr({
        class:"stackedColumnInfo fontawe"
    })
        .text("\uf1de")
        .on("click", function(d){
            that.stackedColumnOptionsGui(d)
        })



    allHeaders.filter(function(d){return d instanceof LayoutStackedColumn;}).select(".stackedColumnInfo").attr({
        x:function(d){return d.getColumnWidth()-15},
        y:function(d){return d.height/2}
    })


    // add delete Button to All Single Columns
    allHeadersEnter.filter(function(d){return (!(d instanceof LayoutStackedColumn) && d.parent==null)}).append("text").attr({
        class:"singleColumnDelete fontawe"
    })
        .text("\uf014")
        .on("click", function(d){
            that.storage.removeSingleColumn(d);
            that.updateAll();
        })
    allHeaders.filter(function(d){return (!(d instanceof LayoutStackedColumn) && d.parent==null);}).select(".singleColumnDelete").attr({
        x:function(d){return d.getColumnWidth()-15},
        y:function(d){return d.height/4}
    })






    // ==================
    // -- Render add ons
    //===================


    // add column sign:
    var plusButton = [];
    if (LineUpGlobal.svgLayout.plusSigns.hasOwnProperty("addStackedColumn"))
        plusButton.push(LineUpGlobal.svgLayout.plusSigns["addStackedColumn"])

    var addColumnButton = svg.selectAll(".addColumnButton").data(plusButton);
    addColumnButton.exit().remove();


    var addColumnButtonEnter = addColumnButton.enter().append("g").attr({
        class:"addColumnButton"
    })

    addColumnButton.attr({
        "transform":function(d) {return "translate("+ d.x+","+ d.y+")";}
    })

    addColumnButtonEnter.append("rect").attr({
        x:0,
        y:0,
        rx:5,
        ry:5,
        width:function(d){return d.w;},
        height:function(d){return d.h;}
    }).on("click", function(d){d.action();})

    addColumnButtonEnter.append("text").attr({
        x:function(d){return d.w/2;},
        y:function(d){return d.h/2;}
    }).text('\uf067')










    // ===============
    // Helperfunctions
    // ===============










};

/**
 * called when a Header width changed, calls {@link updateHeader}
 * @param change - the change information
 * @param change.column - the changed column, see {@link LineUpColumn}
 * @param change.value - the new column width
 */
LineUp.prototype.reweightHeader= function(change){

//    console.log(change);
    change.column.setColumnWidth(change.value);
    this.updateHeader(this.storage.getColumnLayout());


};


