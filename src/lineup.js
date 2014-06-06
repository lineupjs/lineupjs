/**
 * Global LineUp Variables
 * @property {d3.scale} columncolors - color scale for columns
 */
var LineUpGlobal = {
    columnColors: d3.scale.category10(),
    htmlLayout: {
        menuheight: 25,
        menuExpandheight: 50,
        headerheight: 50,
        windowOffsetX: 5,
        windowOffsetY: 5,
        headerOffsetY: function(){return (this.menuheight + this.windowOffsetY + 3) },
        bodyOffsetY: function(){return (this.menuheight + this.windowOffsetY + this.headerheight +3) }

    }

};

/**
 * Constructor to Create a LineUp Visualization
 * @param spec - the specifications object
 * @param spec.storage - a LineUp Storage, see {@link LineUpLocalStorage}
 * @constructor
 */
var LineUp = function(spec){
    this.storage = spec.storage;
    this.sortedColumn = [];

};

/**
 * the function to start the LineUp visualization
 */
LineUp.prototype.startVis = function(){

    this.updateHeader(this.storage.getColumnHeaders())
    this.updateBody(this.storage.getColumnHeaders(), this.storage.getData())
}

/**
 * Render the given headers
 * @param headers - the array of headers, see {@link LineUpColumn}
 */
LineUp.prototype.updateHeader = function(headers){
    console.log("update Header");
    var svg = d3.select("#lugui-table-header-svg");
    var that = this;
    var offset = 0;
    var headersEnriched = headers.map(function(d){
        var hObject = {offset:offset,header:d};
        offset+= d.width+2;
        return hObject;
    })

    var dragWeight= d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", dragstarted)
        .on("drag", dragged)
        .on("dragend", dragended);

    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);
    }


    function dragged(d) {
        var newValue = Math.max(d3.mouse(this.parentNode)[0],2);
//       d3.select(this).attr("cx", d.x = newValue );
       that.reweightHeader({column:d3.select(this).data()[0], value:newValue})
        that.updateBody(that.storage.getColumnHeaders(),that.storage.getData())
    }

    function dragended(d) {
        d3.select(this).classed("dragging", false);
        if (that.sortedColumn instanceof LineUpStackedColumn){
            that.storage.resortData({columnID: that.sortedColumn.id});
            that.updateBody(that.storage.getColumnHeaders(), that.storage.getData());
        }
    }

    // ==== level 1 columns =====
    var level1Headers =svg.selectAll(".l1Header").data(headersEnriched);
    level1Headers.exit().remove();

    // -- enter section --
    var level1HeaderEnter = level1Headers.enter().append("g").attr({
        "class":"l1Header"
    });

    level1HeaderEnter.append("rect").attr({
        width:function(d){return d.header.width},
        height:50-4
    }).style({
        "fill":function(d,i){return LineUpGlobal.columnColors(i)}
    }).on({
        "click":function(d){
            that.storage.resortData({columnID: d.header.id});
            that.updateBody(that.storage.getColumnHeaders(), that.storage.getData());
            that.sortedColumn= d.header;
            that.updateHeader(that.storage.getColumnHeaders());
        }
    });

    level1HeaderEnter.append("circle").attr({
        "class":"weightHandle",
        cx:function(d){return d.header.width-6},
        cy:function(d){
            if (d.header instanceof LineUpStackedColumn)
                return ((50-4)/4);
            else return 50/2;},
        r:5

    }).call(dragWeight)

    level1HeaderEnter.append("text").attr({
        "class":"headerLabel",
        y: function (d) {
            if (d.header instanceof LineUpStackedColumn)
                return ((50-4)/4);
            else return 50/2;
        },
        x:3
    }).text(function (d) {
        return d.header.label;
    })


    // -- update --
    level1Headers.attr({
        "transform":function(d){return "translate("+ d.offset+","+2+")";}
    });
    level1Headers.select("rect").attr({
        width:function(d){return d.header.width},
        height: function(d){
            if (d.header instanceof LineUpStackedColumn)
                return ((50-4)/2-2);
            else return 50-4;}
    });
    level1Headers.selectAll(".weightHandle").attr({
        cx:function(d){return d.header.width-6}
    })

    level1Headers.select("text").classed("sortedColumn",function(d){
        if (d.header.id == that.sortedColumn.id) return true;
        else return false;
    })




    // === level 2 headers ===
    var l2Headers = []
    headersEnriched
        .filter(function(d){return (d.header instanceof LineUpStackedColumn)})
        .forEach(function(d){
            var parentOffset = d.offset;
            d.header.hierarchical.forEach(function(subHeader){
                var hObject = {offset:parentOffset, header:subHeader};
                parentOffset+=subHeader.width;
                l2Headers.push(hObject)
            })

        })

    var colorOffset = headers.length; // use new colors for subheaders!!


    var level2Headers = svg.selectAll(".l2Header").data(l2Headers);
    level2Headers.exit().remove();

    // --- append ---
    var level2HeaderEnter = level2Headers.enter().append("g").attr({
        "class":"l2Header"
    });
    level2HeaderEnter.append("rect").attr({
        width:function(d){return d.header.width-2},
        height:(50-4)/2-2
    }).style({
        "fill": function (d, i) {
            return LineUpGlobal.columnColors(i + colorOffset)
        }
    }).on({
        "click":function(d){
//            console.log(d);
            that.storage.resortData({columnID: d.header.id});
            that.updateBody(that.storage.getColumnHeaders(), that.storage.getData())
            that.sortedColumn= d.header;
            that.updateHeader(that.storage.getColumnHeaders())
        }

    });

    level2HeaderEnter.append("circle").attr({
        "class":"weightHandle",
        cx:function(d){return d.header.width-6-2},
        cy:(50-4)/4,
        r:5

    }).call(dragWeight);


    level2HeaderEnter.append("text").attr({
        "class":"headerLabel",
        y:(50-4)/4,
        x:3
    }).text(function (d) {
        return d.header.label;
    })


    // --- update ---
    level2Headers.attr({
        "transform":function(d){return "translate("+ d.offset+","+(2+50/2)+")";}
    });
    level2Headers.select("rect").attr({
        width:function(d){return d.header.width-2},
        height: (50-4)/2-2
    });
    level2Headers.selectAll(".weightHandle").attr({
        cx:function(d){return d.header.width-6-2}
    })

    level2Headers.select("text").classed("sortedColumn",function(d){
        if (d.header.id == that.sortedColumn.id) return true;
        else return false;
    })



};

