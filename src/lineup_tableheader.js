/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
/**
 * Render the given headers
 * @param headers - the array of headers, see {@link LineUpColumn}
 */
LineUp.prototype.updateHeader = function(headers){
//    console.log("update Header");
    var svg = d3.select("#lugui-table-header-svg");
    var that = this;

    if (LineUpGlobal.headerUpdateRequired) this.layoutHeaders(headers)

    var allHeaderData = [];
    headers.forEach(function(d){
        d.flattenMe(allHeaderData);
    })

    //console.log(allHeaderData);


    // -- Handle the header groups (exit,enter, update)

    var allHeaders = svg.selectAll(".header").data(allHeaderData);
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
            // TODO: adapt to comparison mode !!
            console.log(d.columnBundle);
            if (LineUpGlobal.columnBundles[d.columnBundle].sortedColumn!=null && (d.getDataID() ==   LineUpGlobal.columnBundles[d.columnBundle].sortedColumn))
            {

                LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc = LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc?false:true;
            }else{
                LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc = false;
            }

//TODO
//            that.storage.resortData({columnID: d.header.column, asc:LineUpGlobal.sortingOrderAsc});
//            that.updateBody(that.storage.getColumnHeaders(), that.storage.getData());
            LineUpGlobal.columnBundles[d.columnBundle].sortedColumn= d.getDataID();
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
        width:5,
        height:function(d){return d.height}
    })

    allHeaders.select(".weightHandle").attr({
        x:function(d){
            return (d.getColumnWidth()-5)
        }
    }).call(this.dragWeight) // TODO: adopt dragWeight function !


    // -- handle Text
    allHeadersEnter.append("text").attr({
        "class":"headerLabel",
        y: function (d) {
            return d.height/2
        },
        x:12
    }).text(function (d) {
        if (d instanceof LayoutStackedColumn) return d.label
        else return d.column.label;
    })

    allHeaders.select(".headerLabel")
        .classed("sortedColumn",function(d){
            return d.getDataID() == LineUpGlobal.columnBundles[d.columnBundle].sortedColumn
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
        return ((d.getDataID() == LineUpGlobal.columnBundles[d.columnBundle].sortedColumn)?
            ((LineUpGlobal.columnBundles[d.columnBundle].sortingOrderAsc)?'\uf0de':'\uf0dd')
            :"");})


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