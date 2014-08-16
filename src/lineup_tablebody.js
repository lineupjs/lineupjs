/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
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
            return  "translate("+2+","+rowScale(d[LineUpGlobal.primaryKey])+")" // TODO(important): remove this by ID !!
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