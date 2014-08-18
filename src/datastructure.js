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

    this.scale = d3.scale.linear().range([0,that.columnWidth])

    this.parent = desc.parent; // or null
    this.columnBundle = desc.columnBundle || "primary";
    this.sortBy=function(a,b){
        return d3.descending(that.column.getValue(a), that.column.getValue(b))
    }

}

LayoutColumn.prototype = {
    setColumnWidth: function (newWidth, ignoreParent) {
        var _ignoreParent = ignoreParent || false;
//        console.log("UPdate", newWidth, _ignoreParent);
        this.columnWidth = newWidth;
        this.scale.range([0, newWidth]);
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
    this.init();
}

LayoutSingleColumn.prototype = $.extend({},LayoutColumn.prototype,{

    init:function(){
        if (this.column.hasOwnProperty("scale") && this.column.scale!=null){
            this.scale.domain(this.column.scale.domain());
        }

    },
    // ONLY for numerical columns
    getWidth:function(row){
        return this.scale(this.column.getValue(row));
    },

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
    this.children=[]
    this.init(desc);
    var that = this;
    this.sortBy=function(a,b){
        var aAll =0;
        var bAll =0;
        that.children.forEach(function(d,i){
            aAll+=d.column.getValue(a)*that.childrenWeights[i];
            bAll+=d.column.getValue(b)*that.childrenWeights[i];
        })



//        var aAll = d3.sum(that.children.map(function(d,i){return d.column.getValue(a)*that.childrenWeights[i];}))
//        var bAll = d3.sum(that.children.map(function(d,i){return d.column.getValue(b)*that.childrenWeights[i];}))
        return d3.descending(aAll,bAll)
    }

}

LayoutStackedColumn.prototype = $.extend({},LayoutCompositeColumn.prototype,{

    init: function (desc) {
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

            this.children = this.childrenLinks.map(function (d,i) {
//            console.log(that);
                return that.toLayoutColumn({column: d.column, width:that.childrenWidths[i], parent:that })
            })

        }






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
        this.scale.domain([0,d3.sum(this.childrenWeights)])
    },
    setColumnWidth:function(newWidth){
        var that = this;
        this.columnWidth = newWidth;
        that.scale.range([0, this.columnWidth]);
        this.childrenWidths = this.childrenWeights.map(function(d){return that.scale(d)});
//        console.log(this.childrenWidths, this.childrenWeights);
        this.children.forEach(function(d,i){return d.setColumnWidth(that.childrenWidths[i], true)});
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
    this.layout = layout;

    this.bundles = {
        "primary":{
            layoutColumns:[],
            needsLayout:true  // this triggers the layout generation at first access to "getColumnLayout"
        }
    };


}


LineUpLocalStorage.prototype = $.extend({},{},
    /** @lends LineUpLocalStorage.prototype */
    {

        getRawColumns: function () {
            return this.rawcols;
        },
        getColumnLayout: function(key){
            var _key = key|| "primary";
            if (this.bundles[_key].needsLayout){
                this.generateLayout(this.layout, _key);
                this.bundles[_key].needsLayout = false;
            }

            return this.bundles[_key].layoutColumns;
        },

        /**
         *  get the data
         *  @returns data
         */
        getData: function(){
            return this.data;
        },
        resortData: function(spec){

            var asc = spec.asc || false;

            console.log("resort: ",spec);
            this.data.sort(spec.column.sortBy);
//        this.assignRanks(function (a){return selectedHeader.getValue(a)});

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
        },
        generateLayout:function(layout, bundle){
            var that = this;
            var _bundle = bundle || "primary";

            var layoutColumnTypes = {
                "single": LayoutSingleColumn,
                "stacked": LayoutStackedColumn
            }

            function toLayoutColumn(desc){
                var type = desc.type || "single";
                return new layoutColumnTypes[type](desc,that.rawcols, toLayoutColumn)
            }

            this.bundles[_bundle]= {}
            this.bundles[_bundle].layoutColumns = layout[_bundle].map(toLayoutColumn);
        },
        addStackedColumn:function(spec,bundle){
            var _spec = spec ||{label:"Stacked", children:[]}
            var _bundle = bundle || "primary";

            var that = this;

            //TODO: make less redundant with generateLayout
            var layoutColumnTypes = {
                "single": LayoutSingleColumn,
                "stacked": LayoutStackedColumn
            }

            function toLayoutColumn(desc){
                var type = desc.type || "single";
                return new layoutColumnTypes[type](desc,that.rawcols, toLayoutColumn)
            }


            this.bundles[_bundle].layoutColumns.push(new LayoutStackedColumn(_spec,this.rawcols,toLayoutColumn))

        },
        removeStackedColumn:function(d,bundle){
            var _bundle = bundle || "primary";

            var headerColumns = this.bundles[_bundle].layoutColumns;
            var indexOfElement = _.indexOf(headerColumns,d);//function(c){ return (c.id == d.id)});


            if (indexOfElement!= undefined){
                var addColumns = [];
//                d.children.forEach(function(ch){
//
//                    // if there is NO column of same data type
//                   if (headerColumns.filter(function (hc) {return hc.getDataID() == ch.getDataID()}).length ==0){
//                       ch.parent=null;
//                       addColumns.push(ch);
//                   }
//
//                })

//                headerColumns.splice(indexOfElement,1,addColumns)

                Array.prototype.splice.apply(headerColumns,[indexOfElement,1].concat(addColumns))

                console.log("hc",indexOfElement,headerColumns);

            }


        },
        setColumnLabel:function(col,newValue, bundle){
            var _bundle = bundle || "primary";

            //TODO: could be done for all Column header
            var headerColumns = this.bundles[_bundle].layoutColumns;
            headerColumns.filter(function(d){return d.id == col.id;})[0].label= newValue;
        },
        removeSingleColumn: function(col,bundle){
            var _bundle = bundle || "primary";

            //TODO: could be done for all Column header
            var headerColumns = this.bundles[_bundle].layoutColumns;
            console.log("remove",headerColumns.indexOf(col));
            headerColumns.splice(headerColumns.indexOf(col),1);
            console.log("remove",headerColumns);
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






