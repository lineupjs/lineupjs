/*
* extracted from lineUp.js (created by sam gratzl)
* modified by hen
*
* contains the main  LineUp data structure
* and a loader for client side storage of whole table
* */

/**
 * The mother of all Columns
 * @param desc The descriptor object
 * @class
 */
function LineUpColumn(desc) {

    this._desc = desc;
    this.column = desc.column;
    this.width = desc.width || 100;
    this.label= desc.label || desc.column;
    this.id = desc.id || this.column;
    this.collapsed = desc.collapsed || false;
    this.layout = {};
}
LineUpColumn.prototype = {
    getValue : function(row) {
        return row[this.column];
    },
    filterBy : function(row) {
        return true;
    }
};

/**
 * A {@link LineUpColumn} implementation for Numbers
 * @param desc The descriptor object
 * @constructor
 * @extends LineUpColumn
 */
function LineUpNumberColumn(desc) {
    LineUpColumn.call(this,desc)

    this.scale = d3.scale.linear().domain(desc.domain).range([0,1]);
    this.filter = desc.filter || [0,100];
}
LineUpNumberColumn.prototype = $.extend({},LineUpColumn.prototype,{
    getValue : function(row) {
        return +LineUpColumn.prototype.getValue.call(this, row);
    },
    filterBy : function(row) {
        var n = this.getN(row);
        return n >= this.filter[0] && n <= this.filter[1];
    }

});

/**
 *A {@link LineUpColumn} implementation for Strings
 * @param desc The description object
 * @constructor
 * @extends LineUpColumn
 */
function LineUpStringColumn(desc) {
    LineUpColumn.call(this,desc)
    this.filter = desc.filter || undefined;
}
LineUpStringColumn.prototype = $.extend({},LineUpColumn.prototype, {
    filterBy : function(value) {
        if (!this.filter)
            return true
        return value.contains(this.filter);
    }
});

/**
 * A {@link LineUpColumn} implementation for Rank Values
 * @param desc The description object
 * @constructor
 * @extends LineUpColumn
 */
function LineUpRankColumn(desc) {
    LineUpColumn.call(this,desc)
    this.width = desc.width || 40;
    this.id = "rank";
    this.label = desc.label || "Rank";
}
LineUpRankColumn.prototype = $.extend({},LineUpColumn.prototype, {

});




/**
 *  --- FROM HERE ON ONLY Layout Columns ---
 */


function LayoutColumn(desc,rawColumns){
    var that = this
    this.columnWidth = desc.width ||100;
    this.id = _.uniqueId("Column_")

    this.scale = d3.scale.linear().domain([0,that.columnWidth])

    this.parent = desc.parent; // or null
    this.columnBundle = desc.columnBundle || "primary";
}

LayoutColumn.prototype = {
    setColumnWidth: function (newWidth, ignoreParent) {
        var _ignoreParent = ignoreParent || false;
//        console.log("UPdate", newWidth, _ignoreParent);
        this.columnWidth = newWidth;
        this.scale.domain([0, newWidth]);
        if (!ignoreParent && this.parent) this.parent.updateWidthFromChild({id: this.id, newWidth: newWidth});
    },
    getColumnWidth:function(){
        return this.columnWidth ;
    },

    flattenMe:function(array){
            array.push(this)
    }
}


function LayoutSingleColumn(desc, rawColumns){
    LayoutColumn.call(this, desc, rawColumns);
    this.columnLink = desc.column;
    var that = this;
    this.column = rawColumns.filter(function(d){return d.id == that.columnLink;})[0];
    this.id = _.uniqueId(this.columnLink+"_");
}

LayoutSingleColumn.prototype = $.extend({},LayoutColumn.prototype,{

    // ONLY for numerical columns
    getWidth:function(row){return this.scale(this.column.getValue(row));},

    getLabel: function () {
        return this.column.label
    },
    getDataID:function(){
       return this.column.id
    }

})



function LayoutCompositeColumn(desc, rawColumns) {
    LayoutColumn.call(this,desc,rawColumns);
    this.childrenLinks = desc.children||[];
    this.label = desc.label || this.id;
}

LayoutCompositeColumn.prototype = $.extend({},LayoutColumn.prototype,{
    getDataID:function(){
       return this.id
    }

});


function LayoutStackedColumn(desc, rawColumns, toLayoutColumn) {
    LayoutCompositeColumn.call(this, desc, rawColumns);
    this.childrenWeights = []
    this.childrenWidths = []
    this.toLayoutColumn = toLayoutColumn;
    this.init();


}

