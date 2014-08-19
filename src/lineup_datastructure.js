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
    this.values = d3.map();

}
LineUpRankColumn.prototype = $.extend({},LineUpColumn.prototype, {
        setValue:function(row,d){this.values.set(row[LineUpGlobal.primaryKey],d)},
        getValue:function(row){return this.values.get(row[LineUpGlobal.primaryKey])}

});






/**
 *  --- FROM HERE ON ONLY Layout Columns ---
 */






function LayoutColumn(desc){
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
    },
    description:function(){
        var res = {};
        res.width = this.columnWidth;
        res.columnBundle = this.columnBundle

        return res;
    },
    makeCopy:function(){
        return new LayoutColumn(this.description());
    }
}



function LayoutSingleColumn(desc, rawColumns){
    LayoutColumn.call(this, desc);
    this.columnLink = desc.column;
    var that = this;
    this.column = (desc.column == "")?null:rawColumns.filter(function(d){return d.id == that.columnLink;})[0];
    this.id = _.uniqueId(this.columnLink+"_");
    if (this.column) this.init();
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
    },

    description:function(){
        var res = {};
        res.width = this.columnWidth;
        res.columnBundle = this.columnBundle
        res.column = this.columnLink


        return res;
    },
    makeCopy:function(rawColumns){
        var that = this;
        var description = this.description();
        description.column="";
        var res = new LayoutSingleColumn(description);
        res.columnLink = this.columnLink.slice(0);
        res.column = this.column;
        res.id = _.uniqueId(this.columnLink+"_");

        res.init();
        return res;
    }

})



function LayoutRankColumn(desc, rawColumns){
    LayoutColumn.call(this, desc?desc:{}, []);
    this.columnLink = 'rank';
    this.columnWidth = desc?(desc.width||50):50;
    var that = this;
    this.column = new LineUpRankColumn({column:"rank"});
    this.id = _.uniqueId(this.columnLink+"_");
}


LayoutRankColumn.prototype = $.extend({},LayoutColumn.prototype,{
        getLabel: function () {
            return this.column.label
        },
        getDataID:function(){
            return this.column.id
        },
    description:function(){
        var res = {};
        res.type="rank"
        res.width = this.columnWidth;

        return res;
    },
    makeCopy:function(rawColumns){
        var description = this.description();
        var res = new LayoutRankColumn(description);
        return res;
    }

})





// TODO: maybe remove??
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
    this.emptyColumns =[];
    this.init(desc);
    var that = this;
    this.sortBy=function(a,b){
        var aAll =0;
        var bAll =0;
        that.children.forEach(function(d,i){
            // TODO: How to handle real values vs. normalized Values?
//            aAll+=d.column.getValue(a)*that.childrenWeights[i];
//            bAll+=d.column.getValue(b)*that.childrenWeights[i];
            aAll+=d.getWidth(a);
            bAll+=d.getWidth(b);
        })



//        var aAll = d3.sum(that.children.map(function(d,i){return d.column.getValue(a)*that.childrenWeights[i];}))
//        var bAll = d3.sum(that.children.map(function(d,i){return d.column.getValue(b)*that.childrenWeights[i];}))
        return d3.descending(aAll,bAll)
    }

}

LayoutStackedColumn.prototype = $.extend({},LayoutCompositeColumn.prototype,{

    getValue:function(row){
        // TODO: a caching strategy might work here
        var that = this;
        var all = 0;
        this.children.forEach(function(d,i){
            all+=d.column.getValue(row)*that.childrenWeights[i];
        })
        return all;

    },
    init: function (desc) {
        var that = this;
        if (this.childrenLinks.length <1){
            this.emptyColumns.push(new LayoutEmptyColumn({parent:that}));
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
    flattenMe:function(array, spec){
        var addEmptyColumns = false;
        if (spec){
            addEmptyColumns = spec.addEmptyColumns || false;
        }
        array.push(this);
        this.children.forEach(function(d){ d.flattenMe(array);})

        if (addEmptyColumns){
            this.emptyColumns.forEach(function(d){return d.flattenMe(array);})
        }
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
    },
    removeChild:function(child){
        var indexOfChild = this.children.indexOf(child);
        var that = this;
        this.childrenWeights.splice(indexOfChild,1);
        this.childrenWidths.splice(indexOfChild,1);

        this.columnWidth = d3.sum(this.childrenWidths);
        this.scale.range([0, this.columnWidth]);
        this.scale.domain([0,d3.sum(this.childrenWeights)])


        this.children.splice(indexOfChild,1);
        child.parent=null;
        if (this.children.length<1){
            this.emptyColumns=[new LayoutEmptyColumn({parent:that})]
            this.columnWidth = 100;
        }

    },
    addChild:function(child, targetChild, position){
        if (! (child instanceof LayoutSingleColumn && child.column instanceof LineUpNumberColumn)) return false;

        var targetIndex = 0;
        if (targetChild instanceof LayoutEmptyColumn){
            this.emptyColumns=[];
        }else{
            targetIndex = this.children.indexOf(targetChild);
            if (position=="r") targetIndex++;
        }


        var that = this;
        this.childrenWeights.splice(targetIndex,0,this.scale.invert(child.getColumnWidth()));
        this.childrenWidths.splice(targetIndex,0,child.getColumnWidth());

        this.columnWidth = d3.sum(this.childrenWidths);
        this.scale.range([0, this.columnWidth]);
        this.scale.domain([0,d3.sum(this.childrenWeights)])

        child.parent = this;
        this.children.splice(targetIndex,0,child);

//        console.log("added Child:",this.children[targetIndex]);

        return true;

    },
    description:function(){
        var res = {};
        res.type="stacked";
        res.columnBundle = this.columnBundle
        var that = this;
        res.children =this.children.map(function(d,i){
            return {column: d.columnLink, weight:that.childrenWeights[i]}
        })
        res.width = this.columnWidth;
        res.label = this.label
        return res;
    },
    makeCopy:function(){
        var that = this;
        var description = that.description();
        description.childrenLinks = [];
        var res = new LayoutStackedColumn(description, {}, that.toLayoutColumn);

        res.children = that.children.map(function(d){return d.makeCopy();})
        res.children.forEach(function(d){d.parent=res})
        res.childrenWeights = this.childrenWeights.slice(0);
        res.scale.domain([0, d3.sum(this.childrenWeights)]);
        res.childrenWidths = this.childrenWeights.map(function(d){return that.scale(d);})

        return res;
    }





});


function LayoutEmptyColumn(spec){
    LayoutColumn.call(this, spec, []);
    this.columnLink = 'empty';
    var that = this;
    this.column = {getValue:function(a){return ""}};
    this.id = _.uniqueId(this.columnLink+"_");
    this.label = "{empty}"
    this.columnWidth = 50
}


LayoutEmptyColumn.prototype = $.extend({},LayoutColumn.prototype,{
    getLabel: function () {
        return this.label
    },
    getDataID:function(){
        return this.id
    }

})








