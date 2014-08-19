/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/18/14.
 */
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
            var _key = spec.key|| "primary";

            console.log("resort: ",spec);
            this.data.sort(spec.column.sortBy);

            var rankColumn = this.bundles[_key].layoutColumns.filter(function(d){return d.column instanceof LineUpRankColumn;})
            if (rankColumn.length>0){

                if (spec.column instanceof LayoutStackedColumn){
                    this.assignRanks(
                        this.data,
                        function(d) {
                            return spec.column.getValue(d)
                        },
                        rankColumn[0].column
                    );
                }else{
                    this.assignRanks(
                        this.data,
                        function(d) {
                            return spec.column.column.getValue(d)
                        },
                        rankColumn[0].column
                    );
                }


            }

            if (asc) this.data.reverse();

        },
        /*
         * assigns the ranks to the data which is expected to be sorted in decreasing order
         * */
        assignRanks:function(data, accessor, rankColumn){

            var actualRank =1;
            var actualValue = -1;

            data.forEach(function(row){
                if (actualValue==-1) actualValue = accessor(row);

//                console.log(row, accessor(row));
                if (actualValue!=accessor(row)){
                    actualRank++;
                    actualValue = accessor(row);
                }
//                console.log(row[LineUpGlobal.primaryKey],actualValue,actualRank);
                rankColumn.setValue(row,actualRank);

            })


//            console.log(accessor, rankColumn);
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

            // create Rank Column
//            new LayoutRankColumn();


            this.bundles[_bundle]= {}
            this.bundles[_bundle].layoutColumns = layout[_bundle].map(toLayoutColumn);
            this.bundles[_bundle].layoutColumns.unshift(new LayoutRankColumn())
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
        removeColumn:function(col,bundle){
            var _bundle = bundle || "primary";

            var headerColumns = this.bundles[_bundle].layoutColumns;

            if (col instanceof LayoutStackedColumn){
                var indexOfElement = _.indexOf(headerColumns,col);//function(c){ return (c.id == d.id)});
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

                }

            }else if (col instanceof LayoutSingleColumn){
                if (col.parent==null || col.parent == undefined){
                    headerColumns.splice(headerColumns.indexOf(col),1);
                }else{
                    col.parent.removeChild(col);
                }
            }


        },
        setColumnLabel:function(col,newValue, bundle){
            var _bundle = bundle || "primary";

            //TODO: could be done for all Column header
            var headerColumns = this.bundles[_bundle].layoutColumns;
            headerColumns.filter(function(d){return d.id == col.id;})[0].label= newValue;
        },
       moveColumn:function(column, targetColumn, position, bundle){
           var _bundle = bundle || "primary";

           var headerColumns = this.bundles[_bundle].layoutColumns;

           // different cases:
           if (column.parent==null && targetColumn.parent == null){
               // simple L1 Column movement:

               headerColumns.splice(headerColumns.indexOf(column),1)

               var targetIndex = headerColumns.indexOf(targetColumn);
               if (position == "r"){
                   targetIndex++;
               }
               headerColumns.splice(targetIndex,0,column)
           }
           else if (!(column.parent==null) && targetColumn.parent == null){
                // move from stacked Column
                column.parent.removeChild(column);

               var targetIndex = headerColumns.indexOf(targetColumn);
               if (position == "r"){
                   targetIndex++;
               }
               headerColumns.splice(targetIndex,0,column)

           }else if (column.parent==null && !(targetColumn.parent == null)){

                // move into stacked Column
               if (targetColumn.parent.addChild(column, targetColumn, position)){
                   headerColumns.splice(headerColumns.indexOf(column),1)
               };

           }else if (!(column.parent==null) && !(targetColumn.parent == null)){

                // move from Stacked into stacked Column
               column.parent.removeChild(column);
               targetColumn.parent.addChild(column, targetColumn, position)

           }
         },
        copyColumn:function(column, targetColumn, position, bundle){
            var _bundle = bundle || "primary";

            var headerColumns = this.bundles[_bundle].layoutColumns;

            var newColumn = column.makeCopy();

            // different cases:
            if (targetColumn.parent == null){

                var targetIndex = headerColumns.indexOf(targetColumn);
                if (position == "r"){
                    targetIndex++;
                }
                headerColumns.splice(targetIndex,0,newColumn)
            }
            else if (!(targetColumn.parent == null)){
                   // copy into stacked Column
                targetColumn.parent.addChild(newColumn, targetColumn, position);

            }
        }




    });

///**
// * LineUp Query object to send to a storage instance requesting updates
// * @constructor
// */
//function LineUpQuery(rowRange, columnWeights){
//    this.rowRange=[0,100];
//    this.columnWeights = [];
//    this.ranks =[];
//
//    function getRanks(){
//        return this.ranks;
//    }
//
//
//
//}



