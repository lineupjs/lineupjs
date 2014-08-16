/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/15/14.
 */
LineUp.prototype.layoutHeaders = function(headers){

    var offset = 0;

    var res = headers.forEach(function(d){
//        console.log(d);
        d.offsetX = offset;
        d.offsetY = 2;
        d.height = LineUpGlobal.htmlLayout.headerHeight-4;
        offset+= d.getColumnWidth();
//        console.log(d.getColumnWidth());
    })


    headers.filter(function(d){return (d instanceof LayoutStackedColumn);})
        .forEach(function(d){
            d.height = LineUpGlobal.htmlLayout.headerHeight/2-4;

            var localOffset = 0;
            var parentOffset = d.offsetX;
            d.children.map(function(child){
                child.offsetX = parentOffset +localOffset;
                child.localOffsetX = localOffset;
                localOffset+=child.getColumnWidth();

                child.offsetY = LineUpGlobal.htmlLayout.headerHeight/2+2;
                child.height = LineUpGlobal.htmlLayout.headerHeight/2-4;
            })

        })


}

LineUp.prototype.layoutBody = function(headers, data){















}


LineUp.prototype.assignColors = function(headers){
    //Color schemes are in LineUpGlobal (.columnColors / .grayColor)



    // clear map
    LineUpGlobal.colorMapping = d3.map();

    var colCounter = 0;

    headers.forEach(function(d){
        // gray columns are:
        if ((d instanceof LineUpStringColumn)
//            || (d instanceof LineUpStackedColumn)
            || (d.id == "rank"))
        {
                LineUpGlobal.colorMapping.set(d.id, LineUpGlobal.grayColor);

        }else{
//            console.log(LineUpGlobal.columnColors(colCounter), colCounter, d);
            LineUpGlobal.colorMapping.set(d.id, LineUpGlobal.columnColors(colCounter));


            colCounter++;
        }



    })

    console.log(LineUpGlobal.colorMapping);




}

LineUp.prototype.layoutAll = function(headers, data){

        this.layoutHeader(headers,data);
        this.layoutBody(headers,data);














}