LayoutStackedColumn.prototype = $.extend({},LayoutCompositeColumn.prototype,{

    init: function () {
        var that = this;
        if (this.childrenLinks.length <1){
            // if new empty stacked column
        }else{
            // check if weights or width are given
            if (this.childrenLinks[0].hasOwnProperty("weight")){
                this.childrenWeights =  this.childrenLinks.map(function(d){return +(d.weight || 1)});

                this.scale.domain([0, d3.sum(this.childrenWeights)]);

                if (desc.hasOwnProperty('width')){
                    // if the stacked column has a width -- normalize to width
                    this.childrenWidths = this.childrenWeights.map(function(d){return that.scale(d);})
                }else{
                    // if width was artificial set, approximate a total width of x*100
                    this.columnWidth = this.children.length*100;
                    this.scale.range([0,that.columnWidth])

                }

            }else{
                // accumulate weights and map 100px to  weight 1.0
                this.childrenWidths =  this.childrenLinks.map(function(d){return +(d.width || 100)});

                this.childrenWeights = this.childrenWidths.map(function(d){return d/100.0})
                this.columnWidth = d3.sum(this.childrenWidths);
                this.scale.domain([0, d3.sum(this.childrenWeights)]).range([0, this.columnWidth]);
            }


        }


        this.children = this.childrenLinks.map(function (d,i) {
//            console.log(that);
            return that.toLayoutColumn({column: d.column, width:that.childrenWidths[i], parent:that })
        })



    },
    flattenMe:function(array){
        array.push(this);
        this.children.forEach(function(d){ d.flattenMe(array);})
    },
    updateWidthFromChild:function(spec){
        var that = this
        // adopt weight and global size
        this.childrenWidths = this.children.map(function(d){return d.getColumnWidth()});
        this.childrenWeights = this.childrenWidths.map(function(d){return that.scale.invert(d)});
        this.columnWidth = d3.sum(this.childrenWidths);
        this.scale.range([0, this.columnWidth]);

    },
    setColumnWidth:function(newWidth){
        var that = this;
        this.columnWidth = newWidth;
        this.scale.range([0, newWidth]);
        this.childrenWidths = this.childrenWeights.map(function(d){return that.scale(d)});
//        console.log(this.childrenWidths, this.childrenWeights);
        this.children.forEach(function(d,i){return d.setColumnWidth(that.childrenWidths[i], true)});
    }



});






///**
// * A {@link LineUpColumn} composite implementation
// * @param desc The description object
// * @param toColumn A function to convert desc.children to columns
// * @constructor
// * @extends LineUpColumn
// */
//function LineUpCompositeColumn(desc, toColumn) {
//    LineUpColumn.call(this,desc)
//    this.children = desc.children.map(toColumn);
//    for (var i = this.children.length - 1; i >= 0; i--) {
//        this.children[i].parent = this;
//    };
//}
//LineUpCompositeColumn.prototype = $.extend({},LineUpColumn.prototype, {
//
//});
//
/////**
//// * A {@link LineUpCompositeColumn} implementation for Max Column
//// * @param desc The description object
//// * @param toColumn A function to convert desc.children to columns
//// * @constructor
//// * @extends LineUpCompositeColumn
//// */
////function LineUpMaxColumn(desc,toColumn) {
////    LineUpCompositeColumn.call(this,desc,toColumn)
////    this.filter = desc.filter || [0,1];
////}
////LineUpMaxColumn.prototype = $.extend({},LineUpCompositeColumn.prototype, LineUpNumberColumn.prototype, {
////    init : function(table, data) {
////        LineUpCompositeColumn.prototype.init.call(this, table, data)
////    },
////    select : function(row) {
////        var key = "_"+this.id
////        if (row[key] !== undefined)
////            return this.children[row[key]]
////        var m = -1;
////        var mi = 0;
////        for (var i = this.children.length - 1; i >= 0; i--) {
////            var child = this.children[i];
////            var cm = child.getS(row);
////            if (cm > m) {
////                m = cm;
////                mi = i;
////            }
////        };
////        row[key] = mi;
////        var best = this.children[mi];
////        return best;
////    },
////    getS : function(row) {
////        return this.getN(row);
////    },
////    getN : function(row) {
////        return this.select(row).getS(row);
////    },
////    getValue: function(row) {
////        return this.select(row).getValue(row);
////    }
////});
//
///**
// * A {@link LineUpCompositeColumn} implementation for Stacked Column
// * @param desc The description object
// * @param toColumn A function to convert desc.children to columns
// * @constructor
// * @extends LineUpCompositeColumn
// */
//function LineUpStackedColumn(desc,toColumn) {
//    LineUpCompositeColumn.call(this,desc,toColumn)
//    this.hierarchical = this.children;
//    this.compressed = false;
//    this.filter = desc.filter || [0,1];
//    this.width = (this.children.length>0)?0:100; // width 100 if a new stacked column
//    this.label = desc.label || "Stacked Column"
//    this.column = "stacked_"+(Date.now() + Math.floor(Math.random()*10000))
//
//    for (var i = this.children.length - 1; i >= 0; i--) {
//        var child = this.children[i];
//        this.width += child.width;
//        if (child.hierarchical)
//            child.compressed = true;
//    };
//
//    this.mode = 'stacked' //single, stacked, alignBy
//}
//LineUpStackedColumn.prototype = $.extend({},LineUpCompositeColumn.prototype, LineUpNumberColumn.prototype, {
//
//    weights : function() {
//        var r = [];
//        var ws = 0;
//        for (var i = this.children.length - 1; i >= 0; i--) {
//            r[i] = this.children[i].width;
//            ws += r[i];
//        };
//        for (var i = r.length - 1; i >= 0; i--) {
//            r[i] = r[i] / ws;
//        };
//        return r;
//    },
//    getValue : function(row) {
//
///* nice idea to minimize calculation */
////        var key = "_"+this.id
////        if (row[key] !== undefined)
////            return row[key]
//
//        var res = 0;
//        this.hierarchical.forEach(function(subhead) {
//            res += subhead.scale(row[subhead.column]) * subhead.width;
//        });
//        return res;
//    }
//});

