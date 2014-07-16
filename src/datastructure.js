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
 * A {@link LineUpColumn} composite implementation
 * @param desc The description object
 * @param toColumn A function to convert desc.children to columns
 * @constructor
 * @extends LineUpColumn
 */
function LineUpCompositeColumn(desc, toColumn) {
    LineUpColumn.call(this,desc)
    this.children = desc.children.map(toColumn);
    for (var i = this.children.length - 1; i >= 0; i--) {
        this.children[i].parent = this;
    };
}
LineUpCompositeColumn.prototype = $.extend({},LineUpColumn.prototype, {

});

///**
// * A {@link LineUpCompositeColumn} implementation for Max Column
// * @param desc The description object
// * @param toColumn A function to convert desc.children to columns
// * @constructor
// * @extends LineUpCompositeColumn
// */
//function LineUpMaxColumn(desc,toColumn) {
//    LineUpCompositeColumn.call(this,desc,toColumn)
//    this.filter = desc.filter || [0,1];
//}
//LineUpMaxColumn.prototype = $.extend({},LineUpCompositeColumn.prototype, LineUpNumberColumn.prototype, {
//    init : function(table, data) {
//        LineUpCompositeColumn.prototype.init.call(this, table, data)
//    },
//    select : function(row) {
//        var key = "_"+this.id
//        if (row[key] !== undefined)
//            return this.children[row[key]]
//        var m = -1;
//        var mi = 0;
//        for (var i = this.children.length - 1; i >= 0; i--) {
//            var child = this.children[i];
//            var cm = child.getS(row);
//            if (cm > m) {
//                m = cm;
//                mi = i;
//            }
//        };
//        row[key] = mi;
//        var best = this.children[mi];
//        return best;
//    },
//    getS : function(row) {
//        return this.getN(row);
//    },
//    getN : function(row) {
//        return this.select(row).getS(row);
//    },
//    getValue: function(row) {
//        return this.select(row).getValue(row);
//    }
//});

/**
 * A {@link LineUpCompositeColumn} implementation for Stacked Column
 * @param desc The description object
 * @param toColumn A function to convert desc.children to columns
 * @constructor
 * @extends LineUpCompositeColumn
 */
function LineUpStackedColumn(desc,toColumn) {
    LineUpCompositeColumn.call(this,desc,toColumn)
    this.hierarchical = this.children;
    this.compressed = false;
    this.filter = desc.filter || [0,1];
    this.width = (this.children.length>0)?0:100; // width 100 if a new stacked column
    this.label = "Stacked Column"
    this.column = "stacked_"+(Date.now() + Math.floor(Math.random()*10000))

    for (var i = this.children.length - 1; i >= 0; i--) {
        var child = this.children[i];
        this.width += child.width;
        if (child.hierarchical)
            child.compressed = true;
    };

    this.mode = 'stacked' //single, stacked, alignBy
}
LineUpStackedColumn.prototype = $.extend({},LineUpCompositeColumn.prototype, LineUpNumberColumn.prototype, {

    weights : function() {
        var r = [];
        var ws = 0;
        for (var i = this.children.length - 1; i >= 0; i--) {
            r[i] = this.children[i].width;
            ws += r[i];
        };
        for (var i = r.length - 1; i >= 0; i--) {
            r[i] = r[i] / ws;
        };
        return r;
    },
    getValue : function(row) {

/* nice idea to minimize calculation */
//        var key = "_"+this.id
//        if (row[key] !== undefined)
//            return row[key]

        var res = 0;
        this.hierarchical.forEach(function(subhead) {
            res += subhead.scale(row[subhead.column]) * subhead.width;
        });
        return res;
    }
});

/**
 * An implementation of data storage for reading locally
 * @param tableId
 * @param data
 * @param columns
 * @param options
 * @class
 */
function LineUpLocalStorage(tableId, data, columns, options){
    options = $.extend({}, options, {})

    var colTypes = $.extend({},options.colTypes, {
        "number" : LineUpNumberColumn,
        "string" : LineUpStringColumn,
//        "max" : LineUpMaxColumn,
        "stacked" : LineUpStackedColumn,
        "rank" : LineUpRankColumn
    });


    function toColumn(desc) {
        return new colTypes[desc.type](desc, toColumn);
    }
    var cols = columns.map(toColumn);
    options.toColumn = toColumn;

    this.options = options;
    this.data = data;
    this.cols = cols;
    var that = this;
 /* maybe needed later */
//    cols.forEach(function(col) {
//        col.init(that, data);
//    })
}


LineUpLocalStorage.prototype = $.extend({},{},
    /** @lends LineUpLocalStorage.prototype */
    {

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

       this.cols.forEach(function(col){
           if (col instanceof LineUpStackedColumn){
               res.push(col);
               col.hierarchical.forEach(function(subcol){
                   res.push(subcol);
               })

           }else{
               res.push(col);
           }
       })

       return res;
   },
   resortData: function(spec){
       spec.columnID;

       var asc = spec.asc || false;

       console.log("resort: ",spec);
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