/**
 * called when a Header width changed, calls {@link updateHeader}
 * @param change - the change information
 * @param change.column - the changed column, see {@link LineUpColumn}
 * @param change.value - the new column width
 */
LineUp.prototype.reweightHeader= function(change){

    var headers = this.storage.getColumnHeaders()
    headers.forEach(function(d){
        if (d instanceof LineUpStackedColumn){

            if (d.id === change.column.header.id) {

                var newScale = d3.scale.linear().domain([0, d.width]).range([0, change.value]);
                d.hierarchical.forEach(function (subHeader) {
                    subHeader.width = newScale(subHeader.width)
                })
                d.width = change.value;
            }else{
                d.hierarchical.forEach(function (subHeader) {
                    if (subHeader.id === change.column.header.id ){
                        var diff = change.value - subHeader.width
                        subHeader.width +=diff;
                        d.width+=diff;
                    }

                })


            }
        }
        else if (d.id === change.column.header.id){
            d.width = change.value;
        }
    })
    this.updateHeader(headers);




};

/**
 * updates the table body
 * @param headers - the headers as in {@link updateHeader}
 * @param data - the data array from {@link LineUpLocalStorage.prototype#getData()}
 */
LineUp.prototype.updateBody = function(headers, data){

    console.log("DDD",data);

    var offset = 0;
    var headerInfo =  d3.map();
    headers.forEach(function(d, index){
        headerInfo.set(d.id,{offset:offset,header:d, index:index});
        offset+= d.width+2;
    });

    this.indexOffset=headers.length; // TODO: REPLACE by flatten function !!
    var that = this;
//    console.log(headerInfo);
    headers
        .filter(function(d){return (d instanceof LineUpStackedColumn)})
        .forEach(function(headerI){
            var xOffset = headerInfo.get(headerI.id).offset;
            headerI.hierarchical.forEach(function(d){
                headerInfo.set(d.id,{offset:xOffset,header:d, index:that.indexOffset});
                xOffset+= d.width;
                that.indexOffset= that.indexOffset+1;

            })
        });


    var datLength = data.length;
    var rowScale = d3.scale.ordinal()
        .domain(data.map(function(d,i){return d.schoolname}))// TODO (important): chnge this to ID !!
        .rangeBands([0,(datLength*20)],0,.2);

    d3.select("#lugui-table-body-svg").attr({
        height: datLength*20
    })

    var allRows = d3.select("#lugui-table-body-svg").selectAll(".row").data(data, function(d){return d.schoolname})
    allRows.exit().remove();

    // --- append ---
    var allRowsEnter = allRows.enter().append("g").attr({
        "class":"row"
    })



    // -- the text columns
    allRowsEnter.selectAll(".tableData.text")
        .data(function(d,i){
            var data = Object.keys(d)
                .filter(function(key){return headerInfo.has(key) && (headerInfo.get(key).header instanceof LineUpStringColumn)})
                .map(function(key){return {key:key,value:d[key]};});
            data.push({key:"rank",value:i});// TODO: should be fixed to the real rank
            return data;
        }).enter()
        .append("text")
        .attr({
            "class":"tableData text",
            x:function(d){
                return headerInfo.get(d.key).offset
            },
            y:10
        }).text(function(d){return d.value});


    allRowsEnter.selectAll(".tableData.bar")
        .data(function(d,i){
            var data = Object.keys(d)
                .filter(function(key){return headerInfo.has(key) && (headerInfo.get(key).header instanceof LineUpNumberColumn)})
                .map(function(key){return {key:key,value:d[key]};});
            return data;
        }).enter()
        .append("rect")
        .attr({
            "class":"tableData bar",
            y:2,
            height:20-4
        });


    //--- update ---
    allRows.transition().duration(1000).attr({
        "transform":function(d, i){
//                console.log(rowScale(d.schoolname), d.schoolname);
               return  "translate("+2+","+rowScale(d.schoolname)+")" // TODO(important): remove this by ID !!
        }
    })

    allRows.selectAll(".tableData.text")
        .attr({
            x:function(d){
                return headerInfo.get(d.key).offset
            }
        }).style({
            fill: function(d){ return LineUpGlobal.columnColors(headerInfo.get(d.key).index)}
        })

    allRows.selectAll(".tableData.bar")
        .attr({
            x:function(d){
                return headerInfo.get(d.key).offset
            },
            width:function(d){
                var hi = headerInfo.get(d.key)

                return Math.max(hi.header.scale(+d.value)*hi.header.width-2,0)
            }
        }).style({
            fill: function(d){ return LineUpGlobal.columnColors(headerInfo.get(d.key).index)}
        })








}


