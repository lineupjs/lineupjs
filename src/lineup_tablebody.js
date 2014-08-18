/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
/**
 * updates the table body
 * @param headers - the headers as in {@link updateHeader}
 * @param data - the data array from {@link LineUpLocalStorage.prototype#getData()}
 */
LineUp.prototype.updateBody = function(headers, data, stackTransition){

    console.log("bupdate");
    var _stackTransition = stackTransition || false;

//    // generate ColumnLayout
//    var offset = 0;
//    var headerInfo =  d3.map();
//    headers.forEach(function(d, index){
//        var isGray = (d instanceof LineUpStringColumn)
//            || (d instanceof LineUpCompositeColumn)
//            || (d.name == "rank")
//
//        headerInfo.set(d.id,{offset:offset,header:d, index:index, inStack:false, isGray:isGray});
//        offset+= d.width+2;
//    });
//
//
//
//
//    this.indexOffset=headers.length; // TODO: REPLACE by flatten function !!
//    var that = this;
//    headers
//        .filter(function(d){return (d instanceof LineUpStackedColumn)})
//        .forEach(function(stackedColumn){
//            var xOffset = headerInfo.get(stackedColumn.id).offset;
//            stackedColumn.hierarchical.forEach(function(innerColumn){
//                headerInfo.set(innerColumn.id,{offset:xOffset,header:innerColumn, index:that.indexOffset, inStack:true, isGray:false});
//                xOffset+= innerColumn.width;
//                that.indexOffset= that.indexOffset+1;
//
//            })
//        });



    var allHeaders = [];
    headers.forEach(function(d){d.flattenMe(allHeaders)})



    var datLength = data.length;
    var rowScale = d3.scale.ordinal()
        .domain(data.map(function(d,i){return d[LineUpGlobal.primaryKey]}))
        .rangeBands([0,(datLength*LineUpGlobal.svgLayout.rowHeight)],0,.2);

    d3.select("#lugui-table-body-svg").attr({
        height: datLength*LineUpGlobal.svgLayout.rowHeight
    });


    // -- handle all row groups

    var allRows = d3.select("#lugui-table-body-svg").selectAll(".row").data(data, function(d){return d[LineUpGlobal.primaryKey]})
    allRows.exit().remove();

    // --- append ---
    var allRowsEnter = allRows.enter().append("g").attr({
        "class":"row"
    });

    //    //--- update ---
    allRows.transition().duration(1000).attr({
        "transform":function(d, i){
            return  "translate("+0+","+rowScale(d[LineUpGlobal.primaryKey])+")"
        }
    })



    // -- the text columns

    var allTextHeaders = allHeaders.filter(function(d){return (d.hasOwnProperty('column') && (d.column instanceof LineUpStringColumn));})

    const rowCenter = (LineUpGlobal.svgLayout.rowHeight/2);

        var textRows = allRows.selectAll(".tableData.text")
        .data(function(d,i){

            var data = allTextHeaders.map(function(column){
                return {value:column.column.getValue(d), offsetX:column.offsetX};
            })
            return data;
        })

        textRows.exit().remove();

        textRows
        .attr({
            x:function(d){
//                console.log("u", d.offsetX);
                return d.offsetX
            }
        })

        textRows.enter()
        .append("text")
        .attr({
            "class":function(d){
                if (d.isRank) return "tableData text rank";
                else return "tableData text";
            },
            x:function(d){
                return d.offsetX
            },
            y:rowCenter
        }).text(function(d){return d.value})



    ///// TODO ---- IMPORTANT  ----- DO NOT DELETE

    //            data.push({key:"rank",value:d["rank"]});// TODO: use Rank column
    //    allRows.selectAll(".tableData.text.rank")
//        .data(function(d){
////            console.log(d);
//            return [{key:"rank",value:d["rank"]}]
//        }
//    )


    // -- handle the Single columns  (!! use unflattened headers for filtering)

    var allSingleBarHeaders = headers.filter(function(d){return (d.hasOwnProperty('column') && (d.column instanceof LineUpNumberColumn));})
        var barRows = allRows.selectAll(".tableData.bar")
        .data(function(d,i){
            var data =allSingleBarHeaders.map(function(column){
                return {key:column.getDataID(),value:column.getWidth(d), offsetX:column.offsetX};
            });
            return data;
        })

    barRows.exit().remove();

        barRows.enter()
        .append("rect")
        .attr({
            "class":"tableData bar",
            y:2,
            height:LineUpGlobal.svgLayout.rowHeight-4
        });

        barRows
        .attr({
            x:function(d){
                return d.offsetX
            },
            width:function(d){
                return Math.max(+d.value-2,0)
            }
        }).style({
            fill: function(d){ return LineUpGlobal.colorMapping.get(d.key)}
        })


    // -- RENDER the stacked columns (update, exit, enter)
    var allStackedHeaders = headers.filter(function(d){return (d instanceof LayoutStackedColumn);})

    // -- render StackColumnGroups
    var stackRows = allRows.selectAll(".tableData.stacked")
        .data(function(d,i){

            var data =allStackedHeaders.map(function(column){
                return {key:column.getDataID(),childs:column.children, parent:column, row:d};
            });
            return data;
        })
    stackRows.exit().remove();
        stackRows.enter()
        .append("g")
        .attr({
            "class":"tableData stacked"
//            y:2,
//            height:20-4
        });

    stackRows
    .attr({
        "transform":function(d) {
            return "translate("+ d.parent.offsetX+","+2+")";
        }
    })


    // -- render all Bars in the Group
    var allStackOffset = 0;
    var allStackW = 0;
    var allStackRes = {};

    var allStack = stackRows.selectAll("rect").data(function(d){

            allStackOffset = 0;
            allStackW =0;

            return d.childs.map(function(child){
                allStackW= child.getWidth(d.row)

                allStackRes = {child:child, width:allStackW, offsetX: allStackOffset}

                if (LineUpGlobal.renderingOptions.stacked){
                    allStackOffset += allStackW;
                }else{
                    allStackOffset += child.getColumnWidth();
                }

                return allStackRes

            })


        }
    )

    allStack.exit().remove()

    allStack.enter().append("rect").attr({
        y:2,
        height:LineUpGlobal.svgLayout.rowHeight-4
    });


    if (_stackTransition){
        allStack.transition().attr({
            x:function(d){return d.offsetX;},
            width: function (d) {
                return (d.width>2)?d.width-2: d.width
            }
        }).style({
            fill: function(d){
                return LineUpGlobal.colorMapping.get(d.child.getDataID())
            }
        })
    }else{
        allStack.attr({
            x:function(d){return d.offsetX;},
            width: function (d) {
                return (d.width>2)?d.width-2: d.width
            }
        }).style({
            fill: function(d){
                return LineUpGlobal.colorMapping.get(d.child.getDataID())
            }
        })

    }





}