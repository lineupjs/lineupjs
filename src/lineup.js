/**
 * Global LineUp Variables
 * @property {d3.scale} columncolors - color scale for columns
 */
var LineUpGlobal = {
    columnColors: d3.scale.category20(),
    htmlLayout: {
        menuHeight: 25,
        menuHeightExpanded: 50,
        headerheight: 50,
        windowOffsetX: 5,
        windowOffsetY: 5,
        headerOffsetY: function(){return (this.menuHeight + this.windowOffsetY + 3) },
        bodyOffsetY: function(){return (this.menuHeight + this.windowOffsetY + this.headerheight +3) }

    },
    renderingOptions: {
        stacked:false
//        ,
//        animated:true
    },
    datasets:[],
    actualDataSet: [],
    lineUpRenderer:null,
    sortingOrderAsc:false,
    primaryKey:""




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


    var that = this;


    /*
    * define dragging behaviour for header weights
    * */

    function dragWeightStarted() {
        d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);
    }


    function draggedWeight() {
        var newValue = Math.max(d3.mouse(this.parentNode)[0],2);
//       d3.select(this).attr("cx", d.x = newValue );
        that.reweightHeader({column:d3.select(this).data()[0], value:newValue})
        that.updateBody(that.storage.getColumnHeaders(),that.storage.getData())
    }

    function dragWeightEnded() {
        d3.select(this).classed("dragging", false);
        if (that.sortedColumn instanceof LineUpStackedColumn){
            that.storage.resortData({columnID: that.sortedColumn.column});
            that.updateBody(that.storage.getColumnHeaders(), that.storage.getData());
        }
    }


    this.dragWeight= d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", dragWeightStarted)
        .on("drag", draggedWeight)
        .on("dragend", dragWeightEnded);



};

LineUp.prototype.changeDataStorage= function(spec){
//    d3.select("#lugui-table-header-svg").selectAll().remove();
    this.storage = spec.storage;
    this.sortedColumn = [];
    this.startVis();
}


/**
 * the function to start the LineUp visualization
 */
LineUp.prototype.startVis = function(){

    this.updateMenu();
    this.updateHeader(this.storage.getColumnHeaders());
    this.updateBody(this.storage.getColumnHeaders(), this.storage.getData())

}


LineUp.prototype.updateMenu = function () {
    var kv = getKeyValueFromObject(LineUpGlobal.renderingOptions)

    var that = this;
    var kvNodes =d3.select("#lugui-menu-rendering").selectAll("span").data(kv,function(d){return d.key;})
    kvNodes.exit().remove();
    kvNodes.enter().append("span").on({
        "click":function(d){
            LineUpGlobal.renderingOptions[d.key] = !LineUpGlobal.renderingOptions[d.key]
            that.updateMenu();
            that.updateHeader(that.storage.getColumnHeaders())
            that.updateBody(that.storage.getColumnHeaders(), that.storage.getData())
        }
    })
    kvNodes.html(function(d){
        return '<a href="#"> <i class="fa '+ (d.value?'fa-check-circle-o':'fa-circle-o')+'" ></i> '+ d.key+'</a>&nbsp;&nbsp;'
    })

}



/**
 * Render the given headers
 * @param headers - the array of headers, see {@link LineUpColumn}
 */