var layoutHTML= function(){
    //add svgs:
    d3.select("#lugui-table-header").append("svg").attr({
        id:"lugui-table-header-svg",
        width:($(window).width()),
        height:LineUpGlobal.htmlLayout.headerheight
    })

    d3.select("#lugui-table-body").append("svg").attr({
        id:"lugui-table-body-svg",
        width:($(window).width())
    })

    // constant layout attributes:
    $("#lugui-menu").css({
        "top" : LineUpGlobal.htmlLayout.windowOffsetY +"px",
        "left" : LineUpGlobal.htmlLayout.windowOffsetX+"px",
        "height": LineUpGlobal.htmlLayout.menuheight+"px"
    })
    $("#lugui-table-header").css({
        "top" : LineUpGlobal.htmlLayout.headerOffsetY() +"px",
        "left" : LineUpGlobal.htmlLayout.windowOffsetX+"px",
        "height": LineUpGlobal.htmlLayout.headerheight+"px"
    })

    $("#lugui-table-body-wrapper").css({
        "top" : LineUpGlobal.htmlLayout.bodyOffsetY()+"px",
        "left" : LineUpGlobal.htmlLayout.windowOffsetX+"px"
    })



    // ----- Adjust UI elements...
    var resizeGUI = function(){
        d3.selectAll("#lugui-menu, #lugui-table-header, #lugui-table-body-wrapper").style({
            "width": ($(window).width() - 2* LineUpGlobal.htmlLayout.windowOffsetX)+"px"
        });
        d3.selectAll("#lugui-table-header-svg, #lugui-table-body-svg").attr({
            "width": ($(window).width()- 2* LineUpGlobal.htmlLayout.windowOffsetX)
        });
        d3.select("#lugui-table-body-wrapper").style({
            "height": ($(window).height()-LineUpGlobal.htmlLayout.bodyOffsetY())+"px"
        });
    };

    // .. on window changes...
    $(window).resize(function(){
        resizeGUI();
    });

    // .. and initially once.
    resizeGUI();



}




// document ready
$(
    function () {


    layoutHTML();





    d3.json("data/data.json", function(desc) {
        d3.select("head").append("link").attr("href",desc.css).attr("rel","stylesheet");
        d3.tsv("data/"+desc.file, function(_data) {
            var spec = {};
            spec.storage = new LineUpLocalStorage("#wsv", _data, desc.columns);

            var lu = new LineUp(spec);
            lu.startVis();

        });
    })

})