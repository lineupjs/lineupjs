//require('datastructure.js');

var LineUpGlobal = {
    columnColors: d3.scale.category10()
}

var LineUp = function(spec){
    this.storage = spec.storage;

}

LineUp.prototype.startVis = function(){

    console.log("runit");

    var fake = []
    for (i =0; i<100;i++){
        fake.push(Math.random()*50)
    }
    var fakeVis =
        d3.select("#lugui-table-body").selectAll("p").data(fake)
    fakeVis.enter().append("p").text(function(d){return d});

    this.storage.getColumnHeaders().forEach(function(d){
        console.log(d);
        console.log(d instanceof LineUpStackedColumn);
    })




    this.updateHeader(this.storage.getColumnHeaders())

}


LineUp.prototype.updateHeader = function(headers){

    var svg = d3.select("#lugui-table-header-svg")

    var offset = 0;
    var headersEnriched = headers.map(function(d){
        var hObject = {offset:offset,header:d};
        offset+= d.width+2;
        return hObject;
    })

    // render level 1 columns
    var svgHeaders =svg.selectAll(".table-header").data(headersEnriched)
    svgHeaders.enter().append("rect").attr({
        class:"table-header",
        x:function(d){return d.offset},
        y:2,
        width:function(d){return d.header.width},
        height:50-4
    }).style({
            "fill":function(d,i){return LineUpGlobal.columnColors(i)},
            "opacity":.1
        })

    svgHeaders.transition().attr({
        x:function(d){return d.offset},
        y:2,
        width:function(d){return d.header.width},
        height:function(d){
            if (d.header instanceof LineUpStackedColumn)
                        return ((50-4)/2-2);
            else return 50-4;}
    }).style({
        "opacity":1
    })



    //level 2 headers
    var l2Headers = []
    headersEnriched
        .filter(function(d){return (d.header instanceof LineUpStackedColumn)})
        .forEach(function(d){
            var parentOffset = d.offset;
            d.header.hierarchical.forEach(function(subHeader){
                var hObject = {offset:parentOffset, header:subHeader}
                parentOffset+=subHeader.width+2;
                l2Headers.push(hObject)
            })

        })

    // take new colors for subheaders!!
    var colorOffset = headers.length;

    console.log(l2Headers);
    // render level 2 columns
    var svgHeaders =svg.selectAll(".table-sub-header").data(l2Headers)
    svgHeaders.enter().append("rect").attr({
        class:"table-sub-header",
        x:function(d){return d.offset},
        y:2+(50-4)/2+2,
        width:function(d){return d.header.width},
        height:(50-4)/2-2
    }).style({
        "fill":function(d,i){return LineUpGlobal.columnColors(i+colorOffset)},
        "opacity":.1
    })

    svgHeaders.transition().attr({
        class:"table-sub-header",
        x:function(d){return d.offset},
        y:2+(50-4)/2+2,
        width:function(d){return d.header.width},
        height:(50-4)/2-2
    }).style({
        "opacity":1
    })



}





// document ready
$(function(){

    //add svgs:
    d3.select("#lugui-table-header").append("svg").attr({
        id:"lugui-table-header-svg",
        width:($(window).width()-10),
        height:50
    })


    // ----- Adjust UI elements...
    var resizeGUI = function(){
        d3.select("#lugui-table-header").style({
            "width": ($(window).width()-10)+"px"
        })
        d3.select("#lugui-table-header-svg").attr({
            "width": ($(window).width()-10)
        })
        d3.select("#lugui-table-body-wrapper").style({
            "width": ($(window).width()-10)+"px",
            "height": ($(window).height()-5-50)+"px" // see CSS in main HTML !!!
        })
    }

    // .. on window changes...
    $(window).resize(function(){
        console.log("resize: "+ $(window).size());
        resizeGUI();
    });

    // .. and initially once.
    resizeGUI();



//    $(EventManager).bind("ui-resize", function (event, data) {
//        console.log("ui resize");
//    });
//
//    $(EventManager).bind("ui-vertical-resize", function (event, data) {
//        console.log("ui VERTICAL resize");
//    });
//
//    $(EventManager).bind("ui-horizontal-resize", function (event, data) {
//        console.log("ui HORIZONTAL resize");
//    });


    d3.json("data.json", function(desc) {
        d3.select("head").append("link").attr("href",desc.css).attr("rel","stylesheet");
        d3.tsv(desc.file, function(_data) {
            var spec = {};
            spec.storage = new LineUpLocalStorage("#wsv", _data, desc.columns);

            var lu = new LineUp(spec);
            lu.startVis();

        });
    })

})