LineUp.prototype.updateHeader = function(headers){
//    console.log("update Header");
    var svg = d3.select("#lugui-table-header-svg");
    var that = this;
    var offset = 0;
    var headersEnriched = headers.map(function(d){

        var isGray = (d instanceof LineUpStringColumn)
            || (d instanceof LineUpStackedColumn)
            || (d.id == "rank")
        var hObject = {
            offset:offset,
            header:d,
            sortedBy:((that.sortedColumn!=[])?that.sortedColumn.column== d.column:false),
            isGray:isGray
        };
        offset+= d.width+2;
        return hObject;
    });
    //console.log("headersEnriched", headersEnriched);


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
        "fill":function(d,i){
            if (d.isGray) return "#666666";
            else return LineUpGlobal.columnColors(i)
        }
    }).on({
        "click":function(d){
//            console.log("CLICK",LineUpGlobal, d.column);
            if (that.sortedColumn!=[] && (d.header.column == that.sortedColumn.column))
            {

                LineUpGlobal.sortingOrderAsc = LineUpGlobal.sortingOrderAsc?false:true;
            }else{
                LineUpGlobal.sortingOrderAsc = false;
            }


            that.storage.resortData({columnID: d.header.column, asc:LineUpGlobal.sortingOrderAsc});
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

    })

    level1HeaderEnter.append("text").attr({
        "class":"headerLabel",
        y: function (d) {
            if (d.header instanceof LineUpStackedColumn)
                return ((50-4)/4);
            else return 50/2;
        },
        x:12
    }).text(function (d) {
        return d.header.label;
    })

    level1HeaderEnter.append("text").attr({
        'class':'headerSort',
        y: function (d) {
            if (d.header instanceof LineUpStackedColumn)
                return ((50-4)/4);
            else return 50/2;
        },
        x:2
    }).style({

        'font-family':'FontAwesome',
        'font-size':'10pt',
        'fill':'white'
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
    level1Headers.select(".weightHandle").attr({
        cx:function(d){
            return (d.header.width-6)
        }
    }).call(this.dragWeight)

    level1Headers.select(".headerLabel")
        .classed("sortedColumn",function(d){
            return d.sortedBy
//            if (d.header.id == that.sortedColumn.id) return true;
//            else return false;
        })

    level1Headers.select(".headerSort").text(function(d){
        return ((d.sortedBy)?
            ((LineUpGlobal.sortingOrderAsc)?'\uf0de':'\uf0dd')
            :"");})





    // === level 2 headers ===
    var l2Headers = []
    headersEnriched
        .filter(function(d){return (d.header instanceof LineUpStackedColumn)})
        .forEach(function(d){
            var parentOffset = d.offset;
            d.header.hierarchical.forEach(function(subHeader){
                var hObject = {
                    offset:parentOffset,
                    header:subHeader,
                    sortedBy:((that.sortedColumn!=[])?that.sortedColumn.column== subHeader.column:false)
                };
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
            if (that.sortedColumn!=[] && (d.header.column == that.sortedColumn.column))
            {

                LineUpGlobal.sortingOrderAsc = LineUpGlobal.sortingOrderAsc?false:true;
            }else{
                LineUpGlobal.sortingOrderAsc = false;
            }


            that.storage.resortData({columnID: d.header.column, asc:LineUpGlobal.sortingOrderAsc});
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

    }).call(this.dragWeight);


    level2HeaderEnter.append("text").attr({
        "class":"headerLabel",
        y:(50-4)/4,
        x:12
    }).text(function (d) {
        return d.header.label;
    })

    level2HeaderEnter.append("text").attr({
        'class':'headerSort',
        y:(50-4)/4,
        x:2
    }).style({

        'font-family':'FontAwesome',
        'font-size':'10pt',
        'fill':'white'
    })

    // --- update ---
    level2Headers.attr({
        "transform":function(d){return "translate("+ d.offset+","+(2+50/2)+")";}
    });
    level2Headers.select("rect").attr({
        width:function(d){return d.header.width-2},
        height: (50-4)/2-2
    });
    level2Headers.select(".weightHandle").attr({
        cx:function(d){return d.header.width-6-2}
    })

    level2Headers.select(".headerLabel").classed("sortedColumn",function(d){
        if (d.header.id == that.sortedColumn.id) return true;
        else return false;
    })

    level2Headers.select(".headerSort").text(function(d){
        return ((d.sortedBy)?
            ((LineUpGlobal.sortingOrderAsc)?'\uf0de':'\uf0dd')
            :"");})


};

/**
 * called when a Header width changed, calls {@link updateHeader}
 * @param change - the change information
 * @param change.column - the changed column, see {@link LineUpColumn}
 * @param change.value - the new column width
 */
LineUp.prototype.reweightHeader= function(change){

    var headers = this.storage.getColumnHeaders();
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
                        var diff = change.value - subHeader.width;
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

    // generate ColumnLayout
    var offset = 0;
    var headerInfo =  d3.map();
    headers.forEach(function(d, index){
        var isGray = (d instanceof LineUpStringColumn)
            || (d instanceof LineUpCompositeColumn)
            || (d.name == "rank")

        headerInfo.set(d.id,{offset:offset,header:d, index:index, inStack:false, isGray:isGray});
        offset+= d.width+2;
    });




    this.indexOffset=headers.length; // TODO: REPLACE by flatten function !!
    var that = this;
    headers
        .filter(function(d){return (d instanceof LineUpStackedColumn)})
        .forEach(function(stackedColumn){
            var xOffset = headerInfo.get(stackedColumn.id).offset;
            stackedColumn.hierarchical.forEach(function(innerColumn){
                headerInfo.set(innerColumn.id,{offset:xOffset,header:innerColumn, index:that.indexOffset, inStack:true, isGray:false});
                xOffset+= innerColumn.width;
                that.indexOffset= that.indexOffset+1;

            })
        });


    var datLength = data.length;
    var rowScale = d3.scale.ordinal()
        .domain(data.map(function(d,i){return d[LineUpGlobal.primaryKey]}))// TODO (important): chnge this to ID !!
        .rangeBands([0,(datLength*20)],0,.2);

    d3.select("#lugui-table-body-svg").attr({
        height: datLength*20
    });

    var allRows = d3.select("#lugui-table-body-svg").selectAll(".row").data(data, function(d){return d[LineUpGlobal.primaryKey]}) // TODO: ID
    allRows.exit().remove();

    // --- append ---
    var allRowsEnter = allRows.enter().append("g").attr({
        "class":"row"
    });



    // -- the text columns
    allRowsEnter.selectAll(".tableData.text")
        .data(function(d,i){
            var data = Object.keys(d)
                .filter(function(key){return headerInfo.has(key) && (headerInfo.get(key).header instanceof LineUpStringColumn)})
                .map(function(key){return {key:key,value:d[key]};});
            data.push({key:"rank",value:d["rank"]});// TODO: should be fixed to the real rank
            return data;
        }).enter()
        .append("text")
        .attr({
            "class":function(d){
                if (d.key == "rank") return "tableData text rank";
                else return "tableData text";
            },
            x:function(d){
                return headerInfo.get(d.key).offset
            },
            y:10
        }).text(function(d){return d.value});






    allRowsEnter.selectAll(".tableData.bar")
        .data(function(d,i){
            var data = Object.keys(d)
                .filter(function(key){return headerInfo.has(key) && (headerInfo.get(key).header instanceof LineUpNumberColumn && !headerInfo.get(key).inStack)})
                .map(function(key){return {key:key,value:d[key]};});
            return data;
        }).enter()
        .append("rect")
        .attr({
            "class":"tableData bar",
            y:2,
            height:20-4
        });

    allRows.selectAll(".tableData.stacked")
        .data(function(d,i){
            var data = headerInfo.keys()
                .filter(function(key){
                    return (headerInfo.get(key).header instanceof LineUpStackedColumn)}
                )
                .map(function(key){return {key:headerInfo.get(key).header.column,value:headerInfo.get(key), parentData:d};});
            return data;
        }).enter()
        .append("g")
        .attr({
            "class":"tableData stacked",
            y:2,
            height:20-4
        });
    var allStack = allRows.selectAll(".tableData.stacked").selectAll("rect").data(
        function(d){

            var res =0;
            var subcolumns = [];
            d.value.header.hierarchical.forEach(function(subhead) {
                var width = subhead.scale(d.parentData[subhead.column])* subhead.width;

                subcolumns.push({
                    headerInfo:subhead,
                    width:width,
                    offset:res
                })
                if (LineUpGlobal.renderingOptions.stacked){
                    res += width;
                }else{
                    res += subhead.width;
                }
                //subhead.scale(d.parentData[subhead.column]) * subhead.width;

            });
            return subcolumns
            }
    )
     allStack.enter().append("rect").attr({
            y:2,
            height:20-4
        }).style({

            fill: function(d){
//                console.log("hi",headerInfo);
                return LineUpGlobal.columnColors(headerInfo.get(d.headerInfo.id).index)
            }
        })
     allStack.transition().attr({
         x:function(d){return d.offset;},
         width: function (d) {
             return (d.width>2)?d.width-2: d.width
         }
     })


    //--- update ---
    allRows.transition().duration(1000).attr({
        "transform":function(d, i){
//                console.log(rowScale(d.schoolname), d.schoolname);
               return  "translate("+2+","+rowScale(d[LineUpGlobal.primaryKey])+")" // TODO(important!!!): remove this by ID !!
        }
    })

    allRows.selectAll(".tableData.text")
        .attr({
            x:function(d){
                return headerInfo.get(d.key).offset
            }
        }).style({
            fill: function(d){
                return "#333333"
//                return LineUpGlobal.columnColors(headerInfo.get(d.key).index)
            }
        })

    allRows.selectAll(".tableData.text.rank")
        .data(function(d){
//            console.log(d);
            return [{key:"rank",value:d["rank"]}]
        }
        )
        .text(function(d){return d.value});


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

    allRows.selectAll(".tableData.stacked")
        .attr({
            "transform":function(d) {
                return "translate("+ d.value.offset+","+2+")";
            }
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
        "height": LineUpGlobal.htmlLayout.menuHeight+"px"
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


    var loadDataset = function(ds){
        d3.json(ds.baseURL+"/"+ds.descriptionFile, function(desc) {

            LineUpGlobal.primaryKey = desc.primaryKey;

            d3.tsv(ds.baseURL+"/"+desc.file, function(_data) {
                var spec = {};
                spec.storage = new LineUpLocalStorage("#wsv", _data, desc.columns);

                if (LineUpGlobal.lineUpRenderer){
                    LineUpGlobal.lineUpRenderer.changeDataStorage(spec)
                }else{
                    LineUpGlobal.lineUpRenderer = new LineUp(spec);
                    LineUpGlobal.lineUpRenderer.startVis();
                }


            });
        })
    }



    d3.json("datasets.json", function(error,data){
        console.log("datasets:", data, error);

        LineUpGlobal.datasets = data.datasets;
        var ds = d3.select("#lugui-dataset-selector").selectAll("option").data(data.datasets)
        ds.enter().append("option")
        .attr({
            value:function(d,i){return i;}
        }).text(function(d){return d.name;})


        document.getElementById('lugui-dataset-selector').addEventListener('change', function () {
            loadDataset(LineUpGlobal.datasets[document.getElementById('lugui-dataset-selector').value])

        });

        //and start with 0:
        loadDataset(LineUpGlobal.datasets[0]);


    });





})


function getKeyValueFromObject(o){
    return Object.keys(o).map(function (key) {
        return {key:key, value:o[key]};
    })
}