/**
 * An implementation of data storage for reading locally
 * @param tableId
 * @param data
 * @param columns
 * @param options
 * @class
 */
function LineUpLocalStorage(tableId, data, columns, layout, options){
    options = $.extend({}, options, {})

    var colTypes = $.extend({},options.colTypes, {
        "number" : LineUpNumberColumn,
        "string" : LineUpStringColumn,
//        "max" : LineUpMaxColumn,
//        "stacked" : LineUpStackedColumn,
        "rank" : LineUpRankColumn
    });


    function toColumn(desc) {
        return new colTypes[desc.type](desc, toColumn);
    }
    var rawcols = columns.map(toColumn);
    options.toColumn = toColumn;

    this.options = options;
    this.data = data;
    this.rawcols = rawcols;
    var that = this;


    var layoutColumnTypes = {
        "single": LayoutSingleColumn,
        "stacked": LayoutStackedColumn
    }

    function toLayoutColumn(desc){
        var type = desc.type || "single";
        return new layoutColumnTypes[type](desc,that.rawcols, toLayoutColumn)
    }

    this.primary= {}
    this.primary.layoutColumns = layout.primary.map(toLayoutColumn);

//    console.log(layout);

//    console.log(this.primary.layoutColumns);
}


LineUpLocalStorage.prototype = $.extend({},{},
    /** @lends LineUpLocalStorage.prototype */
    {

        getRawColumns: function () {
          return this.rawcols;
        },


        getColumnLayout: function(key){
            var _key = key|| "primary";
            return this[_key].layoutColumns;
        },

   getColumnHeaders: function(){
       return this.cols;
   },

    /**
     *  get the data
     *  @returns data
     */
   getData: function(){
       return this.data;
   },
   flatHeaders:function(){
       var res = [];

//       this.cols.forEach(function(col){
//           if (col instanceof LineUpStackedColumn){
//               res.push(col);
//               col.hierarchical.forEach(function(subcol){
//                   res.push(subcol);
//               })
//
//           }else{
//               res.push(col);
//           }
//       })

       return res;
   },
   resortData: function(spec){
       spec.columnID;

       var asc = spec.asc || false;

//       console.log("resort: ",spec);
       var accessFunction = function(){return 0};

       var fh = this.flatHeaders();

       //TODO: semi-optimal !! (maybe a map?)
       // find selected header
       var selectedHeader = {};
       fh.forEach(function(header){
               if (header.column === spec.columnID){
                   selectedHeader = header;
               }
       })


       this.data.sort(function(a,b){
           return d3.descending(selectedHeader.getValue(a), selectedHeader.getValue(b))
       });

        this.assignRanks(function (a){return selectedHeader.getValue(a)});

       if (asc) this.data.reverse();

   },
   /*
   * assigns the ranks to the data which is expected to be sorted in decreasing order
   * */
   assignRanks:function(accessFunction){

//       console.log("assign Ranks:", accessFunction);

       var actualRank =1;
       var actualValue = -1;
       this.data.forEach(function(d){
           if (actualValue==-1) actualValue = accessFunction(d);

           if (actualValue!=accessFunction(d)){
               actualRank++;
               actualValue = accessFunction(d);
           }
           d.rank = actualRank;

       })
   }





});


/**
 * LineUp Query object to send to a storage instance requesting updates
 * @constructor
 */
function LineUpQuery(rowRange, columnWeights){
    this.rowRange=[0,100];
    this.columnWeights = [];
    this.ranks =[];

    function getRanks(){
        return this.ranks;
    }



}






