/*! lineupjs - v0.5.4 - 2016
* https://github.com/Caleydo/lineup.js
* Copyright (c) 2016 Caleydo Team; Licensed BSD-3-Clause*/

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("d3"));
	else if(typeof define === 'function' && define.amd)
		define(["d3"], factory);
	else if(typeof exports === 'object')
		exports["LineUpJS"] = factory(require("d3"));
	else
		root["LineUpJS"] = factory(root["d3"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_0__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 9);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_0__;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_d3__);
/* harmony export (immutable) */ exports["delayedCall"] = delayedCall;
/* harmony export (immutable) */ exports["forwardEvent"] = forwardEvent;
/* harmony export (binding) */ __webpack_require__.d(exports, "AEventDispatcher", function() { return AEventDispatcher; });
/* harmony export (immutable) */ exports["merge"] = merge;
/* harmony export (immutable) */ exports["offset"] = offset;
/* harmony export (binding) */ __webpack_require__.d(exports, "ContentScroller", function() { return ContentScroller; });
/* harmony export (immutable) */ exports["hasDnDType"] = hasDnDType;
/* harmony export (immutable) */ exports["copyDnD"] = copyDnD;
/* harmony export (immutable) */ exports["updateDropEffect"] = updateDropEffect;
/* harmony export (immutable) */ exports["dropAble"] = dropAble;
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

/**
 * create a delayed call, can be called multiple times but only the last one at most delayed by timeToDelay will be executed
 * @param callback the callback to call
 * @param timeToDelay delay the call in milliseconds
 * @param thisCallback this argument of the callback
 * @return {function(...[any]): undefined} a function that can be called with the same interface as the callback but delayed
 */
function delayedCall(callback, timeToDelay, thisCallback) {
    if (timeToDelay === void 0) { timeToDelay = 100; }
    if (thisCallback === void 0) { thisCallback = this; }
    var tm = -1;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        if (tm >= 0) {
            clearTimeout(tm);
            tm = -1;
        }
        args.unshift(thisCallback === null ? this : thisCallback);
        tm = setTimeout(callback.bind.apply(callback, args), timeToDelay);
    };
}
/**
 * utility for AEventDispatcher to forward an event
 * @param to
 * @param event
 * @return {function(...[any]): undefined}
 */
function forwardEvent(to, event) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        args.unshift(event || this.type);
        to.fire.apply(to, args);
    };
}
/**
 * base class for event dispatching using d3 event mechanism
 */
var AEventDispatcher = (function () {
    function AEventDispatcher() {
        this.forwarder = forwardEvent(this);
        this.listeners = __WEBPACK_IMPORTED_MODULE_0_d3__["dispatch"].apply(void 0, this.createEventList());
    }
    AEventDispatcher.prototype.on = function (type, listener) {
        var _this = this;
        if (arguments.length > 1) {
            if (Array.isArray(type)) {
                type.forEach(function (d) { return _this.listeners.on(d, listener); });
            }
            else {
                this.listeners.on(type, listener);
            }
            return this;
        }
        return this.listeners.on(type);
    };
    /**
     * return the list of events to be able to dispatch
     * @return {Array}
     */
    AEventDispatcher.prototype.createEventList = function () {
        return [];
    };
    AEventDispatcher.prototype.fire = function (type) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var fireImpl = function (t) {
            //local context per event, set a this argument
            var context = {
                source: _this,
                type: t,
                args: args //the arguments to the listener
            };
            _this.listeners[t].apply(context, args);
        };
        if (Array.isArray(type)) {
            type.forEach(fireImpl.bind(this));
        }
        else {
            fireImpl(type);
        }
    };
    /**
     * forwards one or more events from a given dispatcher to the current one
     * i.e. when one of the given events is fired in 'from' it will be forwared to all my listeners
     * @param from the event dispatcher to forward from
     * @param types the event types to forward
     */
    AEventDispatcher.prototype.forward = function (from) {
        var types = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            types[_i - 1] = arguments[_i];
        }
        from.on(types, this.forwarder);
    };
    /**
     * removes the forwarding declarations
     * @param from
     * @param types
     */
    AEventDispatcher.prototype.unforward = function (from) {
        var types = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            types[_i - 1] = arguments[_i];
        }
        from.on(types, null);
    };
    return AEventDispatcher;
}());
var TYPE_OBJECT = '[object Object]';
var TYPE_ARRAY = '[object Array]';
//credits to https://github.com/vladmiller/dextend/blob/master/lib/dextend.js
function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    var result = null;
    for (var i = 0; i < args.length; i++) {
        var toMerge = args[i], keys = Object.keys(toMerge);
        if (result === null) {
            result = toMerge;
            continue;
        }
        for (var j = 0; j < keys.length; j++) {
            var keyName = keys[j];
            var value = toMerge[keyName];
            //merge just POJOs
            if (Object.prototype.toString.call(value) === TYPE_OBJECT && (Object.getPrototypeOf(value) === Object.prototype)) {
                if (result[keyName] === undefined) {
                    result[keyName] = {};
                }
                result[keyName] = merge(result[keyName], value);
            }
            else if (Object.prototype.toString.call(value) === TYPE_ARRAY) {
                if (result[keyName] === undefined) {
                    result[keyName] = [];
                }
                result[keyName] = value.concat(result[keyName]);
            }
            else {
                result[keyName] = value;
            }
        }
    }
    return result;
}
/**
 * computes the absolute offset of the given element
 * @param element
 * @return {{left: number, top: number, width: number, height: number}}
 */
function offset(element) {
    var obj = element.getBoundingClientRect();
    return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: obj.width,
        height: obj.height
    };
}
/**
 * content scroller utility
 *
 * a class for efficiently selecting a range of data items that are currently visible according to the scrolled position
 */
var ContentScroller = (function (_super) {
    __extends(ContentScroller, _super);
    /**
     *
     * @param container the container element wrapping the content with a fixed height for enforcing scrolling
     * @param content the content element to scroll
     * @param options options see attribute
     */
    function ContentScroller(container, content, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        _super.call(this);
        this.container = container;
        this.content = content;
        this.options = {
            /**
             * shift that should be used for calculating the top position
             */
            topShift: function () { return 0; },
            /**
             * backup rows, i.e .the number of rows that should also be shown for avoiding to frequent updates
             */
            backupRows: 5,
            /**
             * the height of one row in pixel
             */
            rowHeight: 10
        };
        this.prevScrollTop = 0;
        this.shift = 0;
        merge(this.options, options);
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_d3__["select"])(container).on('scroll.scroller', function () { return _this.onScroll(); });
        //keep the previous state computing whether a redraw is needed
        this.prevScrollTop = container.scrollTop;
        //total shift to the top
        this.shift = offset(content).top - offset(container).top;
    }
    /**
     * two events are fired:
     *  * scroll when the user scrolls the container
     *  * redraw when a redraw of the content must be performed due to scrolling changes. Note due to backup rows
     *     a scrolling operation might not include a redraw
     *
     * @returns {string[]}
     */
    ContentScroller.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['scroll', 'redraw']);
    };
    ContentScroller.prototype.scrollIntoView = function (start, length, index, row2y) {
        var range = this.select(start, length, row2y);
        if (range.from <= index && index <= range.to) {
            return; //already visible
        }
        var top = this.container.scrollTop - this.shift - this.options.topShift(), bottom = top + this.container.clientHeight, i = 0, j;
        if (top > 0) {
            i = Math.round(top / this.options.rowHeight);
            //count up till really even partial rows are visible
            while (i >= start && row2y(i + 1) > top) {
                i--;
            }
            i -= this.options.backupRows; //one more row as backup for scrolling
        }
        {
            j = Math.round(bottom / this.options.rowHeight);
            //count down till really even partial rows are visible
            while (j <= length && row2y(j - 1) < bottom) {
                j++;
            }
            j += this.options.backupRows; //one more row as backup for scrolling
        }
    };
    /**
     * selects a range identified by start and length and the row2y position callback returning the slice to show according to the current user scrolling position
     * @param start start of the range
     * @param length length of the range
     * @param row2y lookup for computing the y position of a given row
     * @returns {{from: number, to: number}} the slide to show
     */
    ContentScroller.prototype.select = function (start, length, row2y) {
        var top = this.container.scrollTop - this.shift - this.options.topShift(), bottom = top + this.container.clientHeight, i = 0, j;
        /*console.log(window.matchMedia('print').matches, window.matchMedia('screen').matches, top, bottom);
         if (typeof window.matchMedia === 'function' && window.matchMedia('print').matches) {
         console.log('show all');
         return [0, data.length];
         }*/
        if (top > 0) {
            i = Math.round(top / this.options.rowHeight);
            //count up till really even partial rows are visible
            while (i >= start && row2y(i + 1) > top) {
                i--;
            }
            i -= this.options.backupRows; //one more row as backup for scrolling
        }
        {
            j = Math.round(bottom / this.options.rowHeight);
            //count down till really even partial rows are visible
            while (j <= length && row2y(j - 1) < bottom) {
                j++;
            }
            j += this.options.backupRows; //one more row as backup for scrolling
        }
        return {
            from: Math.max(i, start),
            to: Math.min(j, length)
        };
    };
    ContentScroller.prototype.onScroll = function () {
        var top = this.container.scrollTop;
        var left = this.container.scrollLeft;
        //at least one row changed
        //console.log(top, left);
        this.fire('scroll', top, left);
        if (Math.abs(this.prevScrollTop - top) >= this.options.rowHeight * this.options.backupRows) {
            //we scrolled out of our backup rows, so we have to redraw the content
            this.prevScrollTop = top;
            this.fire('redraw');
        }
    };
    /**
     * removes the listeners
     */
    ContentScroller.prototype.destroy = function () {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_d3__["select"])(this.container).on('scroll.scroller', null);
    };
    return ContentScroller;
}(AEventDispatcher));
/**
 * checks whether the given DragEvent has one of the given types
 */
function hasDnDType(e, typesToCheck) {
    var types = e.dataTransfer.types;
    if (typeof types.indexOf === 'function') {
        return typesToCheck.some(function (type) { return types.indexOf(type) >= 0; });
    }
    if (typeof types.includes === 'function') {
        return typesToCheck.some(function (type) { return types.includes(type); });
    }
    if (typeof types.contains === 'function') {
        return typesToCheck.some(function (type) { return types.contains(type); });
    }
    return false;
}
/**
 * should it be a copy dnd operation?
 */
function copyDnD(e) {
    var dT = e.dataTransfer;
    return (e.ctrlKey && dT.effectAllowed.match(/copy/gi) != null) || (dT.effectAllowed.match(/move/gi) == null);
}
/**
 * updates the drop effect according to the currently selected meta keys
 * @param e
 */
function updateDropEffect(e) {
    var dT = e.dataTransfer;
    if (copyDnD(e)) {
        dT.dropEffect = 'copy';
    }
    else {
        dT.dropEffect = 'move';
    }
}
/**
 * returns a d3 callable function to make an element dropable, managed the class css 'drag_over' for hovering effects
 * @param mimeTypes the mime types to be dropable
 * @param onDrop: handler when an element is dropped
 */
function dropAble(mimeTypes, onDrop) {
    return function ($node) {
        $node.on('dragenter', function () {
            var e = __WEBPACK_IMPORTED_MODULE_0_d3__["event"];
            //var xy = mouse($node.node());
            if (hasDnDType(e, mimeTypes)) {
                __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_d3__["select"])(this).classed('drag_over', true);
                //sounds good
                return false;
            }
            //not a valid mime type
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_d3__["select"])(this).classed('drag_over', false);
        }).on('dragover', function () {
            var e = __WEBPACK_IMPORTED_MODULE_0_d3__["event"];
            if (hasDnDType(e, mimeTypes)) {
                e.preventDefault();
                updateDropEffect(e);
                __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_d3__["select"])(this).classed('drag_over', true);
                return false;
            }
        }).on('dragleave', function () {
            //
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_d3__["select"])(this).classed('drag_over', false);
        }).on('drop', function (d) {
            var e = __WEBPACK_IMPORTED_MODULE_0_d3__["event"];
            e.preventDefault();
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_d3__["select"])(this).classed('drag_over', false);
            //var xy = mouse($node.node());
            if (hasDnDType(e, mimeTypes)) {
                var data = {};
                //selects the data contained in the data transfer
                mimeTypes.forEach(function (mime) {
                    var value = e.dataTransfer.getData(mime);
                    if (value !== '') {
                        data[mime] = value;
                    }
                });
                return onDrop(data, d, copyDnD(e));
            }
        });
    };
}


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_d3__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(1);
/* harmony export (binding) */ __webpack_require__.d(exports, "Column", function() { return Column; });
/* harmony export (binding) */ __webpack_require__.d(exports, "ValueColumn", function() { return ValueColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "DummyColumn", function() { return DummyColumn; });
/* harmony export (immutable) */ exports["isNumberColumn"] = isNumberColumn;
/* harmony export (immutable) */ exports["isCategoricalColumn"] = isCategoricalColumn;
/* harmony export (binding) */ __webpack_require__.d(exports, "ScaleMappingFunction", function() { return ScaleMappingFunction; });
/* harmony export (binding) */ __webpack_require__.d(exports, "ScriptMappingFunction", function() { return ScriptMappingFunction; });
/* harmony export (immutable) */ exports["createMappingFunction"] = createMappingFunction;
/* harmony export (binding) */ __webpack_require__.d(exports, "NumberColumn", function() { return NumberColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "StringColumn", function() { return StringColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "LinkColumn", function() { return LinkColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "AnnotateColumn", function() { return AnnotateColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "SelectionColumn", function() { return SelectionColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "BooleanColumn", function() { return BooleanColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "CategoricalColumn", function() { return CategoricalColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "CategoricalNumberColumn", function() { return CategoricalNumberColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "CompositeColumn", function() { return CompositeColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "CompositeNumberColumn", function() { return CompositeNumberColumn; });
/* harmony export (immutable) */ exports["isMultiLevelColumn"] = isMultiLevelColumn;
/* harmony export (binding) */ __webpack_require__.d(exports, "StackColumn", function() { return StackColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "MaxColumn", function() { return MaxColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "MinColumn", function() { return MinColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "MeanColumn", function() { return MeanColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "MultiLevelCompositeColumn", function() { return MultiLevelCompositeColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "NestedColumn", function() { return NestedColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "ScriptColumn", function() { return ScriptColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "RankColumn", function() { return RankColumn; });
/* harmony export (binding) */ __webpack_require__.d(exports, "Ranking", function() { return Ranking; });
/* harmony export (immutable) */ exports["defineColumn"] = defineColumn;
/* harmony export (binding) */ __webpack_require__.d(exports, "createStackDesc", function() { return createStackDesc; });
/* harmony export (binding) */ __webpack_require__.d(exports, "createRankDesc", function() { return createRankDesc; });
/* harmony export (binding) */ __webpack_require__.d(exports, "createSelectionDesc", function() { return createSelectionDesc; });
/* harmony export (binding) */ __webpack_require__.d(exports, "createMinDesc", function() { return createMinDesc; });
/* harmony export (binding) */ __webpack_require__.d(exports, "createMaxDesc", function() { return createMaxDesc; });
/* harmony export (binding) */ __webpack_require__.d(exports, "createMeanDesc", function() { return createMeanDesc; });
/* harmony export (binding) */ __webpack_require__.d(exports, "createNestedDesc", function() { return createNestedDesc; });
/* harmony export (binding) */ __webpack_require__.d(exports, "createScriptDesc", function() { return createScriptDesc; });
/* harmony export (immutable) */ exports["createActionDesc"] = createActionDesc;
/* harmony export (immutable) */ exports["models"] = models;
/**
 * Created by Samuel Gratzl on 06.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};


/**
 * converts a given id to css compatible one
 * @param id
 * @return {string|void}
 */
function fixCSS(id) {
    return id.replace(/[\s!#$%&'\(\)\*\+,\.\/:;<=>\?@\[\\\]\^`\{\|}~]/g, '_'); //replace non css stuff to _
}
/**
 * save number comparison
 * @param a
 * @param b
 * @return {number}
 */
function numberCompare(a, b) {
    if (a === b || (isNaN(a) && isNaN(b))) {
        return 0;
    }
    return a - b;
}
/**
 * a column in LineUp
 */
var Column = (function (_super) {
    __extends(Column, _super);
    function Column(id, desc) {
        _super.call(this);
        this.desc = desc;
        /**
         * width of the column
         * @type {number}
         * @private
         */
        this.width = 100;
        this.parent = null;
        /**
         * whether this column is compressed i.e. just shown in a minimal version
         * @type {boolean}
         * @private
         */
        this.compressed = false;
        this.id = fixCSS(id);
        this.label = this.desc.label || this.id;
        this.description = this.desc.description || '';
        this.cssClass = this.desc.cssClass || '';
        this.color = this.desc.color || (this.cssClass !== '' ? null : Column.DEFAULT_COLOR);
    }
    Object.defineProperty(Column.prototype, "headerCssClass", {
        get: function () {
            return this.desc.type;
        },
        enumerable: true,
        configurable: true
    });
    Column.prototype.assignNewId = function (idGenerator) {
        this.id = fixCSS(idGenerator());
    };
    Column.prototype.init = function (callback) {
        return Promise.resolve(true);
    };
    Object.defineProperty(Column.prototype, "fqid", {
        /**
         * returns the fully qualified id i.e. path the parent
         * @returns {string}
         */
        get: function () {
            return this.parent ? this.parent.fqid + '_' + this.id : this.id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Column.prototype, "fqpath", {
        get: function () {
            return this.parent ? this.parent.fqpath + '@' + this.parent.indexOf(this) : '';
        },
        enumerable: true,
        configurable: true
    });
    /**
     * fires:
     *  * widthChanged
     *  * filterChanged
     *  * labelChanged
     *  * metaDataChanged
     *  * compressChanged
     *  * addColumn, removeColumn ... for composite pattern
     *  * dirty, dirtyHeader, dirtyValues
     * @returns {string[]}
     */
    Column.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['widthChanged', 'filterChanged', 'labelChanged', 'metaDataChanged', 'compressChanged', 'addColumn', 'removeColumn', 'dirty', 'dirtyHeader', 'dirtyValues']);
    };
    Column.prototype.getWidth = function () {
        return this.width;
    };
    Column.prototype.isHidden = function () {
        return this.width <= 0;
    };
    Column.prototype.setCompressed = function (value) {
        if (this.compressed === value) {
            return;
        }
        this.fire(['compressChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.compressed, this.compressed = value);
    };
    Column.prototype.getCompressed = function () {
        return this.compressed;
    };
    /**
     * visitor pattern for flattening the columns
     * @param r the result array
     * @param offset left offeset
     * @param levelsToGo how many levels down
     * @param padding padding between columns
     * @returns {number} the used width by this column
     */
    Column.prototype.flatten = function (r, offset, levelsToGo, padding) {
        if (levelsToGo === void 0) { levelsToGo = 0; }
        if (padding === void 0) { padding = 0; }
        var w = this.compressed ? Column.COMPRESSED_WIDTH : this.getWidth();
        r.push({ col: this, offset: offset, width: w });
        return w;
    };
    Column.prototype.setWidth = function (value) {
        if (this.width === value) {
            return;
        }
        this.fire(['widthChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.width, this.width = value);
    };
    Column.prototype.setWidthImpl = function (value) {
        this.width = value;
    };
    Column.prototype.setMetaData = function (value) {
        if (value.label === this.label && this.color === value.color && this.description === value.description) {
            return;
        }
        var events = this.color === value.color ? ['labelChanged', 'metaDataChanged', 'dirtyHeader', 'dirty'] : ['labelChanged', 'metaDataChanged', 'dirtyHeader', 'dirtyValues', 'dirty'];
        this.fire(events, this.getMetaData(), {
            label: this.label = value.label,
            color: this.color = value.color,
            description: this.description = value.description
        });
    };
    Column.prototype.getMetaData = function () {
        return {
            label: this.label,
            color: this.color,
            description: this.description
        };
    };
    /**
     * triggers that the ranking is sorted by this column
     * @param ascending
     * @returns {any}
     */
    Column.prototype.sortByMe = function (ascending) {
        if (ascending === void 0) { ascending = false; }
        var r = this.findMyRanker();
        if (r) {
            return r.sortBy(this, ascending);
        }
        return false;
    };
    /**
     * toggles the sorting order of this column in the ranking
     * @returns {any}
     */
    Column.prototype.toggleMySorting = function () {
        var r = this.findMyRanker();
        if (r) {
            return r.toggleSorting(this);
        }
        return false;
    };
    /**
     * removes the column from the ranking
     * @returns {boolean}
     */
    Column.prototype.removeMe = function () {
        if (this.parent) {
            return this.parent.remove(this);
        }
        return false;
    };
    /**
     * inserts the given column after itself
     * @param col
     * @returns {boolean}
     */
    Column.prototype.insertAfterMe = function (col) {
        if (this.parent) {
            return this.parent.insertAfter(col, this) != null;
        }
        return false;
    };
    /**
     * finds the underlying ranking column
     * @returns {Ranking}
     */
    Column.prototype.findMyRanker = function () {
        if (this.parent) {
            return this.parent.findMyRanker();
        }
        return null;
    };
    /**
     * dumps this column to JSON compatible format
     * @param toDescRef
     * @returns {any}
     */
    Column.prototype.dump = function (toDescRef) {
        var r = {
            id: this.id,
            desc: toDescRef(this.desc),
            width: this.width,
            compressed: this.compressed
        };
        if (this.label !== (this.desc.label || this.id)) {
            r.label = this.label;
        }
        if (this.color !== (this.desc.color || Column.DEFAULT_COLOR) && this.color) {
            r.color = this.color;
        }
        return r;
    };
    /**
     * restore the column content from a dump
     * @param dump
     * @param factory
     */
    Column.prototype.restore = function (dump, factory) {
        this.width = dump.width || this.width;
        this.label = dump.label || this.label;
        this.color = dump.color || this.color;
        this.compressed = dump.compressed === true;
    };
    /**
     * return the label of a given row for the current column
     * @param row
     * @return {string}
     */
    Column.prototype.getLabel = function (row) {
        return '' + this.getValue(row);
    };
    /**
     * return the value of a given row for the current column
     * @param row
     * @return
     */
    Column.prototype.getValue = function (row) {
        return ''; //no value
    };
    /**
     * compare function used to determine the order according to the values of the current column
     * @param a
     * @param b
     * @return {number}
     */
    Column.prototype.compare = function (a, b) {
        return 0; //can't compare
    };
    /**
     * flag whether any filter is applied
     * @return {boolean}
     */
    Column.prototype.isFiltered = function () {
        return false;
    };
    /**
     * predicate whether the current row should be included
     * @param row
     * @return {boolean}
     */
    Column.prototype.filter = function (row) {
        return row !== null;
    };
    /**
     * default color that should be used
     * @type {string}
     */
    Column.DEFAULT_COLOR = '#C1C1C1';
    /**
     * magic variable for showing all columns
     * @type {number}
     */
    Column.FLAT_ALL_COLUMNS = -1;
    /**
     * width of a compressed column
     * @type {number}
     */
    Column.COMPRESSED_WIDTH = 16;
    return Column;
}(__WEBPACK_IMPORTED_MODULE_1__utils__["AEventDispatcher"]));
/**
 * a column having an accessor to get the cell value
 */
var ValueColumn = (function (_super) {
    __extends(ValueColumn, _super);
    function ValueColumn(id, desc) {
        _super.call(this, id, desc);
        //find accessor
        this.accessor = desc.accessor || (function () { return null; });
    }
    ValueColumn.prototype.getLabel = function (row) {
        return '' + this.getValue(row);
    };
    ValueColumn.prototype.getValue = function (row) {
        return this.accessor(row, this.id, this.desc, this.findMyRanker());
    };
    ValueColumn.prototype.compare = function (a, b) {
        return 0; //can't compare
    };
    return ValueColumn;
}(Column));
/**
 * a default column with no values
 */
var DummyColumn = (function (_super) {
    __extends(DummyColumn, _super);
    function DummyColumn(id, desc) {
        _super.call(this, id, desc);
    }
    DummyColumn.prototype.getLabel = function (row) {
        return '';
    };
    DummyColumn.prototype.getValue = function (row) {
        return '';
    };
    DummyColumn.prototype.compare = function (a, b) {
        return 0; //can't compare
    };
    return DummyColumn;
}(Column));
/**
 * checks whether the given column or description is a number column, i.e. the value is a number
 * @param col
 * @returns {boolean}
 */
function isNumberColumn(col) {
    return (col instanceof Column && typeof col.getNumber === 'function' || (!(col instanceof Column) && col.type.match(/(number|stack|ordinal)/) != null));
}
/**
 * checks whether the given column or description is a categorical column, i.e. the value is a list of categories
 * @param col
 * @returns {boolean}
 */
function isCategoricalColumn(col) {
    return (col instanceof Column && typeof col.getCategories === 'function' || (!(col instanceof Column) && col.type.match(/(categorical|ordinal)/) != null));
}
function toScale(type) {
    if (type === void 0) { type = 'linear'; }
    switch (type) {
        case 'log':
            return __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].log().clamp(true);
        case 'sqrt':
            return __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].sqrt().clamp(true);
        case 'pow1.1':
            return __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].pow().exponent(1.1).clamp(true);
        case 'pow2':
            return __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].pow().exponent(2).clamp(true);
        case 'pow3':
            return __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].pow().exponent(3).clamp(true);
        default:
            return __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].linear().clamp(true);
    }
}
function isSame(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    return a.every(function (ai, i) { return ai === b[i]; });
}
function fixDomain(domain, type) {
    if (type === 'log' && domain[0] === 0) {
        domain[0] = 0.0000001; //0 is bad
    }
    return domain;
}
/**
 * a mapping function based on a d3 scale (linear, sqrt, log)
 */
var ScaleMappingFunction = (function () {
    function ScaleMappingFunction(domain, type, range) {
        if (domain === void 0) { domain = [0, 1]; }
        if (type === void 0) { type = 'linear'; }
        if (range === void 0) { range = [0, 1]; }
        this.type = type;
        this.s = toScale(type).domain(fixDomain(domain, this.type)).range(range);
    }
    Object.defineProperty(ScaleMappingFunction.prototype, "domain", {
        get: function () {
            return this.s.domain();
        },
        set: function (domain) {
            this.s.domain(fixDomain(domain, this.type));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScaleMappingFunction.prototype, "range", {
        get: function () {
            return this.s.range();
        },
        set: function (range) {
            this.s.range(range);
        },
        enumerable: true,
        configurable: true
    });
    ScaleMappingFunction.prototype.apply = function (v) {
        return this.s(v);
    };
    Object.defineProperty(ScaleMappingFunction.prototype, "scaleType", {
        get: function () {
            return this.type;
        },
        enumerable: true,
        configurable: true
    });
    ScaleMappingFunction.prototype.dump = function () {
        return {
            type: this.type,
            domain: this.domain,
            range: this.range
        };
    };
    ScaleMappingFunction.prototype.eq = function (other) {
        if (!(other instanceof ScaleMappingFunction)) {
            return false;
        }
        var that = other;
        return that.type === this.type && isSame(this.domain, that.domain) && isSame(this.range, that.range);
    };
    ScaleMappingFunction.prototype.restore = function (dump) {
        this.type = dump.type;
        this.s = toScale(dump.type).domain(dump.domain).range(dump.range);
    };
    ScaleMappingFunction.prototype.clone = function () {
        return new ScaleMappingFunction(this.domain, this.type, this.range);
    };
    return ScaleMappingFunction;
}());
/**
 * a mapping function based on a custom user function using 'value' as the current value
 */
var ScriptMappingFunction = (function () {
    function ScriptMappingFunction(domain_, code_) {
        if (domain_ === void 0) { domain_ = [0, 1]; }
        if (code_ === void 0) { code_ = 'return this.linear(value,this.value_min,this.value_max);'; }
        this.domain_ = domain_;
        this.code_ = code_;
        this.f = new Function('value', code_);
    }
    Object.defineProperty(ScriptMappingFunction.prototype, "domain", {
        get: function () {
            return this.domain_;
        },
        set: function (domain) {
            this.domain_ = domain;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScriptMappingFunction.prototype, "code", {
        get: function () {
            return this.code_;
        },
        set: function (code) {
            if (this.code_ === code) {
                return;
            }
            this.code_ = code;
            this.f = new Function('value', code);
        },
        enumerable: true,
        configurable: true
    });
    ScriptMappingFunction.prototype.apply = function (v) {
        var min = this.domain_[0], max = this.domain_[this.domain_.length - 1];
        var r = this.f.call({
            value_min: min,
            value_max: max,
            value_range: max - min,
            value_domain: this.domain_.slice(),
            linear: function (v, mi, ma) { return (v - mi) / (ma - mi); }
        }, v);
        if (typeof r === 'number') {
            return Math.max(Math.min(r, 1), 0);
        }
        return NaN;
    };
    ScriptMappingFunction.prototype.dump = function () {
        return {
            type: 'script',
            code: this.code
        };
    };
    ScriptMappingFunction.prototype.eq = function (other) {
        if (!(other instanceof ScriptMappingFunction)) {
            return false;
        }
        var that = other;
        return that.code === this.code;
    };
    ScriptMappingFunction.prototype.restore = function (dump) {
        this.code = dump.code;
    };
    ScriptMappingFunction.prototype.clone = function () {
        return new ScriptMappingFunction(this.domain, this.code);
    };
    return ScriptMappingFunction;
}());
function createMappingFunction(dump) {
    if (dump.type === 'script') {
        var s = new ScriptMappingFunction();
        s.restore(dump);
        return s;
    }
    else {
        var l = new ScaleMappingFunction();
        l.restore(dump);
        return l;
    }
}
/**
 * a number column mapped from an original input scale to an output range
 */
var NumberColumn = (function (_super) {
    __extends(NumberColumn, _super);
    function NumberColumn(id, desc) {
        _super.call(this, id, desc);
        this.missingValue = 0;
        /**
         * currently active filter
         * @type {{min: number, max: number}}
         * @private
         */
        this.currentFilter = { min: -Infinity, max: Infinity };
        this.numberFormat = __WEBPACK_IMPORTED_MODULE_0_d3__["format"]('.3n');
        if (desc.map) {
            this.mapping = createMappingFunction(desc.map);
        }
        else if (desc.domain) {
            this.mapping = new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0, 1]);
        }
        this.original = this.mapping.clone();
        if (desc.numberFormat) {
            this.numberFormat = __WEBPACK_IMPORTED_MODULE_0_d3__["format"](desc.numberFormat);
        }
    }
    NumberColumn.prototype.init = function (callback) {
        var _this = this;
        var d = this.mapping.domain;
        //if any of the values is not given use the statistics to compute them
        if (isNaN(d[0]) || isNaN(d[1])) {
            return callback(this.desc).then(function (stats) {
                _this.mapping.domain = [stats.min, stats.max];
                _this.original.domain = [stats.min, stats.max];
                return true;
            });
        }
        return Promise.resolve(true);
    };
    NumberColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.map = this.mapping.dump();
        r.filter = this.currentFilter;
        r.missingValue = this.missingValue;
        return r;
    };
    NumberColumn.prototype.restore = function (dump, factory) {
        _super.prototype.restore.call(this, dump, factory);
        if (dump.map) {
            this.mapping = createMappingFunction(dump.map);
        }
        else if (dump.domain) {
            this.mapping = new ScaleMappingFunction(dump.domain, 'linear', dump.range || [0, 1]);
        }
        if (dump.currentFilter) {
            this.currentFilter = dump.currentFilter;
        }
        if (dump.missingValue) {
            this.missingValue = dump.missingValue;
        }
        if (dump.numberFormat) {
            this.numberFormat = __WEBPACK_IMPORTED_MODULE_0_d3__["format"](dump.numberFormat);
        }
    };
    NumberColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['mappingChanged']);
    };
    NumberColumn.prototype.getLabel = function (row) {
        //if a dedicated format and a number use the formatter in any case
        if (this.desc.numberFormat) {
            return this.numberFormat(this.getRawValue(row));
        }
        var v = _super.prototype.getValue.call(this, row);
        //keep non number if it is not a number else convert using formatter
        return '' + (typeof v === 'number' ? this.numberFormat(+v) : v);
    };
    NumberColumn.prototype.getRawValue = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        if (typeof (v) === 'undefined' || v == null || isNaN(v) || v === '' || v === 'NA' || (typeof (v) === 'string' && (v.toLowerCase() === 'na'))) {
            return this.missingValue;
        }
        return +v;
    };
    NumberColumn.prototype.getValue = function (row) {
        var v = this.getRawValue(row);
        if (isNaN(v)) {
            return v;
        }
        return this.mapping.apply(v);
    };
    NumberColumn.prototype.getNumber = function (row) {
        return this.getValue(row);
    };
    NumberColumn.prototype.compare = function (a, b) {
        return numberCompare(this.getValue(a), this.getValue(b));
    };
    NumberColumn.prototype.getOriginalMapping = function () {
        return this.original.clone();
    };
    NumberColumn.prototype.getMapping = function () {
        return this.mapping.clone();
    };
    NumberColumn.prototype.setMapping = function (mapping) {
        if (this.mapping.eq(mapping)) {
            return;
        }
        this.fire(['mappingChanged', 'dirtyValues', 'dirty'], this.mapping.clone(), this.mapping = mapping);
    };
    NumberColumn.prototype.isFiltered = function () {
        return isFinite(this.currentFilter.min) || isFinite(this.currentFilter.max);
    };
    Object.defineProperty(NumberColumn.prototype, "filterMin", {
        get: function () {
            return this.currentFilter.min;
        },
        set: function (min) {
            var bak = { min: this.currentFilter.min, max: this.currentFilter.max };
            this.currentFilter.min = isNaN(min) ? -Infinity : min;
            this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.currentFilter);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NumberColumn.prototype, "filterMax", {
        get: function () {
            return this.currentFilter.max;
        },
        set: function (max) {
            var bak = { min: this.currentFilter.min, max: this.currentFilter.max };
            this.currentFilter.max = isNaN(max) ? Infinity : max;
            this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.currentFilter);
        },
        enumerable: true,
        configurable: true
    });
    NumberColumn.prototype.getFilter = function () {
        return {
            min: this.currentFilter.min,
            max: this.currentFilter.max
        };
    };
    NumberColumn.prototype.setFilter = function (value) {
        if (value === void 0) { value = { min: -Infinity, max: +Infinity }; }
        if (this.currentFilter.min === value.min && this.currentFilter.max === value.max) {
            return;
        }
        var bak = this.getFilter();
        this.currentFilter.min = isNaN(value.min) ? -Infinity : value.min;
        this.currentFilter.max = isNaN(value.max) ? Infinity : value.max;
        this.fire(['filterChanged', 'dirtyValues', 'dirty'], bak, this.currentFilter);
    };
    /**
     * filter the current row if any filter is set
     * @param row
     * @returns {boolean}
     */
    NumberColumn.prototype.filter = function (row) {
        if (!this.isFiltered()) {
            return true;
        }
        var v = this.getRawValue(row);
        if (isNaN(v)) {
            return true;
        }
        return !((isFinite(this.currentFilter.min) && v < this.currentFilter.min) || (isFinite(this.currentFilter.max) && v > this.currentFilter.max));
    };
    return NumberColumn;
}(ValueColumn));
/**
 * a string column with optional alignment
 */
var StringColumn = (function (_super) {
    __extends(StringColumn, _super);
    function StringColumn(id, desc) {
        _super.call(this, id, desc);
        this.currentFilter = null;
        this._alignment = 'left';
        this.setWidthImpl(200); //by default 200
        this._alignment = desc.alignment || 'left';
    }
    Object.defineProperty(StringColumn.prototype, "alignment", {
        //readonly
        get: function () {
            return this._alignment;
        },
        enumerable: true,
        configurable: true
    });
    StringColumn.prototype.getValue = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        if (typeof (v) === 'undefined' || v == null) {
            return '';
        }
        return String(v);
    };
    StringColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        if (this.currentFilter instanceof RegExp) {
            r.filter = 'REGEX:' + this.currentFilter.source;
        }
        else {
            r.filter = this.currentFilter;
        }
        r.alignment = this.alignment;
        return r;
    };
    StringColumn.prototype.restore = function (dump, factory) {
        _super.prototype.restore.call(this, dump, factory);
        if (dump.filter && dump.filter.slice(0, 6) === 'REGEX:') {
            this.currentFilter = new RegExp(dump.filter.slice(6));
        }
        else {
            this.currentFilter = dump.filter || null;
        }
        this._alignment = dump.alignment || this._alignment;
    };
    StringColumn.prototype.isFiltered = function () {
        return this.currentFilter != null;
    };
    StringColumn.prototype.filter = function (row) {
        if (!this.isFiltered()) {
            return true;
        }
        var r = this.getLabel(row), filter = this.currentFilter;
        if (filter === StringColumn.FILTER_MISSING) {
            return r != null && r.trim() !== '';
        }
        if (typeof filter === 'string' && filter.length > 0) {
            return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
        }
        if (filter instanceof RegExp) {
            return r && filter.test(r);
        }
        return true;
    };
    StringColumn.prototype.getFilter = function () {
        return this.currentFilter;
    };
    StringColumn.prototype.setFilter = function (filter) {
        if (filter === '') {
            filter = null;
        }
        if (this.currentFilter === filter) {
            return;
        }
        this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.currentFilter, this.currentFilter = filter);
    };
    StringColumn.prototype.compare = function (a, b) {
        var a_val, b_val;
        if ((a_val = this.getValue(a)) === '') {
            return this.getValue(b) === '' ? 0 : +1; //same = 0
        }
        else if ((b_val = this.getValue(b)) === '') {
            return -1;
        }
        return a_val.localeCompare(b_val);
    };
    //magic key for filtering missing ones
    StringColumn.FILTER_MISSING = '__FILTER_MISSING';
    return StringColumn;
}(ValueColumn));
/**
 * a string column in which the label is a text but the value a link
 */
var LinkColumn = (function (_super) {
    __extends(LinkColumn, _super);
    function LinkColumn(id, desc) {
        _super.call(this, id, desc);
        /**
         * a pattern used for generating the link, $1 is replaced with the actual value
         * @type {null}
         */
        this.link = null;
        this.link = desc.link;
    }
    Object.defineProperty(LinkColumn.prototype, "headerCssClass", {
        get: function () {
            return this.link == null ? 'link' : 'link link_pattern';
        },
        enumerable: true,
        configurable: true
    });
    LinkColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['linkChanged']);
    };
    LinkColumn.prototype.setLink = function (link) {
        /* tslint:disable */
        if (link == this.link) {
            return;
        }
        /* tslint:enable */
        this.fire(['linkChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.link, this.link = link);
    };
    LinkColumn.prototype.getLink = function () {
        return this.link || '';
    };
    LinkColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        /* tslint:disable */
        if (this.link != this.desc.link) {
            r.link = this.link;
        }
        /* tslint:enable */
        return r;
    };
    LinkColumn.prototype.restore = function (dump, factory) {
        _super.prototype.restore.call(this, dump, factory);
        if (dump.link) {
            this.link = dump.link;
        }
    };
    LinkColumn.prototype.getLabel = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        if (v.alt) {
            return v.alt;
        }
        return '' + v;
    };
    LinkColumn.prototype.isLink = function (row) {
        if (this.link) {
            return true;
        }
        //get original value
        var v = _super.prototype.getValue.call(this, row);
        //convert to link
        return v.href != null;
    };
    LinkColumn.prototype.getValue = function (row) {
        //get original value
        var v = _super.prototype.getValue.call(this, row);
        //convert to link
        if (v.href) {
            return v.href;
        }
        else if (this.link) {
            return this.link.replace(/\$1/g, v);
        }
        return v;
    };
    return LinkColumn;
}(StringColumn));
/**
 * a string column in which the values can be edited locally
 */
var AnnotateColumn = (function (_super) {
    __extends(AnnotateColumn, _super);
    function AnnotateColumn(id, desc) {
        _super.call(this, id, desc);
        this.annotations = __WEBPACK_IMPORTED_MODULE_0_d3__["map"]();
    }
    AnnotateColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['valueChanged']);
    };
    AnnotateColumn.prototype.getValue = function (row) {
        var index = String(row._index);
        if (this.annotations.has(index)) {
            return this.annotations.get(index);
        }
        return _super.prototype.getValue.call(this, row);
    };
    AnnotateColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.annotations = {};
        this.annotations.forEach(function (k, v) {
            r.annotations[k] = v;
        });
        return r;
    };
    AnnotateColumn.prototype.restore = function (dump, factory) {
        var _this = this;
        _super.prototype.restore.call(this, dump, factory);
        if (dump.annotations) {
            Object.keys(dump.annotations).forEach(function (k) {
                _this.annotations.set(k, dump.annotations[k]);
            });
        }
    };
    AnnotateColumn.prototype.setValue = function (row, value) {
        var old = this.getValue(row);
        if (old === value) {
            return true;
        }
        if (value === '' || value == null) {
            this.annotations.remove(String(row._index));
        }
        else {
            this.annotations.set(String(row._index), value);
        }
        this.fire(['valueChanged', 'dirtyValues', 'dirty'], row._index, old, value);
        return true;
    };
    return AnnotateColumn;
}(StringColumn));
function arrayEquals(a, b) {
    var al = a != null ? a.length : 0;
    var bl = b != null ? b.length : 0;
    if (al !== bl) {
        return false;
    }
    if (al === 0) {
        return true;
    }
    return a.every(function (ai, i) { return ai === b[i]; });
}
/**
 * a checkbox column for selections
 */
var SelectionColumn = (function (_super) {
    __extends(SelectionColumn, _super);
    function SelectionColumn(id, desc) {
        _super.call(this, id, desc);
        this.setCompressed(true);
    }
    /**
     * factory for creating a description creating a rank column
     * @param label
     * @returns {{type: string, label: string}}
     */
    SelectionColumn.desc = function (label) {
        if (label === void 0) { label = 'S'; }
        return { type: 'selection', label: label };
    };
    SelectionColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['select']);
    };
    SelectionColumn.prototype.setValue = function (row, value) {
        var old = this.getValue(row);
        if (old === value) {
            return true;
        }
        return this.setImpl(row, value);
    };
    SelectionColumn.prototype.setImpl = function (row, value) {
        if (this.desc.setter) {
            this.desc.setter(row, value);
        }
        this.fire('select', row, value);
        return true;
    };
    SelectionColumn.prototype.toggleValue = function (row) {
        var old = this.getValue(row);
        this.setImpl(row, !old);
        return !old;
    };
    SelectionColumn.prototype.compare = function (a, b) {
        return __WEBPACK_IMPORTED_MODULE_0_d3__["ascending"](this.getValue(a), this.getValue(b));
    };
    return SelectionColumn;
}(ValueColumn));
/**
 * a string column with optional alignment
 */
var BooleanColumn = (function (_super) {
    __extends(BooleanColumn, _super);
    function BooleanColumn(id, desc) {
        _super.call(this, id, desc);
        this.currentFilter = null;
        this.trueMarker = 'X';
        this.falseMarker = '';
        this.setWidthImpl(30);
        this.trueMarker = desc.trueMarker || this.trueMarker;
        this.falseMarker = desc.falseMarker || this.falseMarker;
    }
    BooleanColumn.prototype.getValue = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        if (typeof (v) === 'undefined' || v == null) {
            return false;
        }
        return v === true || v === 'true' || v === 'yes' || v === 'x';
    };
    BooleanColumn.prototype.getLabel = function (row) {
        var v = this.getValue(row);
        return v ? this.trueMarker : this.falseMarker;
    };
    BooleanColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        if (this.currentFilter !== null) {
            r.filter = this.currentFilter;
        }
        return r;
    };
    BooleanColumn.prototype.restore = function (dump, factory) {
        _super.prototype.restore.call(this, dump, factory);
        if (typeof dump.filter !== 'undefined') {
            this.currentFilter = dump.filter;
        }
    };
    BooleanColumn.prototype.isFiltered = function () {
        return this.currentFilter !== null;
    };
    BooleanColumn.prototype.filter = function (row) {
        if (!this.isFiltered()) {
            return true;
        }
        var r = this.getValue(row);
        return r === this.currentFilter;
    };
    BooleanColumn.prototype.getFilter = function () {
        return this.currentFilter;
    };
    BooleanColumn.prototype.setFilter = function (filter) {
        if (this.currentFilter === filter) {
            return;
        }
        this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.currentFilter, this.currentFilter = filter);
    };
    BooleanColumn.prototype.compare = function (a, b) {
        return __WEBPACK_IMPORTED_MODULE_0_d3__["ascending"](this.getValue(a), this.getValue(b));
    };
    return BooleanColumn;
}(ValueColumn));
/**
 * column for categorical values
 */
var CategoricalColumn = (function (_super) {
    __extends(CategoricalColumn, _super);
    function CategoricalColumn(id, desc) {
        _super.call(this, id, desc);
        /**
         * colors for each category
         * @type {Ordinal<string, string>}
         */
        this.colors = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].category10();
        /**
         * category labels by default the category name itself
         * @type {Array}
         */
        this.catLabels = __WEBPACK_IMPORTED_MODULE_0_d3__["map"]();
        /**
         * set of categories to show
         * @type {null}
         * @private
         */
        this.currentFilter = null;
        /**
         * split multiple categories
         * @type {string}
         */
        this.separator = ';';
        this.separator = desc.separator || this.separator;
        this.initCategories(desc);
        //TODO infer categories from data
    }
    CategoricalColumn.prototype.initCategories = function (desc) {
        if (desc.categories) {
            var cats = [], cols = this.colors.range(), labels = __WEBPACK_IMPORTED_MODULE_0_d3__["map"]();
            desc.categories.forEach(function (cat, i) {
                if (typeof cat === 'string') {
                    //just the category value
                    cats.push(cat);
                }
                else {
                    //the name or value of the category
                    cats.push(cat.name || cat.value);
                    //optional label mapping
                    if (cat.label) {
                        labels.set(cat.name, cat.label);
                    }
                    //optional color
                    if (cat.color) {
                        cols[i] = cat.color;
                    }
                }
            });
            this.catLabels = labels;
            this.colors.domain(cats).range(cols);
        }
    };
    Object.defineProperty(CategoricalColumn.prototype, "categories", {
        get: function () {
            return this.colors.domain();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CategoricalColumn.prototype, "categoryColors", {
        get: function () {
            return this.colors.range();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CategoricalColumn.prototype, "categoryLabels", {
        get: function () {
            var _this = this;
            //no mapping
            if (this.catLabels === null || this.catLabels.empty()) {
                return this.categories;
            }
            //label or identity mapping
            return this.categories.map(function (c) { return _this.catLabels.has(c) ? _this.catLabels.get(c) : c; });
        },
        enumerable: true,
        configurable: true
    });
    CategoricalColumn.prototype.colorOf = function (cat) {
        return this.colors(cat);
    };
    CategoricalColumn.prototype.getLabel = function (row) {
        //no mapping
        if (this.catLabels === null || this.catLabels.empty()) {
            return '' + StringColumn.prototype.getValue.call(this, row);
        }
        return this.getLabels(row).join(this.separator);
    };
    CategoricalColumn.prototype.getFirstLabel = function (row) {
        var l = this.getLabels(row);
        return l.length > 0 ? l[0] : null;
    };
    CategoricalColumn.prototype.getLabels = function (row) {
        var _this = this;
        var v = StringColumn.prototype.getValue.call(this, row);
        var r = v ? v.split(this.separator) : [];
        var mapToLabel = function (values) {
            if (_this.catLabels === null || _this.catLabels.empty()) {
                return values;
            }
            return values.map(function (v) { return _this.catLabels.has(v) ? _this.catLabels.get(v) : v; });
        };
        return mapToLabel(r);
    };
    CategoricalColumn.prototype.getValue = function (row) {
        var r = this.getValues(row);
        return r.length > 0 ? r[0] : null;
    };
    CategoricalColumn.prototype.getValues = function (row) {
        var v = StringColumn.prototype.getValue.call(this, row);
        var r = v ? v.split(this.separator) : [];
        return r;
    };
    CategoricalColumn.prototype.getCategories = function (row) {
        return this.getValues(row);
    };
    CategoricalColumn.prototype.getColor = function (row) {
        var cat = this.getValue(row);
        if (cat === null || cat === '') {
            return null;
        }
        return this.colors(cat);
    };
    CategoricalColumn.prototype.getColors = function (row) {
        return this.getCategories(row).map(this.colors);
    };
    CategoricalColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.filter = this.currentFilter;
        r.colors = {
            domain: this.colors.domain(),
            range: this.colors.range(),
            separator: this.separator
        };
        if (this.catLabels !== null && !this.catLabels.empty()) {
            r.labels = this.catLabels.entries();
        }
        return r;
    };
    CategoricalColumn.prototype.restore = function (dump, factory) {
        var _this = this;
        _super.prototype.restore.call(this, dump, factory);
        this.currentFilter = dump.filter || null;
        if (dump.colors) {
            this.colors.domain(dump.colors.domain).range(dump.colors.range);
        }
        if (dump.labels) {
            this.catLabels = __WEBPACK_IMPORTED_MODULE_0_d3__["map"]();
            dump.labels.forEach(function (e) { return _this.catLabels.set(e.key, e.value); });
        }
        this.separator = dump.separator || this.separator;
    };
    CategoricalColumn.prototype.isFiltered = function () {
        return this.currentFilter != null;
    };
    CategoricalColumn.prototype.filter = function (row) {
        if (!this.isFiltered()) {
            return true;
        }
        var vs = this.getCategories(row), filter = this.currentFilter;
        return vs.every(function (v) {
            if (Array.isArray(filter) && filter.length > 0) {
                return filter.indexOf(v) >= 0;
            }
            else if (typeof filter === 'string' && filter.length > 0) {
                return v && v.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
            }
            else if (filter instanceof RegExp) {
                return v != null && v.match(filter).length > 0;
            }
            return true;
        });
    };
    CategoricalColumn.prototype.getFilter = function () {
        return this.currentFilter;
    };
    CategoricalColumn.prototype.setFilter = function (filter) {
        if (arrayEquals(this.currentFilter, filter)) {
            return;
        }
        this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.currentFilter, this.currentFilter = filter);
    };
    CategoricalColumn.prototype.compare = function (a, b) {
        var va = this.getValues(a);
        var vb = this.getValues(b);
        //check all categories
        for (var i = 0; i < Math.min(va.length, vb.length); ++i) {
            var ci = __WEBPACK_IMPORTED_MODULE_0_d3__["ascending"](va[i], vb[i]);
            if (ci !== 0) {
                return ci;
            }
        }
        //smaller length wins
        return va.length - vb.length;
    };
    return CategoricalColumn;
}(ValueColumn));
/**
 * similar to a categorical column but the categories are mapped to numbers
 */
var CategoricalNumberColumn = (function (_super) {
    __extends(CategoricalNumberColumn, _super);
    function CategoricalNumberColumn(id, desc) {
        _super.call(this, id, desc);
        this.colors = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].category10();
        /**
         * category labels by default the category name itself
         * @type {Array}
         */
        this.catLabels = __WEBPACK_IMPORTED_MODULE_0_d3__["map"]();
        this.scale = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].ordinal().rangeRoundPoints([0, 1]);
        this.currentFilter = null;
        /**
         * separator for multi handling
         * @type {string}
         */
        this.separator = ';';
        this.combiner = __WEBPACK_IMPORTED_MODULE_0_d3__["max"];
        this.separator = desc.separator || this.separator;
        CategoricalColumn.prototype.initCategories.call(this, desc);
        this.scale.domain(this.colors.domain());
        if (desc.categories) {
            //lookup value or 0.5 by default
            var values = desc.categories.map(function (d) { return ((typeof d !== 'string' && typeof (d.value) === 'number')) ? d.value : 0.5; });
            this.scale.range(values);
        }
    }
    CategoricalNumberColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['mappingChanged']);
    };
    Object.defineProperty(CategoricalNumberColumn.prototype, "categories", {
        get: function () {
            return this.colors.domain().slice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CategoricalNumberColumn.prototype, "categoryColors", {
        get: function () {
            return this.colors.range().slice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CategoricalNumberColumn.prototype, "categoryLabels", {
        get: function () {
            var _this = this;
            //no mapping
            if (this.catLabels === null || this.catLabels.empty()) {
                return this.categories;
            }
            //label or identity mapping
            return this.categories.map(function (c) { return _this.catLabels.has(c) ? _this.catLabels.get(c) : c; });
        },
        enumerable: true,
        configurable: true
    });
    CategoricalNumberColumn.prototype.colorOf = function (cat) {
        return this.colors(cat);
    };
    CategoricalNumberColumn.prototype.getLabel = function (row) {
        return CategoricalColumn.prototype.getLabel.call(this, row);
    };
    CategoricalNumberColumn.prototype.getFirstLabel = function (row) {
        return CategoricalColumn.prototype.getFirstLabel.call(this, row);
    };
    CategoricalNumberColumn.prototype.getLabels = function (row) {
        return CategoricalColumn.prototype.getLabels.call(this, row);
    };
    CategoricalNumberColumn.prototype.getValue = function (row) {
        var r = this.getValues(row);
        return r.length > 0 ? this.combiner(r) : 0;
    };
    CategoricalNumberColumn.prototype.getValues = function (row) {
        var r = CategoricalColumn.prototype.getValues.call(this, row);
        return r.map(this.scale);
    };
    CategoricalNumberColumn.prototype.getCategories = function (row) {
        return CategoricalColumn.prototype.getValues.call(this, row);
    };
    CategoricalNumberColumn.prototype.getNumber = function (row) {
        return this.getValue(row);
    };
    CategoricalNumberColumn.prototype.getColor = function (row) {
        var vs = this.getValues(row);
        var cs = this.getColors(row);
        if (this.combiner === __WEBPACK_IMPORTED_MODULE_0_d3__["max"]) {
            //use the max color
            return cs.slice(1).reduce(function (prev, act, i) { return vs[i + 1] > prev.v ? { c: act, v: vs[i + 1] } : prev; }, {
                c: cs[0],
                v: vs[0]
            }).c;
        }
        else if (this.combiner === __WEBPACK_IMPORTED_MODULE_0_d3__["min"]) {
            //use the max color
            return cs.slice(1).reduce(function (prev, act, i) { return vs[i + 1] < prev.v ? { c: act, v: vs[i + 1] } : prev; }, {
                c: cs[0],
                v: vs[0]
            }).c;
        }
        else {
            //use the first
            return cs[0] || null;
        }
    };
    CategoricalNumberColumn.prototype.getColors = function (row) {
        return CategoricalColumn.prototype.getColors.call(this, row);
    };
    CategoricalNumberColumn.prototype.dump = function (toDescRef) {
        var r = CategoricalColumn.prototype.dump.call(this, toDescRef);
        r.scale = {
            domain: this.scale.domain(),
            range: this.scale.range(),
            separator: this.separator
        };
        return r;
    };
    CategoricalNumberColumn.prototype.restore = function (dump, factory) {
        CategoricalColumn.prototype.restore.call(this, dump, factory);
        if (dump.scale) {
            this.scale.domain(dump.scale.domain).range(dump.scale.range);
        }
        this.separator = dump.separator || this.separator;
    };
    CategoricalNumberColumn.prototype.getScale = function () {
        return {
            domain: this.scale.domain(),
            range: this.scale.range()
        };
    };
    CategoricalNumberColumn.prototype.getMapping = function () {
        return this.scale.range().slice();
    };
    CategoricalNumberColumn.prototype.setMapping = function (range) {
        var bak = this.getScale();
        this.scale.range(range);
        this.fire(['mappingChanged', 'dirtyValues', 'dirty'], bak, this.getScale());
    };
    CategoricalNumberColumn.prototype.isFiltered = function () {
        return this.currentFilter != null;
    };
    CategoricalNumberColumn.prototype.filter = function (row) {
        return CategoricalColumn.prototype.filter.call(this, row);
    };
    CategoricalNumberColumn.prototype.getFilter = function () {
        return this.currentFilter;
    };
    CategoricalNumberColumn.prototype.setFilter = function (filter) {
        if (this.currentFilter === filter) {
            return;
        }
        this.fire(['filterChanged', 'dirtyValues', 'dirty'], this.currentFilter, this.currentFilter = filter);
    };
    CategoricalNumberColumn.prototype.compare = function (a, b) {
        return NumberColumn.prototype.compare.call(this, a, b);
    };
    return CategoricalNumberColumn;
}(ValueColumn));
/**
 * implementation of a combine column, standard operations how to select
 */
var CompositeColumn = (function (_super) {
    __extends(CompositeColumn, _super);
    function CompositeColumn(id, desc) {
        _super.call(this, id, desc);
        this._children = [];
    }
    CompositeColumn.prototype.assignNewId = function (idGenerator) {
        _super.prototype.assignNewId.call(this, idGenerator);
        this._children.forEach(function (c) { return c.assignNewId(idGenerator); });
    };
    Object.defineProperty(CompositeColumn.prototype, "children", {
        get: function () {
            return this._children.slice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CompositeColumn.prototype, "length", {
        get: function () {
            return this._children.length;
        },
        enumerable: true,
        configurable: true
    });
    CompositeColumn.prototype.flatten = function (r, offset, levelsToGo, padding) {
        if (levelsToGo === void 0) { levelsToGo = 0; }
        if (padding === void 0) { padding = 0; }
        var self = null;
        //no more levels or just this one
        if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
            var w = this.getCompressed() ? Column.COMPRESSED_WIDTH : this.getWidth();
            r.push(self = { col: this, offset: offset, width: w });
            if (levelsToGo === 0) {
                return w;
            }
        }
        //push children
        this._children.forEach(function (c) {
            if (!c.isHidden() || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
                c.flatten(r, offset, levelsToGo - 1, padding);
            }
        });
        return w;
    };
    CompositeColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.children = this._children.map(function (d) { return d.dump(toDescRef); });
        return r;
    };
    CompositeColumn.prototype.restore = function (dump, factory) {
        var _this = this;
        dump.children.map(function (child) {
            var c = factory(child);
            if (c) {
                _this.push(c);
            }
        });
        _super.prototype.restore.call(this, dump, factory);
    };
    /**
     * inserts a column at a the given position
     * @param col
     * @param index
     * @param weight
     * @returns {any}
     */
    CompositeColumn.prototype.insert = function (col, index) {
        this._children.splice(index, 0, col);
        //listen and propagate events
        return this.insertImpl(col, index);
    };
    CompositeColumn.prototype.insertImpl = function (col, index) {
        col.parent = this;
        this.forward(col, 'dirtyHeader.combine', 'dirtyValues.combine', 'dirty.combine', 'filterChanged.combine');
        this.fire(['addColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, index);
        return col;
    };
    CompositeColumn.prototype.push = function (col) {
        return this.insert(col, this._children.length);
    };
    CompositeColumn.prototype.at = function (index) {
        return this._children[index];
    };
    CompositeColumn.prototype.indexOf = function (col) {
        return this._children.indexOf(col);
    };
    CompositeColumn.prototype.insertAfter = function (col, ref) {
        var i = this.indexOf(ref);
        if (i < 0) {
            return null;
        }
        return this.insert(col, i + 1);
    };
    CompositeColumn.prototype.remove = function (child) {
        var i = this._children.indexOf(child);
        if (i < 0) {
            return false;
        }
        this._children.splice(i, 1); //remove and deregister listeners
        return this.removeImpl(child);
    };
    CompositeColumn.prototype.removeImpl = function (child) {
        child.parent = null;
        this.unforward(child, 'dirtyHeader.combine', 'dirtyValues.combine', 'dirty.combine', 'filterChanged.combine');
        this.fire(['removeColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], child);
        return true;
    };
    CompositeColumn.prototype.getColor = function (row) {
        return this.color;
    };
    CompositeColumn.prototype.isFiltered = function () {
        return this._children.some(function (d) { return d.isFiltered(); });
    };
    CompositeColumn.prototype.filter = function (row) {
        return this._children.every(function (d) { return d.filter(row); });
    };
    return CompositeColumn;
}(Column));
/**
 * implementation of a combine column, standard operations how to select
 */
var CompositeNumberColumn = (function (_super) {
    __extends(CompositeNumberColumn, _super);
    function CompositeNumberColumn(id, desc) {
        _super.call(this, id, desc);
        this.missingValue = 0;
        this.numberFormat = __WEBPACK_IMPORTED_MODULE_0_d3__["format"]('.3n');
        if (desc.numberFormat) {
            this.numberFormat = __WEBPACK_IMPORTED_MODULE_0_d3__["format"](desc.numberFormat);
        }
    }
    CompositeNumberColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.missingValue = this.missingValue;
        return r;
    };
    CompositeNumberColumn.prototype.restore = function (dump, factory) {
        if (dump.missingValue) {
            this.missingValue = dump.missingValue;
        }
        if (dump.numberFormat) {
            this.numberFormat = __WEBPACK_IMPORTED_MODULE_0_d3__["format"](dump.numberFormat);
        }
        _super.prototype.restore.call(this, dump, factory);
    };
    /**
     * inserts a column at a the given position
     * @param col
     * @param index
     * @param weight
     * @returns {any}
     */
    CompositeNumberColumn.prototype.insert = function (col, index) {
        if (!isNumberColumn(col)) {
            return null;
        }
        return _super.prototype.insert.call(this, col, index);
    };
    CompositeNumberColumn.prototype.getLabel = function (row) {
        var v = this.getValue(row);
        //keep non number if it is not a number else convert using formatter
        return '' + (typeof v === 'number' ? this.numberFormat(v) : v);
    };
    CompositeNumberColumn.prototype.getValue = function (row) {
        //weighted sum
        var v = this.compute(row);
        if (typeof (v) === 'undefined' || v == null || isNaN(v)) {
            return this.missingValue;
        }
        return v;
    };
    CompositeNumberColumn.prototype.compute = function (row) {
        return NaN;
    };
    CompositeNumberColumn.prototype.getNumber = function (row) {
        return this.getValue(row);
    };
    CompositeNumberColumn.prototype.compare = function (a, b) {
        return numberCompare(this.getValue(a), this.getValue(b));
    };
    return CompositeNumberColumn;
}(CompositeColumn));
function isMultiLevelColumn(col) {
    return typeof (col.getCollapsed) === 'function';
}
/**
 * implementation of the stacked column
 */
var StackColumn = (function (_super) {
    __extends(StackColumn, _super);
    function StackColumn(id, desc) {
        _super.call(this, id, desc);
        /**
         * whether this stack column is collapsed i.e. just looks like an ordinary number column
         * @type {boolean}
         * @private
         */
        this.collapsed = false;
        var that = this;
        this.adaptChange = function (old, new_) {
            that.adaptWidthChange(this.source, old, new_);
        };
    }
    /**
     * factory for creating a description creating a stacked column
     * @param label
     * @returns {{type: string, label: string}}
     */
    StackColumn.desc = function (label) {
        if (label === void 0) { label = 'Combined'; }
        return { type: 'stack', label: label };
    };
    StackColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['collapseChanged', 'weightsChanged']);
    };
    StackColumn.prototype.setCollapsed = function (value) {
        if (this.collapsed === value) {
            return;
        }
        this.fire(['collapseChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.collapsed, this.collapsed = value);
    };
    StackColumn.prototype.getCollapsed = function () {
        return this.collapsed;
    };
    StackColumn.prototype.flatten = function (r, offset, levelsToGo, padding) {
        if (levelsToGo === void 0) { levelsToGo = 0; }
        if (padding === void 0) { padding = 0; }
        var self = null;
        var children = levelsToGo <= Column.FLAT_ALL_COLUMNS ? this._children : this._children.filter(function (c) { return !c.isHidden(); });
        //no more levels or just this one
        if (levelsToGo === 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
            var w = this.getCompressed() ? Column.COMPRESSED_WIDTH : this.getWidth();
            if (!this.collapsed && !this.getCompressed()) {
                w += (children.length - 1) * padding;
            }
            r.push(self = { col: this, offset: offset, width: w });
            if (levelsToGo === 0) {
                return w;
            }
        }
        //push children
        var acc = offset;
        children.forEach(function (c) {
            acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
        });
        if (self) {
            self.width = acc - offset - padding;
        }
        return acc - offset - padding;
    };
    StackColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.collapsed = this.collapsed;
        return r;
    };
    StackColumn.prototype.restore = function (dump, factory) {
        this.collapsed = dump.collapsed === true;
        _super.prototype.restore.call(this, dump, factory);
    };
    /**
     * inserts a column at a the given position
     * @param col
     * @param index
     * @param weight
     * @returns {any}
     */
    StackColumn.prototype.insert = function (col, index, weight) {
        if (weight === void 0) { weight = NaN; }
        if (!isNaN(weight)) {
            col.setWidth((weight / (1 - weight) * this.getWidth()));
        }
        col.on('widthChanged.stack', this.adaptChange);
        //increase my width
        _super.prototype.setWidth.call(this, this.length === 0 ? col.getWidth() : (this.getWidth() + col.getWidth()));
        return _super.prototype.insert.call(this, col, index);
    };
    StackColumn.prototype.push = function (col, weight) {
        if (weight === void 0) { weight = NaN; }
        return this.insert(col, this.length, weight);
    };
    StackColumn.prototype.insertAfter = function (col, ref, weight) {
        if (weight === void 0) { weight = NaN; }
        var i = this.indexOf(ref);
        if (i < 0) {
            return null;
        }
        return this.insert(col, i + 1, weight);
    };
    /**
     * adapts weights according to an own width change
     * @param col
     * @param old
     * @param new_
     */
    StackColumn.prototype.adaptWidthChange = function (col, old, new_) {
        if (old === new_) {
            return;
        }
        var bak = this.getWeights();
        var full = this.getWidth(), change = (new_ - old) / full;
        var oldWeight = old / full;
        var factor = (1 - oldWeight - change) / (1 - oldWeight);
        this._children.forEach(function (c) {
            if (c === col) {
            }
            else {
                c.setWidthImpl(c.getWidth() * factor);
            }
        });
        this.fire(['weightsChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], bak, this.getWeights());
    };
    StackColumn.prototype.getWeights = function () {
        var w = this.getWidth();
        return this._children.map(function (d) { return d.getWidth() / w; });
    };
    StackColumn.prototype.setWeights = function (weights) {
        var bak = this.getWeights();
        var s, delta = weights.length - this.length;
        if (delta < 0) {
            s = __WEBPACK_IMPORTED_MODULE_0_d3__["sum"](weights);
            if (s <= 1) {
                for (var i = 0; i < -delta; ++i) {
                    weights.push((1 - s) * (1 / -delta));
                }
            }
            else if (s <= 100) {
                for (var i = 0; i < -delta; ++i) {
                    weights.push((100 - s) * (1 / -delta));
                }
            }
        }
        weights = weights.slice(0, this.length);
        s = __WEBPACK_IMPORTED_MODULE_0_d3__["sum"](weights) / this.getWidth();
        weights = weights.map(function (d) { return d / s; });
        this._children.forEach(function (c, i) {
            c.setWidthImpl(weights[i]);
        });
        this.fire(['weightsChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], bak, weights);
    };
    StackColumn.prototype.removeImpl = function (child) {
        child.on('widthChanged.stack', null);
        _super.prototype.setWidth.call(this, this.length === 1 ? 100 : this.getWidth() - child.getWidth());
        return _super.prototype.removeImpl.call(this, child);
    };
    StackColumn.prototype.setWidth = function (value) {
        var factor = value / this.getWidth();
        this._children.forEach(function (child) {
            //disable since we change it
            child.setWidthImpl(child.getWidth() * factor);
        });
        _super.prototype.setWidth.call(this, value);
    };
    StackColumn.prototype.compute = function (row) {
        var w = this.getWidth();
        return this._children.reduce(function (acc, d) { return acc + d.getValue(row) * (d.getWidth() / w); }, 0);
    };
    return StackColumn;
}(CompositeNumberColumn));
/**
 * combines multiple columns by using the maximal value
 */
var MaxColumn = (function (_super) {
    __extends(MaxColumn, _super);
    function MaxColumn(id, desc) {
        _super.call(this, id, desc);
    }
    /**
     * factory for creating a description creating a max column
     * @param label
     * @returns {{type: string, label: string}}
     */
    MaxColumn.desc = function (label) {
        if (label === void 0) { label = 'Max'; }
        return { type: 'max', label: label };
    };
    MaxColumn.prototype.getColor = function (row) {
        //compute the index of the maximal one
        var c = this._children;
        if (c.length === 0) {
            return this.color;
        }
        var max_i = 0, max_v = c[0].getValue(row);
        for (var i = 1; i < c.length; ++i) {
            var v = c[i].getValue(row);
            if (v > max_v) {
                max_i = i;
                max_v = v;
            }
        }
        return c[max_i].color;
    };
    MaxColumn.prototype.compute = function (row) {
        return __WEBPACK_IMPORTED_MODULE_0_d3__["max"](this._children, function (d) { return d.getValue(row); });
    };
    return MaxColumn;
}(CompositeNumberColumn));
var MinColumn = (function (_super) {
    __extends(MinColumn, _super);
    function MinColumn(id, desc) {
        _super.call(this, id, desc);
    }
    /**
     * factory for creating a description creating a min column
     * @param label
     * @returns {{type: string, label: string}}
     */
    MinColumn.desc = function (label) {
        if (label === void 0) { label = 'Min'; }
        return { type: 'min', label: label };
    };
    MinColumn.prototype.getColor = function (row) {
        //compute the index of the maximal one
        var c = this._children;
        if (c.length === 0) {
            return this.color;
        }
        var min_i = 0, min_v = c[0].getValue(row);
        for (var i = 1; i < c.length; ++i) {
            var v = c[i].getValue(row);
            if (v < min_v) {
                min_i = i;
                min_v = v;
            }
        }
        return c[min_i].color;
    };
    MinColumn.prototype.compute = function (row) {
        return __WEBPACK_IMPORTED_MODULE_0_d3__["min"](this._children, function (d) { return d.getValue(row); });
    };
    return MinColumn;
}(CompositeNumberColumn));
var MeanColumn = (function (_super) {
    __extends(MeanColumn, _super);
    function MeanColumn(id, desc) {
        _super.call(this, id, desc);
    }
    /**
     * factory for creating a description creating a mean column
     * @param label
     * @returns {{type: string, label: string}}
     */
    MeanColumn.desc = function (label) {
        if (label === void 0) { label = 'Mean'; }
        return { type: 'mean', label: label };
    };
    MeanColumn.prototype.compute = function (row) {
        return __WEBPACK_IMPORTED_MODULE_0_d3__["mean"](this._children, function (d) { return d.getValue(row); });
    };
    return MeanColumn;
}(CompositeNumberColumn));
var MultiLevelCompositeColumn = (function (_super) {
    __extends(MultiLevelCompositeColumn, _super);
    function MultiLevelCompositeColumn(id, desc) {
        _super.call(this, id, desc);
        /**
         * whether this stack column is collapsed i.e. just looks like an ordinary number column
         * @type {boolean}
         * @private
         */
        this.collapsed = false;
        var that = this;
        this.adaptChange = function (old, new_) {
            that.adaptWidthChange(this.source, old, new_);
        };
    }
    MultiLevelCompositeColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['collapseChanged']);
    };
    MultiLevelCompositeColumn.prototype.setCollapsed = function (value) {
        if (this.collapsed === value) {
            return;
        }
        this.fire(['collapseChanged', 'dirtyHeader', 'dirtyValues', 'dirty'], this.collapsed, this.collapsed = value);
    };
    MultiLevelCompositeColumn.prototype.getCollapsed = function () {
        return this.collapsed;
    };
    MultiLevelCompositeColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.collapsed = this.collapsed;
        return r;
    };
    MultiLevelCompositeColumn.prototype.restore = function (dump, factory) {
        this.collapsed = dump.collapsed === true;
        _super.prototype.restore.call(this, dump, factory);
    };
    MultiLevelCompositeColumn.prototype.flatten = function (r, offset, levelsToGo, padding) {
        if (levelsToGo === void 0) { levelsToGo = 0; }
        if (padding === void 0) { padding = 0; }
        return StackColumn.prototype.flatten.call(this, r, offset, levelsToGo, padding);
    };
    /**
     * inserts a column at a the given position
     * @param col
     * @param index
     * @param weight
     * @returns {any}
     */
    MultiLevelCompositeColumn.prototype.insert = function (col, index) {
        col.on('widthChanged.stack', this.adaptChange);
        //increase my width
        _super.prototype.setWidth.call(this, this.length === 0 ? col.getWidth() : (this.getWidth() + col.getWidth()));
        return _super.prototype.insert.call(this, col, index);
    };
    /**
     * adapts weights according to an own width change
     * @param col
     * @param old
     * @param new_
     */
    MultiLevelCompositeColumn.prototype.adaptWidthChange = function (col, old, new_) {
        if (old === new_) {
            return;
        }
        _super.prototype.setWidth.call(this, this.getWidth() + (new_ - old));
    };
    MultiLevelCompositeColumn.prototype.removeImpl = function (child) {
        child.on('widthChanged.stack', null);
        _super.prototype.setWidth.call(this, this.length === 1 ? 100 : this.getWidth() - child.getWidth());
        return _super.prototype.removeImpl.call(this, child);
    };
    MultiLevelCompositeColumn.prototype.setWidth = function (value) {
        var factor = this.length / this.getWidth();
        this._children.forEach(function (child) {
            //disable since we change it
            child.setWidthImpl(child.getWidth() * factor);
        });
        _super.prototype.setWidth.call(this, value);
    };
    return MultiLevelCompositeColumn;
}(CompositeColumn));
/**
 * a nested column is a composite column where the sorting order is determined by the nested ordering of the children
 * i.e., sort by the first child if equal sort by the second child,...
 */
var NestedColumn = (function (_super) {
    __extends(NestedColumn, _super);
    function NestedColumn(id, desc) {
        _super.call(this, id, desc);
    }
    /**
     * factory for creating a description creating a mean column
     * @param label
     * @returns {{type: string, label: string}}
     */
    NestedColumn.desc = function (label) {
        if (label === void 0) { label = 'Nested'; }
        return { type: 'nested', label: label };
    };
    NestedColumn.prototype.compare = function (a, b) {
        var c = this.children;
        for (var _i = 0, c_1 = c; _i < c_1.length; _i++) {
            var ci = c_1[_i];
            var ci_result = ci.compare(a, b);
            if (ci_result !== 0) {
                return ci_result;
            }
        }
        return 0;
    };
    NestedColumn.prototype.getLabel = function (row) {
        return this.children.map(function (d) { return d.getLabel(row); }).join(';');
    };
    NestedColumn.prototype.getValue = function (row) {
        return this.children.map(function (d) { return d.getValue(row); }).join(';');
    };
    return NestedColumn;
}(MultiLevelCompositeColumn));
var ScriptColumn = (function (_super) {
    __extends(ScriptColumn, _super);
    function ScriptColumn(id, desc) {
        _super.call(this, id, desc);
        this.script = ScriptColumn.DEFAULT_SCRIPT;
        this.f = null;
        this.script = desc.script || this.script;
    }
    /**
     * factory for creating a description creating a mean column
     * @param label
     * @returns {{type: string, label: string}}
     */
    ScriptColumn.desc = function (label) {
        if (label === void 0) { label = 'script'; }
        return { type: 'script', label: label, script: ScriptColumn.DEFAULT_SCRIPT };
    };
    ScriptColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['scriptChanged']);
    };
    ScriptColumn.prototype.setScript = function (script) {
        if (this.script === script) {
            return;
        }
        this.f = null;
        this.fire(['scriptChanged', 'dirtyValues', 'dirty'], this.script, this.script = script);
    };
    ScriptColumn.prototype.getScript = function () {
        return this.script;
    };
    ScriptColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.script = this.script;
        return r;
    };
    ScriptColumn.prototype.restore = function (dump, factory) {
        this.script = dump.script || this.script;
        _super.prototype.restore.call(this, dump, factory);
    };
    ScriptColumn.prototype.compute = function (row) {
        if (this.f == null) {
            this.f = new Function('children', 'values', this.script);
        }
        return this.f.call(this, this._children, this._children.map(function (d) { return d.getValue(row); }));
    };
    ScriptColumn.DEFAULT_SCRIPT = 'return d3.max(values)';
    return ScriptColumn;
}(CompositeColumn));
/**
 * a rank column
 */
var RankColumn = (function (_super) {
    __extends(RankColumn, _super);
    function RankColumn(id, desc) {
        _super.call(this, id, desc);
        this.setWidthImpl(50);
    }
    /**
     * factory for creating a description creating a rank column
     * @param label
     * @returns {{type: string, label: string}}
     */
    RankColumn.desc = function (label) {
        if (label === void 0) { label = 'Rank'; }
        return { type: 'rank', label: label };
    };
    return RankColumn;
}(ValueColumn));
/**
 * a ranking
 */
var Ranking = (function (_super) {
    __extends(Ranking, _super);
    function Ranking(id) {
        var _this = this;
        _super.call(this);
        this.id = id;
        /**
         * the current sort criteria
         * @type {null}
         * @private
         */
        this.sortColumn = null;
        /**
         * ascending or descending order
         * @type {boolean}
         */
        this.ascending = false;
        /**
         * columns of this ranking
         * @type {Array}
         * @private
         */
        this.columns = [];
        this.comparator = function (a, b) {
            if (_this.sortColumn === null) {
                return 0;
            }
            var r = _this.sortColumn.compare(a, b);
            return _this.ascending ? r : -r;
        };
        this.dirtyOrder = function () {
            _this.fire(['dirtyOrder', 'dirtyValues', 'dirty'], _this.getSortCriteria());
        };
        /**
         * the current ordering as an sorted array of indices
         * @type {Array}
         */
        this.order = [];
        this.id = fixCSS(id);
    }
    Ranking.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['widthChanged', 'filterChanged', 'labelChanged', 'compressChanged', 'addColumn', 'removeColumn', 'dirty', 'dirtyHeader', 'dirtyValues', 'sortCriteriaChanged', 'dirtyOrder', 'orderChanged']);
    };
    Ranking.prototype.assignNewId = function (idGenerator) {
        this.id = fixCSS(idGenerator());
        this.columns.forEach(function (c) { return c.assignNewId(idGenerator); });
    };
    Ranking.prototype.setOrder = function (order) {
        this.fire(['orderChanged', 'dirtyValues', 'dirty'], this.order, this.order = order);
    };
    Ranking.prototype.getOrder = function () {
        return this.order;
    };
    Ranking.prototype.dump = function (toDescRef) {
        var r = {};
        r.columns = this.columns.map(function (d) { return d.dump(toDescRef); });
        r.sortColumn = {
            asc: this.ascending
        };
        if (this.sortColumn) {
            r.sortColumn.sortBy = this.sortColumn.id; //store the index not the object
        }
        return r;
    };
    Ranking.prototype.restore = function (dump, factory) {
        var _this = this;
        this.clear();
        dump.columns.map(function (child) {
            var c = factory(child);
            if (c) {
                _this.push(c);
            }
        });
        if (dump.sortColumn) {
            this.ascending = dump.sortColumn.asc;
            if (dump.sortColumn.sortBy) {
                var help = this.columns.filter(function (d) { return d.id === dump.sortColumn.sortBy; });
                this.sortBy(help.length === 0 ? null : help[0], dump.sortColumn.asc);
            }
        }
    };
    Ranking.prototype.flatten = function (r, offset, levelsToGo, padding) {
        if (levelsToGo === void 0) { levelsToGo = 0; }
        if (padding === void 0) { padding = 0; }
        var acc = offset; // + this.getWidth() + padding;
        if (levelsToGo > 0 || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
            this.columns.forEach(function (c) {
                if (!c.isHidden() || levelsToGo <= Column.FLAT_ALL_COLUMNS) {
                    acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
                }
            });
        }
        return acc - offset;
    };
    Ranking.prototype.getSortCriteria = function () {
        return {
            col: this.sortColumn,
            asc: this.ascending
        };
    };
    Ranking.prototype.toggleSorting = function (col) {
        if (this.sortColumn === col) {
            return this.sortBy(col, !this.ascending);
        }
        return this.sortBy(col);
    };
    Ranking.prototype.setSortCriteria = function (value) {
        return this.sortBy(value.col, value.asc);
    };
    Ranking.prototype.sortBy = function (col, ascending) {
        if (ascending === void 0) { ascending = false; }
        if (col !== null && col.findMyRanker() !== this) {
            return false; //not one of mine
        }
        if (this.sortColumn === col && this.ascending === ascending) {
            return true; //already in this order
        }
        if (this.sortColumn) {
            this.sortColumn.on('dirtyValues.order', null);
        }
        var bak = this.getSortCriteria();
        this.sortColumn = col;
        if (this.sortColumn) {
            this.sortColumn.on('dirtyValues.order', this.dirtyOrder);
        }
        this.ascending = ascending;
        this.fire(['sortCriteriaChanged', 'dirtyOrder', 'dirtyHeader', 'dirtyValues', 'dirty'], bak, this.getSortCriteria());
        return true;
    };
    Object.defineProperty(Ranking.prototype, "children", {
        get: function () {
            return this.columns.slice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Ranking.prototype, "length", {
        get: function () {
            return this.columns.length;
        },
        enumerable: true,
        configurable: true
    });
    Ranking.prototype.insert = function (col, index) {
        if (index === void 0) { index = this.columns.length; }
        this.columns.splice(index, 0, col);
        col.parent = this;
        this.forward(col, 'dirtyValues.ranking', 'dirtyHeader.ranking', 'dirty.ranking', 'filterChanged.ranking');
        col.on('filterChanged.order', this.dirtyOrder);
        this.fire(['addColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, index);
        if (this.sortColumn === null && !(col instanceof RankColumn || col instanceof SelectionColumn || col instanceof DummyColumn)) {
            this.sortBy(col, col instanceof StringColumn);
        }
        return col;
    };
    Object.defineProperty(Ranking.prototype, "fqpath", {
        get: function () {
            return '';
        },
        enumerable: true,
        configurable: true
    });
    Ranking.prototype.findByPath = function (fqpath) {
        var p = this;
        var indices = fqpath.split('@').map(Number).slice(1); //ignore the first entry = ranking
        while (indices.length > 0) {
            var i = indices.shift();
            p = p.at(i);
        }
        return p;
    };
    Ranking.prototype.indexOf = function (col) {
        return this.columns.indexOf(col);
    };
    Ranking.prototype.at = function (index) {
        return this.columns[index];
    };
    Ranking.prototype.insertAfter = function (col, ref) {
        var i = this.columns.indexOf(ref);
        if (i < 0) {
            return null;
        }
        return this.insert(col, i + 1);
    };
    Ranking.prototype.push = function (col) {
        return this.insert(col);
    };
    Ranking.prototype.remove = function (col) {
        var i = this.columns.indexOf(col);
        if (i < 0) {
            return false;
        }
        this.unforward(col, 'dirtyValues.ranking', 'dirtyHeader.ranking', 'dirty.ranking', 'filterChanged.ranking');
        if (this.sortColumn === col) {
            var next = this.columns.filter(function (d) { return d !== col && !(d instanceof SelectionColumn) && !(d instanceof RankColumn); })[0];
            this.sortBy(next ? next : null);
        }
        col.parent = null;
        this.columns.splice(i, 1);
        this.fire(['removeColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], col, i);
        return true;
    };
    Ranking.prototype.clear = function () {
        var _this = this;
        if (this.columns.length === 0) {
            return;
        }
        this.sortColumn = null;
        this.columns.forEach(function (col) {
            _this.unforward(col, 'dirtyValues.ranking', 'dirtyHeader.ranking', 'dirty.ranking', 'filterChanged.ranking');
            col.parent = null;
        });
        this.columns.length = 0;
        this.fire(['removeColumn', 'dirtyHeader', 'dirtyValues', 'dirty'], null);
    };
    Object.defineProperty(Ranking.prototype, "flatColumns", {
        get: function () {
            var r = [];
            this.flatten(r, 0, Column.FLAT_ALL_COLUMNS);
            return r.map(function (d) { return d.col; });
        },
        enumerable: true,
        configurable: true
    });
    Ranking.prototype.find = function (id_or_filter) {
        var filter = typeof (id_or_filter) === 'string' ? function (col) { return col.id === id_or_filter; } : id_or_filter;
        var r = this.flatColumns;
        for (var i = 0; i < r.length; ++i) {
            if (filter(r[i])) {
                return r[i];
            }
        }
        return null;
    };
    /**
     * converts the sorting criteria to a json compatible notation for transferring it to the server
     * @param toId
     * @return {any}
     */
    Ranking.prototype.toSortingDesc = function (toId) {
        //TODO describe also all the filter settings
        var resolve = function (s) {
            if (s === null) {
                return null;
            }
            if (s instanceof StackColumn) {
                var w = s.getWeights();
                return s.children.map(function (child, i) {
                    return {
                        weight: w[i],
                        id: resolve(child)
                    };
                });
            }
            return toId(s.desc);
        };
        var id = resolve(this.sortColumn);
        if (id === null) {
            return null;
        }
        return {
            id: id,
            asc: this.ascending
        };
    };
    Ranking.prototype.isFiltered = function () {
        return this.columns.some(function (d) { return d.isFiltered(); });
    };
    Ranking.prototype.filter = function (row) {
        return this.columns.every(function (d) { return d.filter(row); });
    };
    Ranking.prototype.findMyRanker = function () {
        return this;
    };
    Object.defineProperty(Ranking.prototype, "fqid", {
        get: function () {
            return this.id;
        },
        enumerable: true,
        configurable: true
    });
    return Ranking;
}(__WEBPACK_IMPORTED_MODULE_1__utils__["AEventDispatcher"]));
/**
 * defines a new column type
 * @param name
 * @param functions
 * @returns {CustomColumn}
 */
function defineColumn(name, functions) {
    if (functions === void 0) { functions = {}; }
    var CustomColumn = (function (_super) {
        __extends(CustomColumn, _super);
        function CustomColumn(id, desc) {
            _super.call(this, id, desc);
            if (typeof (this.init) === 'function') {
                this.init.apply(this, [].slice.apply(arguments));
            }
        }
        return CustomColumn;
    }(ValueColumn));
    CustomColumn.prototype.toString = function () { return name; };
    CustomColumn.prototype = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(CustomColumn.prototype, functions);
    return CustomColumn;
}
/**
 * utility for creating a stacked column description
 * @type {function(string=): {type: string, label: string}}
 */
var createStackDesc = StackColumn.desc;
var createRankDesc = RankColumn.desc;
var createSelectionDesc = SelectionColumn.desc;
var createMinDesc = MinColumn.desc;
var createMaxDesc = MaxColumn.desc;
var createMeanDesc = MeanColumn.desc;
var createNestedDesc = NestedColumn.desc;
var createScriptDesc = ScriptColumn.desc;
/**
 * utility for creating an action description with optional label
 * @param label
 * @returns {{type: string, label: string}}
 */
function createActionDesc(label) {
    if (label === void 0) { label = 'actions'; }
    return { type: 'actions', label: label };
}
/**
 * a map of all known column types
 */
function models() {
    return {
        number: NumberColumn,
        string: StringColumn,
        link: LinkColumn,
        stack: StackColumn,
        rank: RankColumn,
        boolean: BooleanColumn,
        categorical: CategoricalColumn,
        ordinal: CategoricalNumberColumn,
        actions: DummyColumn,
        annotate: AnnotateColumn,
        selection: SelectionColumn,
        max: MaxColumn,
        min: MinColumn,
        mean: MinColumn,
        script: ScriptColumn,
        nested: NestedColumn
    };
}


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__model__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_d3__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_d3___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_d3__);
/* harmony export (binding) */ __webpack_require__.d(exports, "DefaultCellRenderer", function() { return DefaultCellRenderer; });
/* harmony export (binding) */ __webpack_require__.d(exports, "BarCellRenderer", function() { return BarCellRenderer; });
/* harmony export (binding) */ __webpack_require__.d(exports, "HeatMapCellRenderer", function() { return HeatMapCellRenderer; });
/* harmony export (binding) */ __webpack_require__.d(exports, "ActionCellRenderer", function() { return ActionCellRenderer; });
/* harmony export (binding) */ __webpack_require__.d(exports, "SelectionCellRenderer", function() { return SelectionCellRenderer; });
/* harmony export (immutable) */ exports["defaultRenderer"] = defaultRenderer;
/* harmony export (immutable) */ exports["barRenderer"] = barRenderer;
/* harmony export (immutable) */ exports["createRenderer"] = createRenderer;
/* harmony export (immutable) */ exports["renderers"] = renderers;
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};


/**
 * default renderer instance rendering the value as a text
 */
var DefaultCellRenderer = (function () {
    function DefaultCellRenderer() {
        /**
         * class to append to the text elements
         * @type {string}
         */
        this.textClass = 'text';
        /**
         * the text alignment: left, center, right
         * @type {string}
         */
        this.align = 'left';
    }
    DefaultCellRenderer.prototype.render = function ($col, col, rows, context) {
        var $rows = $col.datum(col).selectAll('text.' + this.textClass).data(rows, context.rowKey);
        $rows.enter().append('text').attr({
            'class': this.textClass,
            'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
            y: function (d, i) { return context.cellPrevY(i); }
        });
        var alignmentShift = 2;
        if (this.align === 'right') {
            alignmentShift = col.getWidth() - 5;
        }
        else if (this.align === 'center') {
            alignmentShift = col.getWidth() * 0.5;
        }
        $rows.attr({
            x: function (d, i) { return context.cellX(i) + alignmentShift; },
            'data-index': function (d, i) { return i; }
        }).text(function (d) { return col.getLabel(d); });
        context.animated($rows).attr({
            y: function (d, i) { return context.cellY(i); }
        });
        $rows.exit().remove();
    };
    /**
     * resolves the cell in the column for a given row
     * @param $col
     * @param index
     * @return {Selection<Datum>}
     */
    DefaultCellRenderer.prototype.findRow = function ($col, index) {
        return $col.selectAll('text.' + this.textClass + '[data-index="' + index + '"]');
    };
    DefaultCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
        var rowNode = $row.node();
        //find the right one and
        var n = this.findRow($col, index).node();
        if (n) {
            rowNode.appendChild(n);
        }
    };
    DefaultCellRenderer.prototype.mouseLeave = function ($col, $row, col, row, index, context) {
        var colNode = $col.node();
        var rowNode = $row.node();
        //move back
        if (rowNode.hasChildNodes() && colNode) {
            colNode.appendChild(rowNode.firstChild);
        }
        $row.selectAll('*').remove();
    };
    DefaultCellRenderer.prototype.renderCanvas = function (ctx, col, rows, context) {
        var _this = this;
        ctx.save();
        ctx.textAlign = this.align;
        rows.forEach(function (row, i) {
            var y = context.cellY(i);
            var alignmentShift = 2;
            if (_this.align === 'right') {
                alignmentShift = col.getWidth() - 5;
            }
            else if (_this.align === 'center') {
                alignmentShift = col.getWidth() * 0.5;
            }
            var x = context.cellX(i) + alignmentShift;
            ctx.fillText(col.getLabel(row), x, y, col.getWidth());
        });
        ctx.restore();
    };
    DefaultCellRenderer.prototype.mouseEnterCanvas = function (ctx, col, row, index, context) {
        //TODO
    };
    return DefaultCellRenderer;
}());
/**
 * simple derived one where individual elements can be overridden
 */
var DerivedCellRenderer = (function (_super) {
    __extends(DerivedCellRenderer, _super);
    function DerivedCellRenderer(extraFuncs) {
        var _this = this;
        _super.call(this);
        //integrate all the extra functions
        Object.keys(extraFuncs).forEach(function (key) {
            _this[key] = extraFuncs[key];
        });
    }
    return DerivedCellRenderer;
}(DefaultCellRenderer));
/**
 * a renderer rendering a bar for numerical columns
 */
var BarCellRenderer = (function (_super) {
    __extends(BarCellRenderer, _super);
    function BarCellRenderer() {
        _super.apply(this, arguments);
        /**
         * flag to always render the value
         * @type {boolean}
         */
        this.renderValue = false;
    }
    BarCellRenderer.prototype.render = function ($col, col, rows, context) {
        var _this = this;
        var renderValue = this.renderValue || context.option('renderBarValue', false);
        //map to bars
        var $rows = $col.datum(col).selectAll('.bar').data(rows, context.rowKey);
        var padding = context.option('rowPadding', 1);
        var renderBars = function ($enter, clazz, $update) {
            $enter.append('rect').attr({
                'class': clazz,
                x: function (d, i) { return context.cellX(i); },
                y: function (d, i) { return context.cellPrevY(i) + padding; },
                width: function (d) {
                    var n = col.getWidth() * col.getValue(d);
                    return isNaN(n) ? 0 : n;
                }
            }).style('fill', col.color);
            $update.attr({
                height: function (d, i) { return context.rowHeight(i) - context.option('rowPadding', 1) * 2; }
            });
            context.animated($update).attr({
                x: function (d, i) { return context.cellX(i); },
                y: function (d, i) { return context.cellY(i) + context.option('rowPadding', 1); },
                width: function (d) {
                    var n = col.getWidth() * col.getValue(d);
                    return isNaN(n) ? 0 : n;
                }
            }).style({
                fill: function (d, i) { return _this.colorOf(d, i, col); }
            });
        };
        if (renderValue) {
            var $rows_enter = $rows.enter().append('g').attr('class', 'bar ' + this.textClass);
            renderBars($rows_enter, col.cssClass, $rows.select('rect'));
            $rows_enter.append('text').attr({
                'class': 'number',
                'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')'
            });
            context.animated($rows.select('text').text(function (d) { return col.getLabel(d); }))
                .attr('transform', function (d, i) { return 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')'; });
        }
        else {
            renderBars($rows.enter(), 'bar ' + col.cssClass, $rows);
        }
        $rows.attr({
            'data-index': function (d, i) { return i; },
        });
        $rows.exit().remove();
    };
    /**
     * computes the color for a given row
     * @param d the current row
     * @param i the row index
     * @param col the model column
     * @returns {string}
     */
    BarCellRenderer.prototype.colorOf = function (d, i, col) {
        return col.color;
    };
    BarCellRenderer.prototype.findRow = function ($col, index) {
        return $col.selectAll('.bar[data-index="' + index + '"]');
    };
    BarCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
        var renderValue = this.renderValue || context.option('renderBarValue', false);
        if (renderValue) {
            return _super.prototype.mouseEnter.call(this, $col, $row, col, row, index, context);
        }
        var rowNode = this.findRow($col, index);
        if (!rowNode.empty()) {
            //create a text element on top
            $row.node().appendChild((rowNode.node()));
            $row.append('text').datum(rowNode.datum()).attr({
                'class': 'number',
                'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
                transform: 'translate(' + context.cellX(index) + ',' + context.cellY(index) + ')'
            }).text(function (d) { return col.getLabel(d); });
        }
    };
    BarCellRenderer.prototype.renderCanvas = function (ctx, col, rows, context) {
        var _this = this;
        var renderValue = this.renderValue || context.option('renderBarValue', false);
        var padding = context.option('rowPadding', 1);
        ctx.save();
        rows.forEach(function (d, i) {
            var x = context.cellX(i);
            var y = context.cellY(i) + padding;
            var n = col.getWidth() * col.getValue(d);
            var w = isNaN(n) ? 0 : n;
            var h = context.rowHeight(i) - padding * 2;
            ctx.fillStyle = _this.colorOf(d, i, col) || col.color || __WEBPACK_IMPORTED_MODULE_0__model__["Column"].DEFAULT_COLOR;
            ctx.fillRect(x, y, w, h);
            if (renderValue) {
                ctx.fillText(col.getLabel(d), x, y - padding, col.getWidth());
            }
        });
        ctx.restore();
    };
    BarCellRenderer.prototype.mouseEnterCanvas = function (ctx, col, row, index, context) {
        var renderValue = this.renderValue || context.option('renderBarValue', false);
        if (renderValue) {
            return;
        }
        ctx.save();
        ctx.fillText(col.getLabel(row), context.cellX(index), context.cellY(index), col.getWidth());
        ctx.restore();
    };
    return BarCellRenderer;
}(DefaultCellRenderer));
/**
 * render as a heatmap cell, e.g., encode the value in color
 */
var HeatMapCellRenderer = (function (_super) {
    __extends(HeatMapCellRenderer, _super);
    function HeatMapCellRenderer() {
        _super.apply(this, arguments);
    }
    HeatMapCellRenderer.prototype.render = function ($col, col, rows, context) {
        var _this = this;
        var $rows = $col.datum(col).selectAll('rect.heatmap').data(rows, context.rowKey);
        $rows.enter().append('rect').attr({
            'class': 'bar ' + col.cssClass,
            x: function (d, i) { return context.cellX(i); },
            y: function (d, i) { return context.cellPrevY(i) + context.option('rowPadding', 1); },
            width: function (d, i) { return context.rowHeight(i) - context.option('rowPadding', 1) * 2; }
        }).style('fill', col.color);
        $rows.attr({
            'data-index': function (d, i) { return i; },
            width: function (d, i) { return context.rowHeight(i) - context.option('rowPadding', 1) * 2; },
            height: function (d, i) { return context.rowHeight(i) - context.option('rowPadding', 1) * 2; }
        });
        context.animated($rows).attr({
            x: function (d, i) { return context.cellX(i); },
            y: function (d, i) { return context.cellY(i) + context.option('rowPadding', 1); }
        }).style({
            fill: function (d, i) { return _this.colorOf(d, i, col); }
        });
        $rows.exit().remove();
    };
    /**
     * computes the color of the cell
     * @param d the row
     * @param i the data index
     * @param col the column
     * @returns {string} the computed color
     */
    HeatMapCellRenderer.prototype.colorOf = function (d, i, col) {
        var v = col.getValue(d);
        if (isNaN(v)) {
            v = 0;
        }
        //hsl space encoding, encode in lightness
        var color = __WEBPACK_IMPORTED_MODULE_1_d3__["hsl"](col.color || __WEBPACK_IMPORTED_MODULE_0__model__["Column"].DEFAULT_COLOR);
        color.l = v;
        return color.toString();
    };
    HeatMapCellRenderer.prototype.findRow = function ($col, index) {
        return $col.selectAll('rect.heatmap[data-index="' + index + '"]');
    };
    HeatMapCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
        var rowNode = this.findRow($col, index);
        if (!rowNode.empty()) {
            //append a text element on top
            $row.node().appendChild((rowNode.node()));
            $row.append('text').datum(rowNode.datum()).attr({
                'class': 'number',
                'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
                transform: 'translate(' + context.cellX(index) + ',' + context.cellY(index) + ')'
            }).text(function (d) { return col.getLabel(d); });
        }
    };
    HeatMapCellRenderer.prototype.renderCanvas = function (ctx, col, rows, context) {
        var _this = this;
        ctx.save();
        rows.forEach(function (d, i) {
            var x = context.cellX(i);
            var y = context.cellY(i) + context.option('rowPadding', 1);
            var h = context.rowHeight(i) - context.option('rowPadding', 1) * 2;
            ctx.fillStyle = _this.colorOf(d, i, col);
            ctx.fillRect(x, y, h, h);
        });
        ctx.restore();
    };
    HeatMapCellRenderer.prototype.mouseEnterCanvas = function (ctx, col, row, index, context) {
        ctx.save();
        ctx.fillText(col.getLabel(row), context.cellX(index), context.cellY(index), col.getWidth());
        ctx.restore();
    };
    return HeatMapCellRenderer;
}(DefaultCellRenderer));
/**
 * a bar cell renderer where individual function can be overwritten
 */
var DerivedBarCellRenderer = (function (_super) {
    __extends(DerivedBarCellRenderer, _super);
    function DerivedBarCellRenderer(extraFuncs) {
        var _this = this;
        _super.call(this);
        Object.keys(extraFuncs).forEach(function (key) {
            _this[key] = extraFuncs[key];
        });
    }
    return DerivedBarCellRenderer;
}(BarCellRenderer));
/**
 * an rendering for action columns, i.e., clickable column actions
 */
var ActionCellRenderer = (function () {
    function ActionCellRenderer() {
    }
    ActionCellRenderer.prototype.render = function ($col, col, rows, context) {
        //nothing to render in normal mode
    };
    ActionCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
        //render all actions at tspans
        var actions = context.option('actions', []);
        var $actions = $row.append('text').attr({
            'class': 'actions fa',
            x: context.cellX(index),
            y: context.cellPrevY(index),
            'data-index': index
        }).selectAll('tspan').data(actions);
        $actions.enter().append('tspan')
            .text(function (d) { return d.icon; })
            .attr('title', function (d) { return d.name; })
            .on('click', function (d) {
            __WEBPACK_IMPORTED_MODULE_1_d3__["event"].preventDefault();
            __WEBPACK_IMPORTED_MODULE_1_d3__["event"].stopPropagation();
            d.action(row);
        });
    };
    ActionCellRenderer.prototype.mouseLeave = function ($col, $row, col, row, index, context) {
        $row.selectAll('*').remove();
    };
    return ActionCellRenderer;
}());
var SelectionCellRenderer = (function (_super) {
    __extends(SelectionCellRenderer, _super);
    function SelectionCellRenderer() {
        _super.call(this);
        this.textClass = 'selection';
    }
    SelectionCellRenderer.prototype.render = function ($col, col, rows, context) {
        var $rows = $col.datum(col).selectAll('text.' + this.textClass).data(rows, context.rowKey);
        $rows.enter().append('text').attr({
            'class': this.textClass + ' fa',
            y: function (d, i) { return context.cellPrevY(i); }
        }).on('click', function (d) {
            __WEBPACK_IMPORTED_MODULE_1_d3__["event"].preventDefault();
            __WEBPACK_IMPORTED_MODULE_1_d3__["event"].stopPropagation();
            var new_ = col.toggleValue(d);
            __WEBPACK_IMPORTED_MODULE_1_d3__["select"](this).text(new_ === true ? '\uf046' : '\uf096');
        });
        $rows.attr({
            x: function (d, i) { return context.cellX(i); },
            'data-index': function (d, i) { return i; }
        }).text(function (d) { return col.getValue(d) === true ? '\uf046' : '\uf096'; });
        context.animated($rows).attr({
            y: function (d, i) { return context.cellY(i); }
        });
        $rows.exit().remove();
    };
    SelectionCellRenderer.prototype.renderCanvas = function (ctx, col, rows, context) {
        ctx.save();
        ctx.font = 'FontAwesome';
        rows.forEach(function (d, i) {
            var x = context.cellX(i);
            var y = context.cellY(i);
            ctx.fillText(col.getValue(d) === true ? '\uf046' : '\uf096', x, y);
        });
        ctx.restore();
    };
    return SelectionCellRenderer;
}(DefaultCellRenderer));
/**
 * a renderer for annotate columns
 */
var AnnotateCellRenderer = (function (_super) {
    __extends(AnnotateCellRenderer, _super);
    function AnnotateCellRenderer() {
        _super.apply(this, arguments);
    }
    AnnotateCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
        //render an input field for editing
        this.findRow($col, index).attr('display', 'none');
        $row.append('foreignObject').attr({
            x: context.cellX(index) - 2,
            y: context.cellPrevY(index) - 2,
            'data-index': index,
            width: col.getWidth(),
            height: context.rowHeight(index)
        }).append('xhtml:input').attr({
            type: 'text',
            value: col.getValue(row)
        }).style({
            width: col.getWidth() + 'px'
        }).on('change', function () {
            //update the value
            var text = this.value;
            col.setValue(row, text);
        }).on('click', function () { return __WEBPACK_IMPORTED_MODULE_1_d3__["event"].stopPropagation(); });
    };
    AnnotateCellRenderer.prototype.mouseLeave = function ($col, $row, col, row, index, context) {
        this.findRow($col, index).attr('display', null);
        var node = $row.select('input').node();
        if (node) {
            //update the value before removal, the change event may not have been fired
            col.setValue(row, node.value);
        }
        $row.selectAll('*').remove();
    };
    return AnnotateCellRenderer;
}(DefaultCellRenderer));
var defaultRendererInstance = new DefaultCellRenderer();
var barRendererInstance = new BarCellRenderer();
/**
 * creates a new instance with optional overridden methods
 * @param extraFuncs
 * @return {DefaultCellRenderer}
 */
function defaultRenderer(extraFuncs) {
    if (!extraFuncs) {
        return defaultRendererInstance;
    }
    return new DerivedCellRenderer(extraFuncs);
}
/**
 * creates a new instance with optional overridden methods
 * @param extraFuncs
 * @return {BarCellRenderer}
 */
function barRenderer(extraFuncs) {
    if (!extraFuncs) {
        return barRendererInstance;
    }
    return new DerivedBarCellRenderer(extraFuncs);
}
/**
 * renderer of a link column, i.e. render an intermediate *a* element
 */
var LinkCellRenderer = (function (_super) {
    __extends(LinkCellRenderer, _super);
    function LinkCellRenderer() {
        _super.apply(this, arguments);
    }
    LinkCellRenderer.prototype.render = function ($col, col, rows, context) {
        //wrap the text elements with an a element
        var $rows = $col.datum(col).selectAll('text.link').data(rows, context.rowKey);
        $rows.enter().append('text').attr({
            'class': 'text link',
            'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
            y: function (d, i) { return context.cellPrevY(i); }
        });
        $rows.attr({
            x: function (d, i) { return context.cellX(i); },
            'data-index': function (d, i) { return i; }
        }).html(function (d) { return col.isLink(d) ? "<a class=\"link\" xlink:href=\"" + col.getValue(d) + "\" target=\"_blank\">" + col.getLabel(d) + "</a>" : col.getLabel(d); });
        context.animated($rows).attr({
            y: function (d, i) { return context.cellY(i); }
        });
        $rows.exit().remove();
    };
    LinkCellRenderer.prototype.findRow = function ($col, index) {
        return $col.selectAll('text.link[data-index="' + index + '"]');
    };
    return LinkCellRenderer;
}(DefaultCellRenderer));
/**
 * renders a string with additional alignment behavior
 */
var StringCellRenderer = (function (_super) {
    __extends(StringCellRenderer, _super);
    function StringCellRenderer() {
        _super.apply(this, arguments);
    }
    StringCellRenderer.prototype.render = function ($col, col, rows, context) {
        this.align = col.alignment;
        this.textClass = 'text' + (col.alignment === 'left' ? '' : '_' + col.alignment);
        return _super.prototype.render.call(this, $col, col, rows, context);
    };
    return StringCellRenderer;
}(DefaultCellRenderer));
/**
 * renders categorical columns as a colored rect with label
 */
var CategoricalRenderer = (function (_super) {
    __extends(CategoricalRenderer, _super);
    function CategoricalRenderer() {
        _super.apply(this, arguments);
        this.textClass = 'cat';
    }
    CategoricalRenderer.prototype.render = function ($col, col, rows, context) {
        var $rows = $col.datum(col).selectAll('g.' + this.textClass).data(rows, context.rowKey);
        var $rows_enter = $rows.enter().append('g').attr({
            'class': this.textClass,
            'data-index': function (d, i) { return i; },
            transform: function (d, i) { return 'translate(' + context.cellX(i) + ',' + context.cellPrevY(i) + ')'; }
        });
        $rows_enter.append('text').attr({
            'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
            x: function (d, i) { return context.rowHeight(i); }
        });
        $rows_enter.append('rect').attr({
            y: context.option('rowPadding', 1)
        });
        $rows.attr({
            'data-index': function (d, i) { return i; },
            transform: function (d, i) { return 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')'; }
        });
        $rows.select('text').attr({
            x: function (d, i) { return context.rowHeight(i); }
        }).text(function (d) { return col.getLabel(d); });
        $rows.select('rect').style({
            fill: function (d) { return col.getColor(d); }
        }).attr({
            height: function (d, i) { return Math.max(context.rowHeight(i) - context.option('rowPadding', 1) * 2, 0); },
            width: function (d, i) { return Math.max(context.rowHeight(i) - context.option('rowPadding', 1) * 2, 0); }
        });
        context.animated($rows).attr({
            transform: function (d, i) { return 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')'; }
        });
        $rows.exit().remove();
    };
    CategoricalRenderer.prototype.findRow = function ($col, index) {
        return $col.selectAll('g.' + this.textClass + '[data-index="' + index + '"]');
    };
    CategoricalRenderer.prototype.renderCanvas = function (ctx, col, rows, context) {
        ctx.save();
        rows.forEach(function (d, i) {
            var x = context.cellX(i);
            var y = context.cellY(i);
            ctx.fillStyle = 'black';
            ctx.fillText(col.getLabel(d), x + context.rowHeight(i), y);
            ctx.fillStyle = col.getColor(d);
            ctx.fillRect(x, y + context.option('rowPadding', 1), Math.max(context.rowHeight(i) - context.option('rowPadding', 1) * 2, 0), Math.max(context.rowHeight(i) - context.option('rowPadding', 1) * 2, 0));
        });
    };
    return CategoricalRenderer;
}(DefaultCellRenderer));
/**
 * renders a stacked column using composite pattern
 */
var StackCellRenderer = (function (_super) {
    __extends(StackCellRenderer, _super);
    function StackCellRenderer(nestingPossible) {
        if (nestingPossible === void 0) { nestingPossible = true; }
        _super.call(this);
        this.nestingPossible = nestingPossible;
    }
    StackCellRenderer.prototype.renderImpl = function ($base, col, context, perChild, rowGetter, animated) {
        if (animated === void 0) { animated = true; }
        var $group = $base.datum(col), children = col.children, stacked = this.nestingPossible && context.showStacked(col);
        var offset = 0, shifts = children.map(function (d) {
            var r = offset;
            offset += d.getWidth();
            offset += (!stacked ? context.option('columnPadding', 0) : 0);
            return r;
        });
        var baseclass = 'component' + context.option('stackLevel', '');
        var ueber = context.cellX;
        var ueberOption = context.option;
        context.option = function (option, default_) {
            var r = ueberOption(option, default_);
            return option === 'stackLevel' ? r + 'N' : r;
        };
        //map all children to g elements
        var $children = $group.selectAll('g.' + baseclass).data(children, function (d) { return d.id; });
        //shift children horizontally
        $children.enter().append('g').attr({
            'class': baseclass,
            transform: function (d, i) { return 'translate(' + shifts[i] + ',0)'; }
        });
        //for each children render the column
        $children.attr({
            'class': function (d) { return baseclass + ' ' + d.desc.type; },
            'data-stack': function (d, i) { return i; }
        }).each(function (d, i) {
            if (stacked) {
                var preChildren_1 = children.slice(0, i);
                //if shown as stacked bar shift individual cells of a column to the left where they belong to
                context.cellX = function (index) {
                    //shift by all the empty space left from the previous columns
                    return ueber(index) - preChildren_1.reduce(function (prev, child) { return prev + child.getWidth() * (1 - child.getValue(rowGetter(index))); }, 0);
                };
            }
            perChild(__WEBPACK_IMPORTED_MODULE_1_d3__["select"](this), d, i, context);
        });
        (animated ? context.animated($children) : $children).attr({
            transform: function (d, i) { return 'translate(' + shifts[i] + ',0)'; }
        });
        $children.exit().remove();
        context.cellX = ueber;
        context.option = ueberOption;
    };
    StackCellRenderer.prototype.render = function ($col, stack, rows, context) {
        this.renderImpl($col, stack, context, function ($child, col, i, ccontext) {
            ccontext.render(col, $child, rows, ccontext);
        }, function (index) { return rows[index]; });
    };
    StackCellRenderer.prototype.mouseEnter = function ($col, $row, stack, row, index, context) {
        var baseclass = 'component' + context.option('stackLevel', '');
        this.renderImpl($row, stack, context, function ($row_i, col, i, ccontext) {
            var $col_i = $col.select('g.' + baseclass + '[data-stack="' + i + '"]');
            if (!$col_i.empty()) {
                ccontext.renderer(col).mouseEnter($col_i, $row_i, col, row, index, ccontext);
            }
        }, function (index) { return row; }, false);
    };
    StackCellRenderer.prototype.mouseLeave = function ($col, $row, satck, row, index, context) {
        var baseclass = 'component' + context.option('stackLevel', '');
        this.renderImpl($row, satck, context, function ($row_i, col, i, ccontext) {
            var $col_i = $col.select('g.' + baseclass + '[data-stack="' + i + '"]');
            if (!$col_i.empty()) {
                ccontext.renderer(col).mouseLeave($col_i, $row_i, col, row, index, ccontext);
            }
        }, function (index) { return row; }, false);
        $row.selectAll('*').remove();
    };
    StackCellRenderer.prototype.renderCanvas = function (ctx, stack, rows, context) {
        var children = stack.children, stacked = this.nestingPossible && context.showStacked(stack);
        var offset = 0, shifts = children.map(function (d) {
            var r = offset;
            offset += d.getWidth();
            offset += (!stacked ? context.option('columnPadding', 0) : 0);
            return r;
        });
        var ueber = context.cellX;
        var ueberOption = context.option;
        context.option = function (option, default_) {
            var r = ueberOption(option, default_);
            return option === 'stackLevel' ? r + 'N' : r;
        };
        ctx.save();
        children.forEach(function (child, i) {
            ctx.save();
            ctx.translate(shifts[i], 0);
            if (stacked) {
                var preChildren_2 = children.slice(0, i);
                //if shown as stacked bar shift individual cells of a column to the left where they belong to
                context.cellX = function (index) {
                    //shift by all the empty space left from the previous columns
                    return ueber(index) - preChildren_2.reduce(function (prev, child) { return prev + child.getWidth() * (1 - child.getValue(rows[index])); }, 0);
                };
            }
            context.renderCanvas(child, ctx, rows, context);
            ctx.restore();
        });
        ctx.restore();
        context.cellX = ueber;
        context.option = ueberOption;
    };
    return StackCellRenderer;
}(DefaultCellRenderer));
/**
 * defines a custom renderer object
 * @param selector d3 selector, e.g. text.my
 * @param render render function
 * @param extras additional functions
 * @returns {DerivedCellRenderer}
 */
function createRenderer(selector, render, extras) {
    var _this = this;
    if (extras === void 0) { extras = {}; }
    extras.selector = selector;
    extras.render = render;
    extras.findRow = function ($col, index) { return $col.selectAll(_this.selector + '[data-index="' + index + '"]'); };
    var r = new DerivedCellRenderer(extras);
    return r;
}
var combineRenderer = barRenderer({
    colorOf: function (d, i, col) { return col.getColor(d); }
});
/**
 * returns a map of all known renderers by type
 * @return
 */
function renderers() {
    return {
        string: new StringCellRenderer(),
        link: new LinkCellRenderer(),
        number: barRenderer(),
        rank: defaultRenderer({
            textClass: 'rank',
            align: 'right'
        }),
        boolean: defaultRenderer({
            textClass: 'boolean',
            align: 'center'
        }),
        heatmap: new HeatMapCellRenderer(),
        stack: new StackCellRenderer(),
        categorical: new CategoricalRenderer(),
        ordinal: barRenderer({
            renderValue: true,
            colorOf: function (d, i, col) { return col.getColor(d); }
        }),
        max: combineRenderer,
        min: combineRenderer,
        mean: combineRenderer,
        script: combineRenderer,
        actions: new ActionCellRenderer(),
        annotate: new AnnotateCellRenderer(),
        selection: new SelectionCellRenderer(),
        nested: new StackCellRenderer(false)
    };
}


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__model__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__mappingeditor__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_d3__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_d3___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_d3__);
/* harmony export (immutable) */ exports["dialogForm"] = dialogForm;
/* harmony export (immutable) */ exports["makePopup"] = makePopup;
/* harmony export (immutable) */ exports["openRenameDialog"] = openRenameDialog;
/* harmony export (immutable) */ exports["openEditLinkDialog"] = openEditLinkDialog;
/* harmony export (immutable) */ exports["openSearchDialog"] = openSearchDialog;
/* harmony export (immutable) */ exports["openEditWeightsDialog"] = openEditWeightsDialog;
/* harmony export (immutable) */ exports["openEditScriptDialog"] = openEditScriptDialog;
/* harmony export (immutable) */ exports["filterDialogs"] = filterDialogs;
/**
 * a set of simple dialogs for LineUp
 *
 * Created by Samuel Gratzl on 24.08.2015.
 */




function dialogForm(title, body, buttonsWithLabel) {
    if (buttonsWithLabel === void 0) { buttonsWithLabel = false; }
    return '<span style="font-weight: bold" class="lu-popup-title">' + title + '</span>' +
        '<form onsubmit="return false">' +
        body + '<button type = "submit" class="ok fa fa-check" title="ok"></button>' +
        '<button type = "reset" class="cancel fa fa-times" title="cancel"></button>' +
        '<button type = "button" class="reset fa fa-undo" title="reset"></button></form>';
}
/**
 * creates a simple popup dialog under the given attachment
 * @param attachment
 * @param title
 * @param body
 * @returns {Selection<any>}
 */
function makePopup(attachement, title, body) {
    var pos = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["offset"])(attachement.node());
    var $popup = __WEBPACK_IMPORTED_MODULE_3_d3__["select"]('body').append('div')
        .attr({
        'class': 'lu-popup2'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
    }).html(dialogForm(title, body));
    function movePopup() {
        //.style("left", (this.parentElement.offsetLeft + (<any>d3.event).dx) + 'px')
        //.style("top", (this.parentElement.offsetTop + d3.event.dy) + 'px');
        //const mouse = d3.mouse(this.parentElement);
        $popup.style({
            left: (this.parentElement.offsetLeft + __WEBPACK_IMPORTED_MODULE_3_d3__["event"].dx) + 'px',
            top: (this.parentElement.offsetTop + __WEBPACK_IMPORTED_MODULE_3_d3__["event"].dy) + 'px'
        });
    }
    $popup.select('span.lu-popup-title').call(__WEBPACK_IMPORTED_MODULE_3_d3__["behavior"].drag().on('drag', movePopup));
    $popup.on('keydown', function () {
        if (__WEBPACK_IMPORTED_MODULE_3_d3__["event"].which === 27) {
            $popup.remove();
        }
    });
    var auto = $popup.select('input[autofocus]').node();
    if (auto) {
        auto.focus();
    }
    return $popup;
}
/**
 * opens a rename dialog for the given column
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openRenameDialog(column, $header) {
    var popup = makePopup($header, 'Rename Column', "\n    <input type=\"text\" size=\"15\" value=\"" + column.label + "\" required=\"required\" autofocus=\"autofocus\"><br>\n    <input type=\"color\" size=\"15\" value=\"" + column.color + "\" required=\"required\"><br>\n    <textarea rows=\"5\">" + column.description + "</textarea><br>");
    popup.select('.ok').on('click', function () {
        var newValue = popup.select('input[type="text"]').property('value');
        var newColor = popup.select('input[type="color"]').property('value');
        var newDescription = popup.select('textarea').property('value');
        column.setMetaData({ label: newValue, color: newColor, description: newDescription });
        popup.remove();
    });
    popup.select('.cancel').on('click', function () {
        popup.remove();
    });
}
/**
 * opens a dialog for editing the link of a column
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openEditLinkDialog(column, $header, templates) {
    if (templates === void 0) { templates = []; }
    var t = "<input type=\"text\" size=\"15\" value=\"" + column.getLink() + "\" required=\"required\" autofocus=\"autofocus\" " + (templates.length > 0 ? 'list="lineupPatternList"' : '') + "><br>";
    if (templates.length > 0) {
        t += '<datalist id="lineupPatternList">' + templates.map(function (t) { return ("<option value=\"" + t + "\">"); }) + '</datalist>';
    }
    var popup = makePopup($header, 'Edit Link ($ as Placeholder)', t);
    popup.select('.ok').on('click', function () {
        var newValue = popup.select('input[type="text"]').property('value');
        column.setLink(newValue);
        popup.remove();
    });
    popup.select('.cancel').on('click', function () {
        popup.remove();
    });
}
/**
 * opens a search dialog for the given column
 * @param column the column to rename
 * @param $header the visual header element of this column
 * @param provider the data provider for the actual search
 */
function openSearchDialog(column, $header, provider) {
    var popup = makePopup($header, 'Search', '<input type="text" size="15" value="" required="required" autofocus="autofocus"><br><label><input type="checkbox">RegExp</label><br>');
    popup.select('input[type="text"]').on('input', function () {
        var search = this.value;
        if (search.length >= 3) {
            var isRegex = popup.select('input[type="checkbox"]').property('checked');
            if (isRegex) {
                search = new RegExp(search);
            }
            provider.searchSelect(search, column);
        }
    });
    function updateImpl() {
        var search = popup.select('input[type="text"]').property('value');
        var isRegex = popup.select('input[type="text"]').property('checked');
        if (search.length > 0) {
            if (isRegex) {
                search = new RegExp(search);
            }
            provider.searchSelect(search, column);
        }
        popup.remove();
    }
    popup.select('input[type="checkbox"]').on('change', updateImpl);
    popup.select('.ok').on('click', updateImpl);
    popup.select('.cancel').on('click', function () {
        popup.remove();
    });
}
/**
 * opens a dialog for editing the weights of a stack column
 * @param column the column to filter
 * @param $header the visual header element of this column
 */
function openEditWeightsDialog(column, $header) {
    var weights = column.getWeights(), children = column.children.map(function (d, i) { return ({ col: d, weight: weights[i] * 100 }); });
    //map weights to pixels
    var scale = __WEBPACK_IMPORTED_MODULE_3_d3__["scale"].linear().domain([0, 100]).range([0, 120]);
    var $popup = makePopup($header, 'Edit Weights', '<table></table>');
    //show as a table with inputs and bars
    var $rows = $popup.select('table').selectAll('tr').data(children);
    var $rows_enter = $rows.enter().append('tr');
    $rows_enter.append('td')
        .append('input').attr({
        type: 'number',
        value: function (d) { return d.weight; },
        min: 0,
        max: 100,
        size: 5
    }).on('input', function (d) {
        d.weight = +this.value;
        redraw();
    });
    $rows_enter.append('td').append('div')
        .attr('class', function (d) { return 'bar ' + d.col.cssClass; })
        .style('background-color', function (d) { return d.col.color; });
    $rows_enter.append('td').text(function (d) { return d.col.label; });
    function redraw() {
        $rows.select('.bar').transition().style('width', function (d) { return scale(d.weight) + 'px'; });
    }
    redraw();
    $popup.select('.cancel').on('click', function () {
        column.setWeights(weights);
        $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
        children.forEach(function (d, i) { return d.weight = weights[i] * 100; });
        $rows.select('input').property('value', function (d) { return d.weight; });
        redraw();
    });
    $popup.select('.ok').on('click', function () {
        column.setWeights(children.map(function (d) { return d.weight; }));
        $popup.remove();
    });
}
/**
 * flags the header to be filtered
 * @param $header
 * @param filtered
 */
function markFiltered($header, filtered) {
    if (filtered === void 0) { filtered = false; }
    $header.classed('filtered', filtered);
}
function sortbyName(prop) {
    return function (a, b) {
        var av = a[prop], bv = b[prop];
        if (av.toLowerCase() < bv.toLowerCase()) {
            return -1;
        }
        if (av.toLowerCase() > bv.toLowerCase()) {
            return 1;
        }
        return 0;
    };
}
/**
 * opens a dialog for filtering a categorical column
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openCategoricalFilter(column, $header) {
    var bak = column.getFilter() || [];
    var popup = makePopup($header, 'Edit Filter', '<div class="selectionTable"><table><thead><th class="selectAll"></th><th>Category</th></thead><tbody></tbody></table></div>');
    // list all data rows !
    var colors = column.categoryColors, labels = column.categoryLabels;
    var trData = column.categories.map(function (d, i) {
        return { cat: d, label: labels[i], isChecked: bak.length === 0 || bak.indexOf(d) >= 0, color: colors[i] };
    }).sort(sortbyName('label'));
    var $rows = popup.select('tbody').selectAll('tr').data(trData);
    var $rows_enter = $rows.enter().append('tr');
    $rows_enter.append('td').attr('class', 'checkmark');
    $rows_enter.append('td').attr('class', 'datalabel').text(function (d) { return d.label; });
    $rows_enter.on('click', function (d) {
        d.isChecked = !d.isChecked;
        redraw();
    });
    function redraw() {
        $rows.select('.checkmark').html(function (d) { return '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>'; });
        $rows.select('.datalabel').style('opacity', function (d) { return d.isChecked ? '1.0' : '.8'; });
    }
    redraw();
    var isCheckedAll = true;
    function redrawSelectAll() {
        popup.select('.selectAll').html(function (d) { return '<i class="fa fa-' + ((isCheckedAll) ? 'check-' : '') + 'square-o"></i>'; });
        popup.select('thead').on('click', function (d) {
            isCheckedAll = !isCheckedAll;
            trData.forEach(function (row) { return row.isChecked = isCheckedAll; });
            redraw();
            redrawSelectAll();
        });
    }
    redrawSelectAll();
    function updateData(filter) {
        markFiltered($header, filter && filter.length > 0 && filter.length < trData.length);
        column.setFilter(filter);
    }
    popup.select('.cancel').on('click', function () {
        updateData(bak);
        popup.remove();
    });
    popup.select('.reset').on('click', function () {
        trData.forEach(function (d) { return d.isChecked = true; });
        redraw();
        updateData(null);
    });
    popup.select('.ok').on('click', function () {
        var f = trData.filter(function (d) { return d.isChecked; }).map(function (d) { return d.cat; });
        if (f.length === trData.length) {
            f = [];
        }
        updateData(f);
        popup.remove();
    });
}
/**
 * opens a dialog for filtering a string column
 * @param column the column to filter
 * @param $header the visual header element of this column
 */
function openStringFilter(column, $header) {
    var bak = column.getFilter() || '', bakMissing = bak === __WEBPACK_IMPORTED_MODULE_0__model__["StringColumn"].FILTER_MISSING;
    if (bakMissing) {
        bak = '';
    }
    var $popup = makePopup($header, 'Filter', "<input type=\"text\" placeholder=\"containing...\" autofocus=\"true\" size=\"15\" value=\"" + ((bak instanceof RegExp) ? bak.source : bak) + "\" autofocus=\"autofocus\">\n    <br><label><input type=\"checkbox\" " + ((bak instanceof RegExp) ? 'checked="checked"' : '') + ">RegExp</label><br><label><input class=\"lu_filter_missing\" type=\"checkbox\" " + (bakMissing ? 'checked="checked"' : '') + ">Filter Missing</label>\n    <br>");
    function updateData(filter) {
        markFiltered($header, (filter && filter !== ''));
        column.setFilter(filter);
    }
    function updateImpl(force) {
        //get value
        var search = $popup.select('input[type="text"]').property('value');
        var filterMissing = $popup.select('input[type="checkbox"].lu_filter_missing').property('checked');
        if (filterMissing && search === '') {
            search = __WEBPACK_IMPORTED_MODULE_0__model__["StringColumn"].FILTER_MISSING;
        }
        if (search === '') {
            updateData(search);
            return;
        }
        if (search.length >= 3 || force) {
            var isRegex = $popup.select('input[type="checkbox"]:first-of-type').property('checked');
            if (isRegex && search !== __WEBPACK_IMPORTED_MODULE_0__model__["StringColumn"].FILTER_MISSING) {
                search = new RegExp(search);
            }
            updateData(search);
        }
    }
    $popup.selectAll('input[type="checkbox"]').on('change', updateImpl);
    $popup.select('input[type="text"]').on('input', updateImpl);
    $popup.select('.cancel').on('click', function () {
        $popup.select('input[type="text"]').property('value', bak || '');
        $popup.select('input[type="checkbox"]:first-of-type').property('checked', bak instanceof RegExp ? 'checked' : null);
        $popup.select('input[type="checkbox"].lu_filter_missing').property('checked', bakMissing ? 'checked' : null);
        updateData(bak);
        $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
        $popup.select('input[type="text"]').property('value', '');
        $popup.selectAll('input[type="checkbox"]').property('checked', null);
        updateData(null);
    });
    $popup.select('.ok').on('click', function () {
        updateImpl(true);
        $popup.remove();
    });
}
/**
 * opens a dialog for filtering a boolean column
 * @param column the column to filter
 * @param $header the visual header element of this column
 */
function openBooleanFilter(column, $header) {
    var bak = column.getFilter();
    var $popup = makePopup($header, 'Filter', "<label><input type=\"radio\" name=\"boolean_check\" value=\"null\" " + (bak === null ? 'checked="checked"' : '') + ">No Filter</label><br>\n     <label><input type=\"radio\" name=\"boolean_check\" value=\"true\" " + (bak === true ? 'checked="checked"' : '') + ">True</label><br>\n     <label><input type=\"radio\" name=\"boolean_check\" value=\"false\" " + (bak === false ? 'checked="checked"' : '') + ">False</label>\n    <br>");
    function updateData(filter) {
        markFiltered($header, (filter !== null));
        column.setFilter(filter);
    }
    function updateImpl(force) {
        //get value
        var isTrue = $popup.select('input[type="radio"][value="true"]').property('checked');
        var isFalse = $popup.select('input[type="radio"][value="false"]').property('checked');
        updateData(isTrue ? true : (isFalse ? false : null));
    }
    $popup.selectAll('input[type="radio"]').on('change', updateImpl);
    $popup.select('.cancel').on('click', function () {
        updateData(bak);
        $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
        var v = bak === null ? 'null' : String(bak);
        $popup.selectAll('input[type="radio"]').property('checked', function () {
            return this.value === v;
        });
        updateData(null);
    });
    $popup.select('.ok').on('click', function () {
        updateImpl(true);
        $popup.remove();
    });
}
/**
 * opens a dialog for editing the script code
 * @param column the column to edit
 * @param $header the visual header element of this column
 */
function openEditScriptDialog(column, $header) {
    var bak = column.getScript();
    var $popup = makePopup($header, 'Edit Script', "Parameters: <code>values: number[], children: Column[]</code><br>\n      <textarea autofocus=\"true\" rows=\"5\" autofocus=\"autofocus\" style=\"width: 95%;\">" + column.getScript() + "</textarea><br>");
    function updateData(script) {
        column.setScript(script);
    }
    function updateImpl() {
        //get value
        var script = $popup.select('textarea').property('value');
        updateData(script);
    }
    $popup.select('.cancel').on('click', function () {
        $popup.select('textarea').property('value', bak);
        updateData(bak);
        $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
        $popup.select('textarea').property('value', __WEBPACK_IMPORTED_MODULE_0__model__["ScriptColumn"].DEFAULT_SCRIPT);
        updateData(__WEBPACK_IMPORTED_MODULE_0__model__["ScriptColumn"].DEFAULT_SCRIPT);
    });
    $popup.select('.ok').on('click', function () {
        updateImpl();
        $popup.remove();
    });
}
/**
 * opens the mapping editor for a given NumberColumn
 * @param column the column to rename
 * @param $header the visual header element of this column
 * @param data the data provider for illustrating the mapping by example
 */
function openMappingEditor(column, $header, data) {
    var pos = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["offset"])($header.node()), bak = column.getMapping(), original = column.getOriginalMapping(), bakfilter = column.getFilter(), act = bak.clone(), actfilter = bakfilter;
    var popup = __WEBPACK_IMPORTED_MODULE_3_d3__["select"]('body').append('div')
        .attr({
        'class': 'lu-popup'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
    })
        .html(dialogForm('Change Mapping', '<div class="mappingArea"></div>'));
    function applyMapping(newscale, filter) {
        act = newscale;
        actfilter = filter;
        markFiltered($header, !newscale.eq(original) || (bakfilter.min !== filter.min || bakfilter.max !== filter.min));
        column.setMapping(newscale);
        column.setFilter(filter);
    }
    var editorOptions = {
        callback: applyMapping,
        triggerCallback: 'dragend'
    };
    var data_sample = data.mappingSample(column);
    var editor = new __WEBPACK_IMPORTED_MODULE_2__mappingeditor__["a" /* default */](popup.select('.mappingArea').node(), act, original, actfilter, data_sample, editorOptions);
    popup.select('.ok').on('click', function () {
        applyMapping(editor.scale, editor.filter);
        popup.remove();
    });
    popup.select('.cancel').on('click', function () {
        column.setMapping(bak);
        markFiltered($header, !bak.eq(original));
        popup.remove();
    });
    popup.select('.reset').on('click', function () {
        bak = original;
        act = bak.clone();
        bakfilter = { min: -Infinity, max: +Infinity };
        actfilter = bakfilter;
        applyMapping(act, actfilter);
        popup.selectAll('.mappingArea *').remove();
        editor = new __WEBPACK_IMPORTED_MODULE_2__mappingeditor__["a" /* default */](popup.select('.mappingArea').node(), act, original, actfilter, data_sample, editorOptions);
    });
}
/**
 * opens the mapping editor for a given CategoricalNumberColumn, i.e. to map categories to numbers
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openCategoricalMappingEditor(column, $header) {
    var bak = column.getFilter() || [];
    var scale = __WEBPACK_IMPORTED_MODULE_3_d3__["scale"].linear().domain([0, 100]).range([0, 120]);
    var $popup = makePopup($header, 'Edit Categorical Mapping', '<div class="selectionTable"><table><thead><th class="selectAll"></th><th colspan="2">Scale</th><th>Category</th></thead><tbody></tbody></table></div>');
    var range = column.getScale().range, colors = column.categoryColors, labels = column.categoryLabels;
    var trData = column.categories.map(function (d, i) {
        return { cat: d, label: labels[i], isChecked: bak.length === 0 || bak.indexOf(d) >= 0, range: range[i] * 100, color: colors[i] };
    }).sort(sortbyName('label'));
    var $rows = $popup.select('tbody').selectAll('tr').data(trData);
    var $rows_enter = $rows.enter().append('tr');
    $rows_enter.append('td').attr('class', 'checkmark').on('click', function (d) {
        d.isChecked = !d.isChecked;
        redraw();
    });
    $rows_enter.append('td')
        .append('input').attr({
        type: 'number',
        value: function (d) { return d.range; },
        min: 0,
        max: 100,
        size: 5
    }).on('input', function (d) {
        d.range = +this.value;
        redraw();
    });
    $rows_enter.append('td').append('div').attr('class', 'bar').style('background-color', function (d) { return d.color; });
    $rows_enter.append('td').attr('class', 'datalabel').text(function (d) { return d.label; });
    function redraw() {
        $rows.select('.checkmark').html(function (d) { return '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>'; });
        $rows.select('.bar').transition().style('width', function (d) { return scale(d.range) + 'px'; });
        $rows.select('.datalabel').style('opacity', function (d) { return d.isChecked ? '1.0' : '.8'; });
    }
    redraw();
    var isCheckedAll = true;
    function redrawSelectAll() {
        $popup.select('.selectAll').html(function (d) { return '<i class="fa fa-' + ((isCheckedAll) ? 'check-' : '') + 'square-o"></i>'; });
        $popup.select('thead').on('click', function (d) {
            isCheckedAll = !isCheckedAll;
            trData.forEach(function (row) { return row.isChecked = isCheckedAll; });
            redraw();
            redrawSelectAll();
        });
    }
    redrawSelectAll();
    function updateData(filter) {
        markFiltered($header, filter && filter.length > 0 && filter.length < trData.length);
        column.setFilter(filter);
    }
    $popup.select('.cancel').on('click', function () {
        updateData(bak);
        column.setMapping(range);
        $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
        trData.forEach(function (d) {
            d.isChecked = true;
            d.range = 50;
        });
        redraw();
        updateData(null);
        column.setMapping(trData.map(function () { return 1; }));
    });
    $popup.select('.ok').on('click', function () {
        var f = trData.filter(function (d) { return d.isChecked; }).map(function (d) { return d.cat; });
        if (f.length === trData.length) {
            f = [];
        }
        updateData(f);
        column.setMapping(trData.map(function (d) { return d.range / 100; }));
        $popup.remove();
    });
}
/**
 * returns all known filter dialogs mappings by type
 * @return
 */
function filterDialogs() {
    return {
        string: openStringFilter,
        categorical: openCategoricalFilter,
        number: openMappingEditor,
        ordinal: openCategoricalMappingEditor,
        boolean: openBooleanFilter
    };
}


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__model__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_d3__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_d3___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_d3__);
/* harmony export (binding) */ __webpack_require__.d(exports, "DataProvider", function() { return DataProvider; });
/* harmony export (binding) */ __webpack_require__.d(exports, "CommonDataProvider", function() { return CommonDataProvider; });
/* harmony export (binding) */ __webpack_require__.d(exports, "LocalDataProvider", function() { return LocalDataProvider; });
/* harmony export (binding) */ __webpack_require__.d(exports, "RemoteDataProvider", function() { return RemoteDataProvider; });
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};



/**
 * computes the simple statistics of an array using d3 histogram
 * @param arr the data array
 * @param acc accessor function
 * @param range the total value range
 * @returns {{min: number, max: number, count: number, hist: histogram.Bin<number>[]}}
 */
function computeStats(arr, acc, range) {
    if (arr.length === 0) {
        return {
            min: NaN,
            max: NaN,
            mean: NaN,
            count: 0,
            maxBin: 0,
            hist: []
        };
    }
    var hist = __WEBPACK_IMPORTED_MODULE_2_d3__["layout"].histogram().value(acc);
    if (range) {
        hist.range(function () { return range; });
    }
    var ex = __WEBPACK_IMPORTED_MODULE_2_d3__["extent"](arr, acc);
    var hist_data = hist(arr);
    return {
        min: ex[0],
        max: ex[1],
        mean: __WEBPACK_IMPORTED_MODULE_2_d3__["mean"](arr, acc),
        count: arr.length,
        maxBin: __WEBPACK_IMPORTED_MODULE_2_d3__["max"](hist_data, function (d) { return d.y; }),
        hist: hist_data
    };
}
/**
 * computes a categorical histogram
 * @param arr the data array
 * @param acc the accessor
 * @param categories the list of known categories
 * @returns {{hist: {cat: string, y: number}[]}}
 */
function computeHist(arr, acc, categories) {
    var m = __WEBPACK_IMPORTED_MODULE_2_d3__["map"]();
    categories.forEach(function (cat) { return m.set(cat, 0); });
    arr.forEach(function (a) {
        var vs = acc(a);
        if (vs == null) {
            return;
        }
        vs.forEach(function (v) {
            m.set(v, (m.get(v) || 0) + 1);
        });
    });
    return {
        maxBin: __WEBPACK_IMPORTED_MODULE_2_d3__["max"](m.values()),
        hist: m.entries().map(function (entry) { return ({ cat: entry.key, y: entry.value }); })
    };
}
function isSupportType(col) {
    return ['rank', 'selection', 'actions'].indexOf(col.type) >= 0;
}
/**
 * a basic data provider holding the data and rankings
 */
var DataProvider = (function (_super) {
    __extends(DataProvider, _super);
    function DataProvider(options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        _super.call(this);
        /**
         * all rankings
         * @type {Array}
         * @private
         */
        this.rankings_ = [];
        /**
         * the current selected indices
         * @type {Set}
         */
        this.selection = __WEBPACK_IMPORTED_MODULE_2_d3__["set"]();
        this.uid = 0;
        /**
         * lookup map of a column type to its column implementation
         */
        this.columnTypes = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])({}, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["models"])());
        this.createHelper = function (d) {
            //factory method for restoring a column
            var desc = _this.fromDescRef(d.desc);
            var c = null;
            if (desc && desc.type) {
                _this.fixDesc(d.desc);
                var type = _this.columnTypes[desc.type];
                c = new type(d.id, desc);
                c.restore(d, _this.createHelper);
            }
            return c;
        };
        this.columnTypes = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["models"])(), options.columnTypes || {});
    }
    /**
     * events:
     *  * column changes: addColumn, removeColumn
     *  * ranking changes: addRanking, removeRanking
     *  * dirty: dirty, dirtyHeder, dirtyValues
     *  * selectionChanged
     * @returns {string[]}
     */
    DataProvider.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['addColumn', 'removeColumn', 'addRanking', 'removeRanking', 'dirty', 'dirtyHeader', 'dirtyValues', 'orderChanged', 'selectionChanged']);
    };
    /**
     * returns a list of all known column descriptions
     * @returns {Array}
     */
    DataProvider.prototype.getColumns = function () {
        return [];
    };
    /**
     * adds a new ranking
     * @param existing an optional existing ranking to clone
     * @return the new ranking
     */
    DataProvider.prototype.pushRanking = function (existing) {
        var r = this.cloneRanking(existing);
        this.insertRanking(r);
        return r;
    };
    DataProvider.prototype.takeSnapshot = function (col) {
        var r = this.cloneRanking();
        r.push(this.clone(col));
        this.insertRanking(r);
        return r;
    };
    DataProvider.prototype.insertRanking = function (r, index) {
        if (index === void 0) { index = this.rankings_.length; }
        this.rankings_.splice(index, 0, r);
        this.forward(r, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'orderChanged.provider', 'dirtyValues.provider');
        var that = this;
        //delayed reordering per ranking
        r.on('dirtyOrder.provider', __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["delayedCall"])(function () {
            that.triggerReorder(this.source);
        }, 100, null));
        this.fire(['addRanking', 'dirtyHeader', 'dirtyValues', 'dirty'], r, index);
        this.triggerReorder(r);
    };
    DataProvider.prototype.triggerReorder = function (ranking) {
        this.sort(ranking).then(function (order) { return ranking.setOrder(order); });
    };
    /**
     * removes a ranking from this data provider
     * @param ranking
     * @returns {boolean}
     */
    DataProvider.prototype.removeRanking = function (ranking) {
        var i = this.rankings_.indexOf(ranking);
        if (i < 0) {
            return false;
        }
        this.unforward(ranking, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'orderChanged.provider', 'dirtyOrder.provider', 'dirtyValues.provider');
        this.rankings_.splice(i, 1);
        ranking.on('dirtyOrder.provider', null);
        this.cleanUpRanking(ranking);
        this.fire(['removeRanking', 'dirtyHeader', 'dirtyValues', 'dirty'], ranking, i);
        return true;
    };
    /**
     * removes all rankings
     */
    DataProvider.prototype.clearRankings = function () {
        var _this = this;
        this.rankings_.forEach(function (ranking) {
            _this.unforward(ranking, 'addColumn.provider', 'removeColumn.provider', 'dirty.provider', 'dirtyHeader.provider', 'dirtyOrder.provider', 'dirtyValues.provider');
            ranking.on('dirtyOrder.provider', null);
            _this.cleanUpRanking(ranking);
        });
        this.rankings_ = [];
        this.fire(['removeRanking', 'dirtyHeader', 'dirtyValues', 'dirty'], null);
    };
    /**
     * returns a list of all current rankings
     * @returns {Ranking[]}
     */
    DataProvider.prototype.getRankings = function () {
        return this.rankings_.slice();
    };
    /**
     * returns the last ranking for quicker access
     * @returns {Ranking}
     */
    DataProvider.prototype.getLastRanking = function () {
        return this.rankings_[this.rankings_.length - 1];
    };
    /**
     * hook method for cleaning up a ranking
     * @param ranking
     */
    DataProvider.prototype.cleanUpRanking = function (ranking) {
        //nothing to do
    };
    /**
     * abstract method for cloning a ranking
     * @param existing
     * @returns {null}
     */
    DataProvider.prototype.cloneRanking = function (existing) {
        return null; //implement me
    };
    /**
     * adds a column to a ranking described by its column description
     * @param ranking the ranking to add the column to
     * @param desc the description of the column
     * @return {Column} the newly created column or null
     */
    DataProvider.prototype.push = function (ranking, desc) {
        var r = this.create(desc);
        if (r) {
            ranking.push(r);
            return r;
        }
        return null;
    };
    /**
     * adds a column to a ranking described by its column description
     * @param ranking the ranking to add the column to
     * @param index the position to insert the column
     * @param desc the description of the column
     * @return {Column} the newly created column or null
     */
    DataProvider.prototype.insert = function (ranking, index, desc) {
        var r = this.create(desc);
        if (r) {
            ranking.insert(r, index);
            return r;
        }
        return null;
    };
    /**
     * creates a new unique id for a column
     * @returns {string}
     */
    DataProvider.prototype.nextId = function () {
        return 'col' + (this.uid++);
    };
    DataProvider.prototype.rankAccessor = function (row, id, desc, ranking) {
        return 0;
    };
    DataProvider.prototype.fixDesc = function (desc) {
        var _this = this;
        //hacks for provider dependent descriptors
        if (desc.type === 'rank') {
            desc.accessor = this.rankAccessor.bind(this);
        }
        else if (desc.type === 'selection') {
            desc.accessor = function (row) { return _this.isSelected(row._index); };
            desc.setter = function (row, value) { return value ? _this.select(row._index) : _this.deselect(row._index); };
        }
    };
    /**
     * creates an internal column model out of the given column description
     * @param desc
     * @returns {Column] the new column or null if it can't be created
     */
    DataProvider.prototype.create = function (desc) {
        this.fixDesc(desc);
        //find by type and instantiate
        var type = this.columnTypes[desc.type];
        if (type) {
            return new type(this.nextId(), desc);
        }
        return null;
    };
    /**
     * clones a column by dumping and restoring
     * @param col
     * @returns {Column}
     */
    DataProvider.prototype.clone = function (col) {
        var dump = this.dumpColumn(col);
        return this.restoreColumn(dump);
    };
    /**
     * restores a column from a dump
     * @param dump
     * @returns {Column}
     */
    DataProvider.prototype.restoreColumn = function (dump) {
        var _this = this;
        var create = function (d) {
            var desc = _this.fromDescRef(d.desc);
            var type = _this.columnTypes[desc.type];
            _this.fixDesc(desc);
            var c = new type('', desc);
            c.restore(d, create);
            c.assignNewId(_this.nextId.bind(_this));
            return c;
        };
        return create(dump);
    };
    /**
     * finds a column in all rankings returning the first match
     * @param id_or_filter by id or by a filter function
     * @returns {Column}
     */
    DataProvider.prototype.find = function (id_or_filter) {
        //convert to function
        var filter = typeof (id_or_filter) === 'string' ? function (col) { return col.id === id_or_filter; } : id_or_filter;
        for (var i = 0; i < this.rankings_.length; ++i) {
            var r = this.rankings_[i].find(filter);
            if (r) {
                return r;
            }
        }
        return null;
    };
    /**
     * dumps this whole provider including selection and the rankings
     * @returns {{uid: number, selection: number[], rankings: *[]}}
     */
    DataProvider.prototype.dump = function () {
        var _this = this;
        return {
            uid: this.uid,
            selection: this.selection.values().map(Number),
            rankings: this.rankings_.map(function (r) { return r.dump(_this.toDescRef); })
        };
    };
    /**
     * dumps a specific column
     * @param col
     * @returns {any}
     */
    DataProvider.prototype.dumpColumn = function (col) {
        return col.dump(this.toDescRef);
    };
    /**
     * for better dumping describe reference, by default just return the description
     * @param desc
     * @returns {any}
     */
    DataProvider.prototype.toDescRef = function (desc) {
        return desc;
    };
    /**
     * inverse operation of toDescRef
     * @param descRef
     * @returns {any}
     */
    DataProvider.prototype.fromDescRef = function (descRef) {
        return descRef;
    };
    DataProvider.prototype.restoreRanking = function (dump) {
        var ranking = this.cloneRanking();
        ranking.restore(dump, this.createHelper);
        //if no rank column add one
        if (!ranking.children.some(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_0__model__["RankColumn"]; })) {
            ranking.insert(this.create(__WEBPACK_IMPORTED_MODULE_0__model__["RankColumn"].desc()), 0);
        }
        var idGenerator = this.nextId.bind(this);
        ranking.children.forEach(function (c) { return c.assignNewId(idGenerator); });
        return ranking;
    };
    DataProvider.prototype.restore = function (dump) {
        var _this = this;
        //clean old
        this.clearRankings();
        //restore selection
        this.uid = dump.uid || 0;
        if (dump.selection) {
            dump.selection.forEach(function (s) { return _this.selection.add(String(s)); });
        }
        //restore rankings
        if (dump.rankings) {
            dump.rankings.forEach(function (r) {
                var ranking = _this.cloneRanking();
                ranking.restore(r, _this.createHelper);
                //if no rank column add one
                if (!ranking.children.some(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_0__model__["RankColumn"]; })) {
                    ranking.insert(_this.create(__WEBPACK_IMPORTED_MODULE_0__model__["RankColumn"].desc()), 0);
                }
                _this.insertRanking(ranking);
            });
        }
        if (dump.layout) {
            Object.keys(dump.layout).forEach(function (key) {
                _this.deriveRanking(dump.layout[key]);
            });
        }
        //assign new ids
        var idGenerator = this.nextId.bind(this);
        this.rankings_.forEach(function (r) {
            r.children.forEach(function (c) { return c.assignNewId(idGenerator); });
        });
    };
    DataProvider.prototype.findDesc = function (ref) {
        return null;
    };
    /**
     * generates a default ranking by using all column descriptions ones
     */
    DataProvider.prototype.deriveDefault = function () {
        var _this = this;
        if (this.rankings_.length > 0) {
            //no default if we have a ranking
            return;
        }
        var r = this.pushRanking();
        this.getColumns().forEach(function (col) {
            if (!isSupportType(col)) {
                _this.push(r, col);
            }
        });
    };
    /**
     * derives a ranking from an old layout bundle format
     * @param bundle
     */
    DataProvider.prototype.deriveRanking = function (bundle) {
        var _this = this;
        var ranking = this.cloneRanking();
        ranking.clear();
        var toCol = function (column) {
            if (column.type === 'rank') {
                return _this.create(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["createRankDesc"])());
            }
            if (column.type === 'selection') {
                return _this.create(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["createSelectionDesc"])());
            }
            if (column.type === 'actions') {
                var r = _this.create(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["createActionDesc"])(column.label || 'actions'));
                r.restore(column, null);
                return r;
            }
            if (column.type === 'stacked') {
                //create a stacked one
                var r_1 = _this.create(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["createStackDesc"])(column.label || 'Combined'));
                (column.children || []).forEach(function (col) {
                    var c = toCol(col);
                    if (c) {
                        r_1.push(c);
                    }
                });
                return r_1;
            }
            else {
                var desc = _this.findDesc(column.column);
                if (desc) {
                    var r = _this.create(desc);
                    column.label = column.label || desc.label || desc.column;
                    r.restore(column, null);
                    return r;
                }
            }
            return null;
        };
        bundle.forEach(function (column) {
            var col = toCol(column);
            if (col) {
                ranking.push(col);
            }
        });
        //if no rank column add one
        if (!ranking.children.some(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_0__model__["RankColumn"]; })) {
            ranking.insert(this.create(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["createRankDesc"])()), 0);
        }
        this.insertRanking(ranking);
        return ranking;
    };
    /**
     * sorts the given ranking and eventually return a ordering of the data items
     * @param ranking
     * @return {Promise<any>}
     */
    DataProvider.prototype.sort = function (ranking) {
        return Promise.reject('not implemented');
    };
    /**
     * returns a view in the order of the given indices
     * @param indices
     * @return {Promise<any>}
     */
    DataProvider.prototype.view = function (indices) {
        return Promise.reject('not implemented');
    };
    /**
     * returns a data sample used for the mapping editor
     * @param col
     * @return {Promise<any>}
     */
    DataProvider.prototype.mappingSample = function (col) {
        return Promise.reject('not implemented');
    };
    /**
     * helper for computing statistics
     * @param indices
     * @returns {{stats: (function(INumberColumn): *), hist: (function(ICategoricalColumn): *)}}
     */
    DataProvider.prototype.stats = function (indices) {
        return {
            stats: function (col) { return Promise.reject('not implemented'); },
            hist: function (col) { return Promise.reject('not implemented'); }
        };
    };
    /**
     * method for computing the unique key of a row
     * @param row
     * @param i
     * @return {string}
     */
    DataProvider.prototype.rowKey = function (row, i) {
        return typeof (row) === 'number' ? String(row) : String(row._index);
    };
    /**
     * is the given row selected
     * @param index
     * @return {boolean}
     */
    DataProvider.prototype.isSelected = function (index) {
        return this.selection.has(String(index));
    };
    /**
     * also select the given row
     * @param index
     */
    DataProvider.prototype.select = function (index) {
        this.selection.add(String(index));
        this.fire('selectionChanged', this.selection.values().map(Number));
    };
    /**
     * hook for selecting elements matching the given arguments
     * @param search
     * @param col
     */
    DataProvider.prototype.searchSelect = function (search, col) {
        //implemented by custom provider
    };
    /**
     * also select all the given rows
     * @param indices
     * @param jumpToSelection whether the first selected row should be visible
     */
    DataProvider.prototype.selectAll = function (indices, jumpToSelection) {
        var _this = this;
        if (jumpToSelection === void 0) { jumpToSelection = false; }
        indices.forEach(function (index) {
            _this.selection.add(String(index));
        });
        this.fire('selectionChanged', this.selection.values().map(Number), jumpToSelection);
    };
    /**
     * set the selection to the given rows
     * @param indices
     * @param jumpToSelection whether the first selected row should be visible
     */
    DataProvider.prototype.setSelection = function (indices, jumpToSelection) {
        var _this = this;
        if (jumpToSelection === void 0) { jumpToSelection = false; }
        if (this.selection.size() === indices.length && indices.every(function (i) { return _this.selection.has(String(i)); })) {
            return; //no change
        }
        this.selection = __WEBPACK_IMPORTED_MODULE_2_d3__["set"]();
        this.selectAll(indices, jumpToSelection);
    };
    /**
     * toggles the selection of the given data index
     * @param index
     * @param additional just this element or all
     * @returns {boolean} whether the index is currently selected
     */
    DataProvider.prototype.toggleSelection = function (index, additional) {
        if (additional === void 0) { additional = false; }
        if (this.isSelected(index)) {
            if (additional) {
                this.deselect(index);
            }
            else {
                this.clearSelection();
            }
            return false;
        }
        else {
            if (additional) {
                this.select(index);
            }
            else {
                this.setSelection([index]);
            }
            return true;
        }
    };
    /**
     * deselect the given row
     * @param index
     */
    DataProvider.prototype.deselect = function (index) {
        this.selection.remove(String(index));
        this.fire('selectionChanged', this.selection.values().map(Number));
    };
    /**
     * returns a promise containing the selected rows
     * @return {Promise<any[]>}
     */
    DataProvider.prototype.selectedRows = function () {
        if (this.selection.empty()) {
            return Promise.resolve([]);
        }
        return this.view(this.getSelection());
    };
    /**
     * returns the currently selected indices
     * @returns {Array}
     */
    DataProvider.prototype.getSelection = function () {
        var indices = [];
        this.selection.forEach(function (s) { return indices.push(+s); });
        indices.sort();
        return indices;
    };
    /**
     * clears the selection
     */
    DataProvider.prototype.clearSelection = function () {
        this.selection = __WEBPACK_IMPORTED_MODULE_2_d3__["set"]();
        this.fire('selectionChanged', [], false);
    };
    /**
     * utility to export a ranking to a table with the given separator
     * @param ranking
     * @param options
     * @returns {Promise<string>}
     */
    DataProvider.prototype.exportTable = function (ranking, options) {
        if (options === void 0) { options = {}; }
        var op = {
            separator: '\t',
            newline: '\n',
            header: true,
            quote: false,
            quoteChar: '"',
            filter: function (c) { return !isSupportType(c); }
        };
        options = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(op, options);
        //optionally quote not numbers
        function quote(l, c) {
            if (op.quote && (!c || !__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["isNumberColumn"])(c))) {
                return op.quoteChar + l + op.quoteChar;
            }
            return l;
        }
        var columns = ranking.flatColumns.filter(function (c) { return op.filter(c.desc); });
        return this.view(ranking.getOrder()).then(function (data) {
            var r = [];
            if (op.header) {
                r.push(columns.map(function (d) { return quote(d.label); }).join(op.separator));
            }
            data.forEach(function (row) {
                r.push(columns.map(function (c) { return quote(c.getLabel(row), c); }).join(op.separator));
            });
            return r.join(op.newline);
        });
    };
    return DataProvider;
}(__WEBPACK_IMPORTED_MODULE_1__utils__["AEventDispatcher"]));
/**
 * common base implementation of a DataProvider with a fixed list of column descriptions
 */
var CommonDataProvider = (function (_super) {
    __extends(CommonDataProvider, _super);
    function CommonDataProvider(columns, options) {
        var _this = this;
        if (columns === void 0) { columns = []; }
        if (options === void 0) { options = {}; }
        _super.call(this, options);
        this.columns = columns;
        this.rankingIndex = 0;
        //generic accessor of the data item
        this.rowGetter = function (row, id, desc) { return row[desc.column]; };
        //generate the accessor
        columns.forEach(function (d) {
            d.accessor = d.accessor || _this.rowGetter;
            d.label = d.label || d.column;
        });
    }
    CommonDataProvider.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['addDesc']);
    };
    /**
     * adds another column description to this data provider
     * @param column
     */
    CommonDataProvider.prototype.pushDesc = function (column) {
        var d = column;
        d.accessor = d.accessor || this.rowGetter;
        d.label = column.label || d.column;
        this.columns.push(column);
        this.fire('addDesc', d);
    };
    CommonDataProvider.prototype.getColumns = function () {
        return this.columns.slice();
    };
    CommonDataProvider.prototype.findDesc = function (ref) {
        return this.columns.filter(function (c) { return c.column === ref; })[0];
    };
    /**
     * identify by the tuple type@columnname
     * @param desc
     * @returns {string}
     */
    CommonDataProvider.prototype.toDescRef = function (desc) {
        return desc.column ? desc.type + '@' + desc.column : desc;
    };
    CommonDataProvider.prototype.fromDescRef = function (descRef) {
        if (typeof (descRef) === 'string') {
            return this.columns.filter(function (d) { return d.type + '@' + d.column === descRef; })[0];
        }
        return descRef;
    };
    CommonDataProvider.prototype.restore = function (dump) {
        _super.prototype.restore.call(this, dump);
        this.rankingIndex = 1 + __WEBPACK_IMPORTED_MODULE_2_d3__["max"](this.getRankings(), function (r) { return +r.id.substring(4); });
    };
    CommonDataProvider.prototype.nextRankingId = function () {
        return 'rank' + (this.rankingIndex++);
    };
    return CommonDataProvider;
}(DataProvider));
/**
 * a data provider based on an local array
 */
var LocalDataProvider = (function (_super) {
    __extends(LocalDataProvider, _super);
    function LocalDataProvider(data, columns, options) {
        if (columns === void 0) { columns = []; }
        if (options === void 0) { options = {}; }
        _super.call(this, columns, options);
        this.data = data;
        this.options = {
            /**
             * whether the filter should be applied to all rankings regardless where they are
             */
            filterGlobally: false,
            /**
             * jump to search results such that they are visible
             */
            jumpToSearchResult: true
        };
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(this.options, options);
        //enhance with a magic attribute storing ranking information
        data.forEach(function (d, i) {
            d._rankings = {};
            d._index = i;
        });
        var that = this;
        this.reorderall = function () {
            //fire for all other rankings a dirty order event, too
            var ranking = this.source;
            that.getRankings().forEach(function (r) {
                if (r !== ranking) {
                    r.dirtyOrder();
                }
            });
        };
    }
    /**
     * replaces the dataset rows with a new one
     * @param data
     */
    LocalDataProvider.prototype.setData = function (data) {
        data.forEach(function (d, i) {
            d._rankings = {};
            d._index = i;
        });
        this.data = data;
        this.reorderall();
    };
    LocalDataProvider.prototype.clearData = function () {
        this.setData([]);
    };
    /**
     * append rows to the dataset
     * @param data
     */
    LocalDataProvider.prototype.appendData = function (data) {
        var l = this.data.length;
        data.forEach(function (d, i) {
            d._rankings = {};
            d._index = l + i;
        });
        this.data.push.apply(this.data, data);
        this.reorderall();
    };
    LocalDataProvider.prototype.rankAccessor = function (row, id, desc, ranking) {
        return (row._rankings[ranking.id] + 1) || 1;
    };
    LocalDataProvider.prototype.cloneRanking = function (existing) {
        var _this = this;
        var id = this.nextRankingId();
        var new_ = new __WEBPACK_IMPORTED_MODULE_0__model__["Ranking"](id);
        if (existing) {
            this.data.forEach(function (row) {
                var r = row._rankings;
                r[id] = r[existing.id];
            });
            //TODO better cloning
            existing.children.forEach(function (child) {
                _this.push(new_, child.desc);
            });
        }
        else {
            new_.push(this.create(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["createRankDesc"])()));
        }
        if (this.options.filterGlobally) {
            new_.on('filterChanged.reorderall', this.reorderall);
        }
        return new_;
    };
    LocalDataProvider.prototype.cleanUpRanking = function (ranking) {
        if (this.options.filterGlobally) {
            ranking.on('filterChanged.reorderall', null);
        }
        //delete all stored information
        this.data.forEach(function (d) { return delete d._rankings[ranking.id]; });
    };
    LocalDataProvider.prototype.sort = function (ranking) {
        if (this.data.length === 0) {
            return Promise.resolve([]);
        }
        //wrap in a helper and store the initial index
        var helper = this.data.map(function (r, i) { return ({ row: r, i: i, prev: r._rankings[ranking.id] || 0 }); });
        //do the optional filtering step
        if (this.options.filterGlobally) {
            var filtered_1 = this.getRankings().filter(function (d) { return d.isFiltered(); });
            if (filtered_1.length > 0) {
                helper = helper.filter(function (d) { return filtered_1.every(function (f) { return f.filter(d.row); }); });
            }
        }
        else if (ranking.isFiltered()) {
            helper = helper.filter(function (d) { return ranking.filter(d.row); });
        }
        //sort by the ranking column
        helper.sort(function (a, b) { return ranking.comparator(a.row, b.row); });
        //store the ranking index and create an argsort version, i.e. rank 0 -> index i
        var argsort = helper.map(function (r, i) {
            r.row._rankings[ranking.id] = i;
            return r.i;
        });
        return Promise.resolve(argsort);
    };
    LocalDataProvider.prototype.view = function (indices) {
        var _this = this;
        if (this.data.length === 0) {
            return Promise.resolve([]);
        }
        //filter invalid indices
        var l = this.data.length;
        var slice = indices.filter(function (i) { return i >= 0 && i < l; }).map(function (index) { return _this.data[index]; });
        return Promise.resolve(slice);
    };
    /**
     * helper for computing statistics
     * @param indices
     * @returns {{stats: (function(INumberColumn): *), hist: (function(ICategoricalColumn): *)}}
     */
    LocalDataProvider.prototype.stats = function (indices) {
        var _this = this;
        var d = null;
        var getD = function () { return d === null ? (d = _this.view(indices)) : d; };
        return {
            stats: function (col) { return getD().then(function (data) { return computeStats(data, col.getNumber.bind(col), [0, 1]); }); },
            hist: function (col) { return getD().then(function (data) { return computeHist(data, col.getCategories.bind(col), col.categories); }); }
        };
    };
    LocalDataProvider.prototype.mappingSample = function (col) {
        var _this = this;
        var MAX_SAMPLE = 500; //at most 500 sample lines
        var l = this.data.length;
        if (l <= MAX_SAMPLE) {
            return Promise.resolve(this.data.map(col.getRawValue.bind(col)));
        }
        //randomly select 500 elements
        var indices = [];
        for (var i = 0; i < MAX_SAMPLE; ++i) {
            var j = Math.floor(Math.random() * (l - 1));
            while (indices.indexOf(j) >= 0) {
                j = Math.floor(Math.random() * (l - 1));
            }
            indices.push(j);
        }
        return Promise.resolve(indices.map(function (i) { return col.getRawValue(_this.data[i]); }));
    };
    LocalDataProvider.prototype.searchSelect = function (search, col) {
        //case insensitive search
        search = typeof search === 'string' ? search.toLowerCase() : search;
        var f = typeof search === 'string' ? function (v) { return v.toLowerCase().indexOf(search) >= 0; } : search.test.bind(search);
        var indices = this.data.filter(function (row) {
            return f(col.getLabel(row));
        }).map(function (row) { return row._index; });
        this.setSelection(indices, this.options.jumpToSearchResult);
    };
    return LocalDataProvider;
}(CommonDataProvider));
/**
 * a remote implementation of the data provider
 */
var RemoteDataProvider = (function (_super) {
    __extends(RemoteDataProvider, _super);
    function RemoteDataProvider(server, columns, options) {
        if (columns === void 0) { columns = []; }
        if (options === void 0) { options = {}; }
        _super.call(this, columns, options);
        this.server = server;
        /**
         * the local ranking orders
         * @type {{}}
         */
        this.ranks = {};
    }
    RemoteDataProvider.prototype.rankAccessor = function (row, id, desc, ranking) {
        return this.ranks[ranking.id][row._index] || 0;
    };
    RemoteDataProvider.prototype.cloneRanking = function (existing) {
        var id = this.nextRankingId();
        if (existing) {
            //copy the ranking
            this.ranks[id] = this.ranks[existing.id];
        }
        var r = new __WEBPACK_IMPORTED_MODULE_0__model__["Ranking"](id);
        r.push(this.create(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__model__["createRankDesc"])()));
        return r;
    };
    RemoteDataProvider.prototype.cleanUpRanking = function (ranking) {
        //delete all stored information
        delete this.ranks[ranking.id];
    };
    RemoteDataProvider.prototype.sort = function (ranking) {
        var _this = this;
        //generate a description of what to sort
        var desc = ranking.toSortingDesc(function (desc) { return desc.column; });
        //use the server side to sort
        return this.server.sort(desc).then(function (argsort) {
            //store the result
            _this.ranks[ranking.id] = argsort;
            return argsort;
        });
    };
    RemoteDataProvider.prototype.view = function (argsort) {
        return this.server.view(argsort).then(function (view) {
            //enhance with the data index
            view.forEach(function (d, i) { return d._index = argsort[i]; });
            return view;
        });
    };
    RemoteDataProvider.prototype.mappingSample = function (col) {
        return this.server.mappingSample(col.desc.column);
    };
    RemoteDataProvider.prototype.searchSelect = function (search, col) {
        var _this = this;
        this.server.search(search, col.desc.column).then(function (indices) {
            _this.setSelection(indices);
        });
    };
    return RemoteDataProvider;
}(CommonDataProvider));


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_d3__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__model__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__renderer__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__ui_dialogs__ = __webpack_require__(4);
/* harmony export (binding) */ __webpack_require__.d(exports, "PoolRenderer", function() { return PoolRenderer; });
/* harmony export (immutable) */ exports["dummyRankingButtonHook"] = dummyRankingButtonHook;
/* harmony export (binding) */ __webpack_require__.d(exports, "HeaderRenderer", function() { return HeaderRenderer; });
/* harmony export (binding) */ __webpack_require__.d(exports, "BodyRenderer", function() { return BodyRenderer; });
/* harmony export (binding) */ __webpack_require__.d(exports, "BodyCanvasRenderer", function() { return BodyCanvasRenderer; });
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};






var PoolEntry = (function () {
    function PoolEntry(desc) {
        this.desc = desc;
        this.used = 0;
    }
    return PoolEntry;
}());
/**
 * utility function to generate the tooltip text with description
 * @param col the column
 */
function toFullTooltip(col) {
    var base = col.label;
    if (col.description != null && col.description !== '') {
        base += '\n' + col.description;
    }
    return base;
}
var PoolRenderer = (function () {
    function PoolRenderer(data, parent, options) {
        if (options === void 0) { options = {}; }
        this.data = data;
        this.options = {
            layout: 'vertical',
            elemWidth: 100,
            elemHeight: 40,
            width: 100,
            height: 500,
            additionalDesc: [],
            hideUsed: true,
            addAtEndOnClick: false
        };
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(this.options, options);
        this.$node = __WEBPACK_IMPORTED_MODULE_0_d3__["select"](parent).append('div').classed('lu-pool', true);
        this.changeDataStorage(data);
    }
    PoolRenderer.prototype.changeDataStorage = function (data) {
        var _this = this;
        if (this.data) {
            this.data.on(['addColumn.pool', 'removeColumn.pool', 'addRanking.pool', 'removeRanking.pool', 'addDesc.pool'], null);
        }
        this.data = data;
        this.entries = data.getColumns().concat(this.options.additionalDesc).map(function (d) { return new PoolEntry(d); });
        data.on(['addDesc.pool'], function (desc) {
            _this.entries.push(new PoolEntry(desc));
            _this.update();
        });
        if (this.options.hideUsed) {
            var that = this;
            data.on(['addColumn.pool', 'removeColumn.pool'], function (col) {
                var desc = col.desc, change = this.type === 'addColumn' ? 1 : -1;
                that.entries.some(function (entry) {
                    if (entry.desc !== desc) {
                        return false;
                    }
                    entry.used += change;
                    return true;
                });
                that.update();
            });
            data.on(['addRanking.pool', 'removeRanking.pool'], function (ranking) {
                var descs = ranking.flatColumns.map(function (d) { return d.desc; }), change = this.type === 'addRanking' ? 1 : -1;
                that.entries.some(function (entry) {
                    if (descs.indexOf(entry.desc) < 0) {
                        return false;
                    }
                    entry.used += change;
                    return true;
                });
                that.update();
            });
            data.getRankings().forEach(function (ranking) {
                var descs = ranking.flatColumns.map(function (d) { return d.desc; }), change = +1;
                that.entries.some(function (entry) {
                    if (descs.indexOf(entry.desc) < 0) {
                        return false;
                    }
                    entry.used += change;
                });
            });
        }
    };
    PoolRenderer.prototype.remove = function () {
        this.$node.remove();
        if (this.data) {
            this.data.on(['addColumn.pool', 'removeColumn.pool', 'addRanking.pool', 'removeRanking.pool', 'addDesc.pool'], null);
        }
    };
    PoolRenderer.prototype.update = function () {
        var _this = this;
        var data = this.data;
        var descToShow = this.entries.filter(function (e) { return e.used === 0; }).map(function (d) { return d.desc; });
        var $headers = this.$node.selectAll('div.header').data(descToShow);
        var $headers_enter = $headers.enter().append('div').attr({
            'class': 'header',
            'draggable': true
        }).on('dragstart', function (d) {
            var e = __WEBPACK_IMPORTED_MODULE_0_d3__["event"];
            e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
            e.dataTransfer.setData('text/plain', d.label);
            e.dataTransfer.setData('application/caleydo-lineup-column', JSON.stringify(data.toDescRef(d)));
            if (__WEBPACK_IMPORTED_MODULE_2__model__["isNumberColumn"](d)) {
                e.dataTransfer.setData('application/caleydo-lineup-column-number', JSON.stringify(data.toDescRef(d)));
            }
        }).style({
            width: this.options.elemWidth + 'px',
            height: this.options.elemHeight + 'px'
        });
        if (this.options.addAtEndOnClick) {
            $headers_enter.on('click', function (d) {
                _this.data.push(_this.data.getLastRanking(), d);
            });
        }
        $headers_enter.append('span').classed('label', true).text(function (d) { return d.label; });
        $headers.attr('class', function (d) { return ("header " + (d.cssClass || '') + " " + d.type); });
        $headers.style({
            'transform': function (d, i) {
                var pos = _this.layout(i);
                return 'translate(' + pos.x + 'px,' + pos.y + 'px)';
            },
            'background-color': function (d) {
                var s = d;
                return s.cssClass ? null : s.color || __WEBPACK_IMPORTED_MODULE_2__model__["Column"].DEFAULT_COLOR;
            }
        });
        $headers.attr({
            title: function (d) { return toFullTooltip(d); }
        });
        $headers.select('span').text(function (d) { return d.label; });
        $headers.exit().remove();
        //compute the size of this node
        switch (this.options.layout) {
            case 'horizontal':
                this.$node.style({
                    width: (this.options.elemWidth * descToShow.length) + 'px',
                    height: (this.options.elemHeight * 1) + 'px'
                });
                break;
            case 'grid':
                var perRow = __WEBPACK_IMPORTED_MODULE_0_d3__["round"](this.options.width / this.options.elemWidth, 0);
                this.$node.style({
                    width: perRow * this.options.elemWidth + 'px',
                    height: Math.ceil(descToShow.length / perRow) * this.options.elemHeight + 'px'
                });
                break;
            //case 'vertical':
            default:
                this.$node.style({
                    width: (this.options.elemWidth * 1) + 'px',
                    height: (this.options.elemHeight * descToShow.length) + 'px'
                });
                break;
        }
    };
    PoolRenderer.prototype.layout = function (i) {
        switch (this.options.layout) {
            case 'horizontal':
                return { x: i * this.options.elemWidth, y: 0 };
            case 'grid':
                var perRow = __WEBPACK_IMPORTED_MODULE_0_d3__["round"](this.options.width / this.options.elemWidth, 0);
                return { x: (i % perRow) * this.options.elemWidth, y: Math.floor(i / perRow) * this.options.elemHeight };
            //case 'vertical':
            default:
                return { x: 0, y: i * this.options.elemHeight };
        }
    };
    return PoolRenderer;
}());
function dummyRankingButtonHook() {
    return null;
}
var HeaderRenderer = (function () {
    function HeaderRenderer(data, parent, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.data = data;
        this.options = {
            slopeWidth: 150,
            columnPadding: 5,
            headerHistogramHeight: 40,
            headerHeight: 20,
            manipulative: true,
            histograms: false,
            filterDialogs: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__ui_dialogs__["filterDialogs"])(),
            linkTemplates: [],
            searchAble: function (col) { return col instanceof __WEBPACK_IMPORTED_MODULE_2__model__["StringColumn"]; },
            sortOnLabel: true,
            autoRotateLabels: false,
            rotationHeight: 50,
            rotationDegree: -20,
            freezeCols: 0,
            rankingButtons: dummyRankingButtonHook
        };
        this.histCache = __WEBPACK_IMPORTED_MODULE_0_d3__["map"]();
        this.dragHandler = __WEBPACK_IMPORTED_MODULE_0_d3__["behavior"].drag()
            .on('dragstart', function () {
            __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).classed('dragging', true);
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].sourceEvent.stopPropagation();
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].sourceEvent.preventDefault();
        })
            .on('drag', function (d) {
            //the new width
            var newValue = Math.max(__WEBPACK_IMPORTED_MODULE_0_d3__["mouse"](this.parentNode)[0], 2);
            d.setWidth(newValue);
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].sourceEvent.stopPropagation();
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].sourceEvent.preventDefault();
        })
            .on('dragend', function (d) {
            __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).classed('dragging', false);
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].sourceEvent.stopPropagation();
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].sourceEvent.preventDefault();
        });
        this.dropHandler = __WEBPACK_IMPORTED_MODULE_1__utils__["dropAble"](['application/caleydo-lineup-column-ref', 'application/caleydo-lineup-column'], function (data, d, copy) {
            var col = null;
            if ('application/caleydo-lineup-column-ref' in data) {
                var id = data['application/caleydo-lineup-column-ref'];
                col = _this.data.find(id);
                if (copy) {
                    col = _this.data.clone(col);
                }
                else {
                    col.removeMe();
                }
            }
            else {
                var desc = JSON.parse(data['application/caleydo-lineup-column']);
                col = _this.data.create(_this.data.fromDescRef(desc));
            }
            if (d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["Column"]) {
                return d.insertAfterMe(col) != null;
            }
            else {
                var r = _this.data.getLastRanking();
                return r.push(col) !== null;
            }
        });
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(this.options, options);
        this.$node = __WEBPACK_IMPORTED_MODULE_0_d3__["select"](parent).append('div').classed('lu-header', true);
        this.$node.append('div').classed('drop', true).call(this.dropHandler);
        this.changeDataStorage(data);
    }
    HeaderRenderer.prototype.changeDataStorage = function (data) {
        var _this = this;
        if (this.data) {
            this.data.on(['dirtyHeader.headerRenderer', 'orderChanged.headerRenderer', 'selectionChanged.headerRenderer'], null);
        }
        this.data = data;
        data.on('dirtyHeader.headerRenderer', __WEBPACK_IMPORTED_MODULE_1__utils__["delayedCall"](this.update.bind(this), 1));
        if (this.options.histograms) {
            data.on('orderChanged.headerRenderer', function () {
                _this.updateHist();
                _this.update();
            });
            data.on('selectionChanged.headerRenderer', __WEBPACK_IMPORTED_MODULE_1__utils__["delayedCall"](this.drawSelection.bind(this), 1));
        }
    };
    Object.defineProperty(HeaderRenderer.prototype, "sharedHistCache", {
        get: function () {
            return this.histCache;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * defines the current header height in pixel
     * @returns {number}
     */
    HeaderRenderer.prototype.currentHeight = function () {
        return parseInt(this.$node.style('height'), 10);
    };
    HeaderRenderer.prototype.updateHist = function () {
        var _this = this;
        var rankings = this.data.getRankings();
        rankings.forEach(function (ranking) {
            var order = ranking.getOrder();
            var cols = ranking.flatColumns;
            var histo = order == null ? null : _this.data.stats(order);
            cols.filter(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["NumberColumn"] && !d.isHidden(); }).forEach(function (col) {
                _this.histCache.set(col.id, histo === null ? null : histo.stats(col));
            });
            cols.filter(function (d) { return __WEBPACK_IMPORTED_MODULE_2__model__["isCategoricalColumn"](d) && !d.isHidden(); }).forEach(function (col) {
                _this.histCache.set(col.id, histo === null ? null : histo.hist(col));
            });
        });
    };
    /**
     * update the selection in the histograms
     */
    HeaderRenderer.prototype.drawSelection = function () {
        var _this = this;
        if (!this.options.histograms) {
            return;
        }
        //highlight the bins in the histograms
        var node = this.$node.node();
        [].slice.call(node.querySelectorAll('div.bar')).forEach(function (d) { return d.classList.remove('selected'); });
        var indices = this.data.getSelection();
        if (indices.length <= 0) {
            return;
        }
        this.data.view(indices).then(function (data) {
            //get the data
            var rankings = _this.data.getRankings();
            rankings.forEach(function (ranking) {
                var cols = ranking.flatColumns;
                //find all number histograms
                cols.filter(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["NumberColumn"] && !d.isHidden(); }).forEach(function (col) {
                    var bars = [].slice.call(node.querySelectorAll("div.header[data-id=\"" + col.id + "\"] div.bar"));
                    data.forEach(function (d) {
                        var v = col.getValue(d);
                        //choose the right bin
                        for (var i = 1; i < bars.length; ++i) {
                            var bar = bars[i];
                            if (bar.dataset.x > v) {
                                bars[i - 1].classList.add('selected');
                                break;
                            }
                            else if (i === bars.length - 1) {
                                bar.classList.add('selected');
                                break;
                            }
                        }
                    });
                });
                cols.filter(function (d) { return __WEBPACK_IMPORTED_MODULE_2__model__["isCategoricalColumn"](d) && !d.isHidden(); }).forEach(function (col) {
                    var header = node.querySelector("div.header[data-id=\"" + col.id + "\"]");
                    data.forEach(function (d) {
                        var cats = col.getCategories(d);
                        (cats || []).forEach(function (cat) {
                            header.querySelector("div.bar[data-cat=\"" + cat + "\"]").classList.add('selected');
                        });
                    });
                });
            });
        });
    };
    HeaderRenderer.prototype.renderRankingButtons = function (rankings, rankingsOffsets) {
        var $rankingbuttons = this.$node.selectAll('div.rankingbuttons').data(rankings);
        $rankingbuttons.enter().append('div')
            .classed('rankingbuttons', true)
            .call(this.options.rankingButtons);
        $rankingbuttons.style('left', function (d, i) { return rankingsOffsets[i] + 'px'; });
        $rankingbuttons.exit().remove();
    };
    HeaderRenderer.prototype.update = function () {
        var _this = this;
        var that = this;
        var rankings = this.data.getRankings();
        var shifts = [], offset = 0, rankingOffsets = [];
        rankings.forEach(function (ranking) {
            offset += ranking.flatten(shifts, offset, 1, _this.options.columnPadding) + _this.options.slopeWidth;
            rankingOffsets.push(offset - _this.options.slopeWidth);
        });
        //real width
        offset -= this.options.slopeWidth;
        var columns = shifts.map(function (d) { return d.col; });
        //update all if needed
        if (this.options.histograms && this.histCache.empty() && rankings.length > 0) {
            this.updateHist();
        }
        this.renderColumns(columns, shifts);
        if (this.options.rankingButtons !== dummyRankingButtonHook) {
            this.renderRankingButtons(rankings, rankingOffsets);
        }
        function countMultiLevel(c) {
            if (__WEBPACK_IMPORTED_MODULE_2__model__["isMultiLevelColumn"](c) && !c.getCollapsed() && !c.getCompressed()) {
                return 1 + Math.max.apply(Math, c.children.map(countMultiLevel));
            }
            return 1;
        }
        var levels = Math.max.apply(Math, columns.map(countMultiLevel));
        var height = (this.options.histograms ? this.options.headerHistogramHeight : this.options.headerHeight) + (levels - 1) * this.options.headerHeight;
        if (this.options.autoRotateLabels) {
            //check if we have overflows
            var rotatedAny = false;
            this.$node.selectAll('div.header')
                .style('height', height + 'px').select('div.lu-label').each(function (d) {
                var w = this.querySelector('span.lu-label').offsetWidth;
                var actWidth = d.getWidth();
                if (w > (actWidth + 30)) {
                    __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).style('transform', "rotate(" + that.options.rotationDegree + "deg)");
                    rotatedAny = true;
                }
                else {
                    __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).style('transform', null);
                }
            });
            this.$node.selectAll('div.header').style('margin-top', rotatedAny ? this.options.rotationHeight + 'px' : null);
            height += rotatedAny ? this.options.rotationHeight : 0;
        }
        this.$node.style('height', height + 'px');
    };
    HeaderRenderer.prototype.createToolbar = function ($node) {
        var _this = this;
        var filterDialogs = this.options.filterDialogs, provider = this.data, that = this;
        var $regular = $node.filter(function (d) { return !(d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["Ranking"]); }), $stacked = $node.filter(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["StackColumn"]; }), $multilevel = $node.filter(function (d) { return __WEBPACK_IMPORTED_MODULE_2__model__["isMultiLevelColumn"](d); });
        //edit weights
        $stacked.append('i').attr('class', 'fa fa-tasks').attr('title', 'Edit Weights').on('click', function (d) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__ui_dialogs__["openEditWeightsDialog"])(d, __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentNode.parentNode));
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //rename
        $regular.append('i').attr('class', 'fa fa-pencil-square-o').attr('title', 'Rename').on('click', function (d) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__ui_dialogs__["openRenameDialog"])(d, __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentNode.parentNode));
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //clone
        $regular.append('i').attr('class', 'fa fa-code-fork').attr('title', 'Generate Snapshot').on('click', function (d) {
            provider.takeSnapshot(d);
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //edit link
        $node.filter(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["LinkColumn"]; }).append('i').attr('class', 'fa fa-external-link').attr('title', 'Edit Link Pattern').on('click', function (d) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__ui_dialogs__["openEditLinkDialog"])(d, __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentNode.parentNode), [].concat(d.desc.templates || [], that.options.linkTemplates));
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //edit script
        $node.filter(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["ScriptColumn"]; }).append('i').attr('class', 'fa fa-gears').attr('title', 'Edit Combine Script').on('click', function (d) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__ui_dialogs__["openEditScriptDialog"])(d, __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentNode.parentNode));
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //filter
        $node.filter(function (d) { return filterDialogs.hasOwnProperty(d.desc.type); }).append('i').attr('class', 'fa fa-filter').attr('title', 'Filter').on('click', function (d) {
            filterDialogs[d.desc.type](d, __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentNode.parentNode), provider);
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //search
        $node.filter(function (d) { return _this.options.searchAble(d); }).append('i').attr('class', 'fa fa-search').attr('title', 'Search').on('click', function (d) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4__ui_dialogs__["openSearchDialog"])(d, __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentNode.parentNode), provider);
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //collapse
        $regular.append('i')
            .attr('class', 'fa')
            .classed('fa-toggle-left', function (d) { return !d.getCompressed(); })
            .classed('fa-toggle-right', function (d) { return d.getCompressed(); })
            .attr('title', '(Un)Collapse')
            .on('click', function (d) {
            d.setCompressed(!d.getCompressed());
            __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this)
                .classed('fa-toggle-left', !d.getCompressed())
                .classed('fa-toggle-right', d.getCompressed());
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //compress
        $multilevel.append('i')
            .attr('class', 'fa')
            .classed('fa-compress', function (d) { return !d.getCollapsed(); })
            .classed('fa-expand', function (d) { return d.getCollapsed(); })
            .attr('title', 'Compress/Expand')
            .on('click', function (d) {
            d.setCollapsed(!d.getCollapsed());
            __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this)
                .classed('fa-compress', !d.getCollapsed())
                .classed('fa-expand', d.getCollapsed());
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
        //remove
        $node.append('i').attr('class', 'fa fa-times').attr('title', 'Hide').on('click', function (d) {
            if (d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["RankColumn"]) {
                provider.removeRanking(d.findMyRanker());
                if (provider.getRankings().length === 0) {
                    provider.pushRanking();
                }
            }
            else {
                d.removeMe();
            }
            __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
        });
    };
    HeaderRenderer.prototype.updateFreeze = function (left) {
        var numColumns = this.options.freezeCols;
        this.$node.selectAll('div.header')
            .style('z-index', function (d, i) { return i < numColumns ? 1 : null; })
            .style('transform', function (d, i) { return i < numColumns ? "translate(" + left + "px,0)" : null; });
    };
    HeaderRenderer.prototype.renderColumns = function (columns, shifts, $base, clazz) {
        var _this = this;
        if ($base === void 0) { $base = this.$node; }
        if (clazz === void 0) { clazz = 'header'; }
        var $headers = $base.selectAll('div.' + clazz).data(columns, function (d) { return d.id; });
        var $headers_enter = $headers.enter().append('div').attr({
            'class': clazz
        })
            .on('click', function (d) {
            var mevent = __WEBPACK_IMPORTED_MODULE_0_d3__["event"];
            if (_this.options.manipulative && !mevent.defaultPrevented && mevent.currentTarget === mevent.target) {
                d.toggleMySorting();
            }
        });
        var $header_enter_div = $headers_enter.append('div').classed('lu-label', true)
            .on('click', function (d) {
            var mevent = __WEBPACK_IMPORTED_MODULE_0_d3__["event"];
            if (_this.options.manipulative && !mevent.defaultPrevented) {
                d.toggleMySorting();
            }
        })
            .on('dragstart', function (d) {
            var e = __WEBPACK_IMPORTED_MODULE_0_d3__["event"];
            e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
            e.dataTransfer.setData('text/plain', d.label);
            e.dataTransfer.setData('application/caleydo-lineup-column-ref', d.id);
            var ref = JSON.stringify(_this.data.toDescRef(d.desc));
            e.dataTransfer.setData('application/caleydo-lineup-column', ref);
            if (__WEBPACK_IMPORTED_MODULE_2__model__["isNumberColumn"](d)) {
                e.dataTransfer.setData('application/caleydo-lineup-column-number', ref);
                e.dataTransfer.setData('application/caleydo-lineup-column-number-ref', d.id);
            }
        });
        $header_enter_div.append('i').attr('class', 'fa fa sort_indicator');
        $header_enter_div.append('span').classed('lu-label', true).attr({
            'draggable': this.options.manipulative
        });
        if (this.options.manipulative) {
            $headers_enter.append('div').classed('handle', true)
                .call(this.dragHandler)
                .style('width', this.options.columnPadding + 'px')
                .call(this.dropHandler);
            $headers_enter.append('div').classed('toolbar', true).call(this.createToolbar.bind(this));
        }
        if (this.options.histograms) {
            $headers_enter.append('div').classed('histogram', true);
        }
        $headers.style({
            width: function (d, i) { return (shifts[i].width + _this.options.columnPadding) + 'px'; },
            left: function (d, i) { return shifts[i].offset + 'px'; },
            'background-color': function (d) { return d.color; }
        });
        $headers.attr({
            'class': function (d) { return (clazz + " " + (d.cssClass || '') + " " + (d.getCompressed() ? 'compressed' : '') + " " + d.headerCssClass + " " + (_this.options.autoRotateLabels ? 'rotateable' : '') + " " + (d.isFiltered() ? 'filtered' : '')); },
            title: function (d) { return toFullTooltip(d); },
            'data-id': function (d) { return d.id; },
        });
        $headers.select('i.sort_indicator').attr('class', function (d) {
            var r = d.findMyRanker();
            if (r && r.getSortCriteria().col === d) {
                return 'sort_indicator fa fa-sort-' + (r.getSortCriteria().asc ? 'asc' : 'desc');
            }
            return 'sort_indicator fa';
        });
        $headers.select('span.lu-label').text(function (d) { return d.label; });
        var that = this;
        $headers.filter(function (d) { return __WEBPACK_IMPORTED_MODULE_2__model__["isMultiLevelColumn"](d); }).each(function (col) {
            if (col.getCollapsed() || col.getCompressed()) {
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).selectAll('div.' + clazz + '_i').remove();
            }
            else {
                var s_shifts = [];
                col.flatten(s_shifts, 0, 1, that.options.columnPadding);
                var s_columns = s_shifts.map(function (d) { return d.col; });
                that.renderColumns(s_columns, s_shifts, __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this), clazz + (clazz.substr(clazz.length - 2) !== '_i' ? '_i' : ''));
            }
        }).select('div.lu-label').call(__WEBPACK_IMPORTED_MODULE_1__utils__["dropAble"](['application/caleydo-lineup-column-number-ref', 'application/caleydo-lineup-column-number'], function (data, d, copy) {
            var col = null;
            if ('application/caleydo-lineup-column-number-ref' in data) {
                var id = data['application/caleydo-lineup-column-number-ref'];
                col = _this.data.find(id);
                if (copy) {
                    col = _this.data.clone(col);
                }
                else if (col) {
                    col.removeMe();
                }
            }
            else {
                var desc = JSON.parse(data['application/caleydo-lineup-column-number']);
                col = _this.data.create(_this.data.fromDescRef(desc));
            }
            return d.push(col) != null;
        }));
        if (this.options.histograms) {
            $headers.filter(function (d) { return __WEBPACK_IMPORTED_MODULE_2__model__["isCategoricalColumn"](d); }).each(function (col) {
                var $this = __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).select('div.histogram');
                var hist = that.histCache.get(col.id);
                if (hist) {
                    hist.then(function (stats) {
                        var $bars = $this.selectAll('div.bar').data(stats.hist);
                        $bars.enter().append('div').classed('bar', true);
                        var sx = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].ordinal().domain(col.categories).rangeBands([0, 100], 0.1);
                        var sy = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].linear().domain([0, stats.maxBin]).range([0, 100]);
                        $bars.style({
                            left: function (d) { return sx(d.cat) + '%'; },
                            width: function (d) { return sx.rangeBand() + '%'; },
                            top: function (d) { return (100 - sy(d.y)) + '%'; },
                            height: function (d) { return sy(d.y) + '%'; },
                            'background-color': function (d) { return col.colorOf(d.cat); }
                        }).attr({
                            title: function (d) { return (d.cat + ": " + d.y); },
                            'data-cat': function (d) { return d.cat; }
                        });
                        $bars.exit().remove();
                    });
                }
            });
            $headers.filter(function (d) { return d instanceof __WEBPACK_IMPORTED_MODULE_2__model__["NumberColumn"]; }).each(function (col) {
                var $this = __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).select('div.histogram');
                var hist = that.histCache.get(col.id);
                if (hist) {
                    hist.then(function (stats) {
                        var $bars = $this.selectAll('div.bar').data(stats.hist);
                        $bars.enter().append('div').classed('bar', true);
                        var sx = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].ordinal().domain(__WEBPACK_IMPORTED_MODULE_0_d3__["range"](stats.hist.length).map(String)).rangeBands([0, 100], 0.1);
                        var sy = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].linear().domain([0, stats.maxBin]).range([0, 100]);
                        $bars.style({
                            left: function (d, i) { return sx(String(i)) + '%'; },
                            width: function (d, i) { return sx.rangeBand() + '%'; },
                            top: function (d) { return (100 - sy(d.y)) + '%'; },
                            height: function (d) { return sy(d.y) + '%'; }
                        }).attr({
                            title: function (d, i) { return ("Bin " + i + ": " + d.y); },
                            'data-x': function (d) { return d.x; }
                        });
                        $bars.exit().remove();
                        var $mean = $this.select('div.mean');
                        if ($mean.empty()) {
                            $mean = $this.append('div').classed('mean', true);
                        }
                        $mean.style('left', (stats.mean * 100) + '%');
                    });
                }
            });
        }
        $headers.exit().remove();
    };
    return HeaderRenderer;
}());
var BodyRenderer = (function (_super) {
    __extends(BodyRenderer, _super);
    function BodyRenderer(data, parent, slicer, options) {
        if (options === void 0) { options = {}; }
        _super.call(this);
        this.data = data;
        this.slicer = slicer;
        this.options = {
            rowHeight: 20,
            rowPadding: 1,
            rowBarPadding: 1,
            idPrefix: '',
            slopeWidth: 150,
            columnPadding: 5,
            stacked: true,
            animation: false,
            animationDuration: 1000,
            renderers: __WEBPACK_IMPORTED_MODULE_3__renderer__["renderers"](),
            meanLine: false,
            actions: [],
            freezeCols: 0
        };
        this.currentFreezeLeft = 0;
        this.histCache = __WEBPACK_IMPORTED_MODULE_0_d3__["map"]();
        //merge options
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(this.options, options);
        this.$node = __WEBPACK_IMPORTED_MODULE_0_d3__["select"](parent).append('svg').classed('lu-body', true);
        this.changeDataStorage(data);
    }
    BodyRenderer.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['hoverChanged', 'renderFinished']);
    };
    Object.defineProperty(BodyRenderer.prototype, "node", {
        get: function () {
            return this.$node.node();
        },
        enumerable: true,
        configurable: true
    });
    BodyRenderer.prototype.setOption = function (key, value) {
        this.options[key] = value;
    };
    BodyRenderer.prototype.changeDataStorage = function (data) {
        var _this = this;
        if (this.data) {
            this.data.on(['dirtyValues.bodyRenderer', 'selectionChanged.bodyRenderer'], null);
        }
        this.data = data;
        data.on('dirtyValues.bodyRenderer', __WEBPACK_IMPORTED_MODULE_1__utils__["delayedCall"](this.update.bind(this), 1));
        data.on('selectionChanged.bodyRenderer', __WEBPACK_IMPORTED_MODULE_1__utils__["delayedCall"](function (selection, jumpToFirst) {
            if (jumpToFirst && selection.length > 0) {
                _this.jumpToSelection();
            }
            _this.drawSelection();
        }, 1));
    };
    BodyRenderer.prototype.createContext = function (index_shift) {
        var options = this.options;
        return {
            rowKey: this.options.animation ? this.data.rowKey : undefined,
            cellY: function (index) {
                return (index + index_shift) * (options.rowHeight);
            },
            cellPrevY: function (index) {
                return (index + index_shift) * (options.rowHeight);
            },
            cellX: function (index) {
                return 0;
            },
            rowHeight: function (index) {
                return options.rowHeight * (1 - options.rowPadding);
            },
            renderer: function (col) {
                if (col.getCompressed() && __WEBPACK_IMPORTED_MODULE_2__model__["isNumberColumn"](col)) {
                    return options.renderers.heatmap;
                }
                if (col instanceof __WEBPACK_IMPORTED_MODULE_2__model__["StackColumn"] && col.getCollapsed()) {
                    return options.renderers.number;
                }
                if (__WEBPACK_IMPORTED_MODULE_2__model__["isMultiLevelColumn"](col) && col.getCollapsed()) {
                    return options.renderers.string;
                }
                var l = options.renderers[col.desc.type];
                return l || __WEBPACK_IMPORTED_MODULE_3__renderer__["defaultRenderer"]();
            },
            render: function (col, $this, data, context) {
                if (context === void 0) { context = this; }
                //if renderers change delete old stuff
                var tthis = ($this.node());
                var old_renderer = tthis.__renderer__;
                var act_renderer = this.renderer(col);
                if (old_renderer !== act_renderer) {
                    $this.selectAll('*').remove();
                    tthis.__renderer__ = act_renderer;
                }
                act_renderer.render($this, col, data, context);
            },
            renderCanvas: function (col, ctx, data, context) {
                if (context === void 0) { context = this; }
                //dummy impl
            },
            showStacked: function (col) {
                return col instanceof __WEBPACK_IMPORTED_MODULE_2__model__["StackColumn"] && options.stacked;
            },
            idPrefix: options.idPrefix,
            animated: function ($sel) { return options.animation ? $sel.transition().duration(options.animationDuration) : $sel; },
            //show mean line if option is enabled and top level
            showMeanLine: function (col) { return options.meanLine && __WEBPACK_IMPORTED_MODULE_2__model__["isNumberColumn"](col) && !col.getCompressed() && col.parent instanceof __WEBPACK_IMPORTED_MODULE_2__model__["Ranking"]; },
            option: function (key, default_) { return (key in options) ? options[key] : default_; }
        };
    };
    BodyRenderer.prototype.updateClipPathsImpl = function (r, context, height) {
        var $base = this.$node.select('defs.body');
        if ($base.empty()) {
            $base = this.$node.append('defs').classed('body', true);
        }
        //generate clip paths for the text columns to avoid text overflow
        //see http://stackoverflow.com/questions/L742812/cannot-select-svg-foreignobject-element-in-d3
        //there is a bug in webkit which present camelCase selectors
        var textClipPath = $base.selectAll(function () {
            return this.getElementsByTagName('clipPath');
        }).data(r, function (d) { return d.id; });
        textClipPath.enter().append('clipPath')
            .attr('id', function (d) { return context.idPrefix + 'clipCol' + d.id; })
            .append('rect').attr({
            y: 0
        });
        textClipPath.exit().remove();
        textClipPath.select('rect')
            .attr({
            x: 0,
            width: function (d) { return Math.max(d.getWidth() - 5, 0); },
            height: height
        });
    };
    BodyRenderer.prototype.updateClipPaths = function (rankings, context, height) {
        var _this = this;
        var shifts = [], offset = 0;
        rankings.forEach(function (r) {
            var w = r.flatten(shifts, offset, 2, _this.options.columnPadding);
            offset += w + _this.options.slopeWidth;
        });
        this.updateClipPathsImpl(shifts.map(function (s) { return s.col; }), context, height);
        var $elem = this.$node.select('clipPath#c' + context.idPrefix + 'Freeze');
        if ($elem.empty()) {
            $elem = this.$node.append('clipPath').attr('id', 'c' + context.idPrefix + 'Freeze').append('rect').attr({
                y: 0,
                width: 20000,
                height: height
            });
        }
        $elem.select('rect').attr({
            height: height
        });
    };
    BodyRenderer.prototype.renderRankings = function ($body, rankings, orders, shifts, context, height) {
        var _this = this;
        var that = this;
        var dataPromises = orders.map(function (r) { return _this.data.view(r); });
        var $rankings = $body.selectAll('g.ranking').data(rankings, function (d) { return d.id; });
        var $rankings_enter = $rankings.enter().append('g').attr({
            'class': 'ranking',
            transform: function (d, i) { return 'translate(' + shifts[i].shift + ',0)'; }
        });
        $rankings_enter.append('g').attr('class', 'rows');
        $rankings_enter.append('g').attr('class', 'cols');
        context.animated($rankings).attr({
            transform: function (d, i) { return 'translate(' + shifts[i].shift + ',0)'; }
        });
        var $cols = $rankings.select('g.cols').selectAll('g.uchild').data(function (d) { return d.children.filter(function (d) { return !d.isHidden(); }); }, function (d) { return d.id; });
        $cols.enter().append('g').attr('class', 'uchild')
            .append('g').attr({
            'class': 'child',
            transform: function (d, i, j) { return 'translate(' + shifts[j].shifts[i] + ',0)'; }
        });
        $cols.exit().remove();
        $cols = $cols.select('g.child');
        $cols.attr({
            'data-index': function (d, i) { return i; }
        });
        context.animated($cols).attr({
            transform: function (d, i, j) {
                return 'translate(' + shifts[j].shifts[i] + ',0)';
            }
        }).each(function (d, i, j) {
            var $col = __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this);
            dataPromises[j].then(function (data) {
                context.render(d, $col, data, context);
            });
            if (context.showMeanLine(d)) {
                var h = that.histCache.get(d.id);
                if (h) {
                    h.then(function (stats) {
                        var $mean = $col.selectAll('line.meanline').data([stats.mean]);
                        $mean.enter().append('line').attr('class', 'meanline');
                        $mean.exit().remove();
                        $mean.attr('x1', d.getWidth() * stats.mean)
                            .attr('x2', d.getWidth() * stats.mean)
                            .attr('y2', height);
                    });
                }
            }
            else {
                $col.selectAll('line.meanline').remove();
            }
        });
        // wait until all `context.render()` calls have finished
        Promise.all(dataPromises).then(function (args) {
            _this.fire('renderFinished');
        });
        function mouseOverRow($row, $cols, index, ranking, rankingIndex) {
            $row.classed('hover', true);
            var $value_cols = $row.select('g.values').selectAll('g.uchild').data(ranking.children.filter(function (d) { return !d.isHidden(); }), function (d) { return d.id; });
            $value_cols.enter().append('g').attr({
                'class': 'uchild'
            }).append('g').classed('child', true);
            $value_cols.select('g.child').attr({
                transform: function (d, i) {
                    return 'translate(' + shifts[rankingIndex].shifts[i] + ',0)';
                }
            }).each(function (d, i) {
                var _this = this;
                dataPromises[rankingIndex].then(function (data) {
                    context.renderer(d).mouseEnter($cols.selectAll('g.child[data-index="' + i + '"]'), __WEBPACK_IMPORTED_MODULE_0_d3__["select"](_this), d, data[index], index, context);
                });
            });
            $value_cols.exit().remove();
            //data.mouseOver(d, i);
        }
        function mouseLeaveRow($row, $cols, index, ranking, rankingIndex) {
            $row.classed('hover', false);
            $row.select('g.values').selectAll('g.uchild').each(function (d, i) {
                var _this = this;
                dataPromises[rankingIndex].then(function (data) {
                    context.renderer(d).mouseLeave($cols.selectAll('g.child[data-index="' + i + '"]'), __WEBPACK_IMPORTED_MODULE_0_d3__["select"](_this).select('g.child'), d, data[index], index, context);
                });
            }).remove();
            //data.mouseLeave(d, i);
        }
        this.mouseOverItem = function (data_index, hover) {
            if (hover === void 0) { hover = true; }
            $rankings.each(function (ranking, rankingIndex) {
                var $ranking = __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this);
                var $row = $ranking.selectAll('g.row[data-index="' + data_index + '"]');
                var $cols = $ranking.select('g.cols');
                if (!$row.empty()) {
                    var index = $row.datum().i;
                    if (hover) {
                        mouseOverRow($row, $cols, index, ranking, rankingIndex);
                    }
                    else {
                        mouseLeaveRow($row, $cols, index, ranking, rankingIndex);
                    }
                }
            });
            //set clip path for frozen columns
            that.updateFrozenRows();
        };
        var $rows = $rankings.select('g.rows').selectAll('g.row').data(function (d, i) { return orders[i].map(function (d, i) { return ({ d: d, i: i }); }); });
        var $rows_enter = $rows.enter().append('g').attr({
            'class': 'row'
        });
        $rows_enter.append('rect').attr({
            'class': 'bg'
        });
        $rows_enter.append('g').attr({ 'class': 'values' });
        $rows_enter.on('mouseenter', function (data_index) {
            _this.mouseOver(data_index.d, true);
        }).on('mouseleave', function (data_index) {
            _this.mouseOver(data_index.d, false);
        }).on('click', function (data_index) {
            _this.select(data_index.d, __WEBPACK_IMPORTED_MODULE_0_d3__["event"].ctrlKey);
        });
        $rows.attr({
            'data-index': function (d) { return d.d; }
        }).classed('selected', function (d) { return _this.data.isSelected(d.d); });
        $rows.select('rect').attr({
            y: function (d) { return context.cellY(d.i); },
            height: function (d) { return context.rowHeight(d.i); },
            width: function (d, i, j) { return shifts[j].width; },
            'class': function (d, i) { return 'bg ' + (i % 2 === 0 ? 'even' : 'odd'); }
        });
        $rows.exit().remove();
        $rankings.exit().remove();
    };
    BodyRenderer.prototype.jumpToSelection = function () {
        var _this = this;
        var indices = this.data.getSelection();
        var rankings = this.data.getRankings();
        if (indices.length <= 0 || rankings.length <= 0) {
            return;
        }
        var order = rankings[0].getOrder();
        var visibleRange = this.slicer(0, order.length, function (i) { return i * _this.options.rowHeight; });
        var visibleOrder = order.slice(visibleRange.from, visibleRange.to);
        //if any of the selected indices is in the visible range - done
        if (indices.some(function (d) { return visibleOrder.indexOf(d) >= 0; })) {
            return;
        }
        //find the closest not visible one in the indices list
        //
    };
    BodyRenderer.prototype.select = function (dataIndex, additional) {
        if (additional === void 0) { additional = false; }
        var selected = this.data.toggleSelection(dataIndex, additional);
        this.$node.selectAll('g.row[data-index="' + dataIndex + '"], line.slope[data-index="' + dataIndex + '"]').classed('selected', selected);
    };
    BodyRenderer.prototype.hasAnySelectionColumn = function () {
        return this.data.getRankings().some(function (r) { return r.children.some(function (c) { return c instanceof __WEBPACK_IMPORTED_MODULE_2__model__["SelectionColumn"] && !c.isHidden(); }); });
    };
    BodyRenderer.prototype.drawSelection = function () {
        if (this.hasAnySelectionColumn()) {
            this.update();
        }
        var indices = this.data.getSelection();
        if (indices.length === 0) {
            this.$node.selectAll('g.row.selected, line.slope.selected').classed('selected', false);
        }
        else {
            var s = __WEBPACK_IMPORTED_MODULE_0_d3__["set"](indices);
            this.$node.selectAll('g.row').classed('selected', function (d) { return s.has(String(d.d)); });
            this.$node.selectAll('line.slope').classed('selected', function (d) { return s.has(String(d.data_index)); });
        }
    };
    BodyRenderer.prototype.mouseOver = function (dataIndex, hover) {
        if (hover === void 0) { hover = true; }
        this.fire('hoverChanged', hover ? dataIndex : -1);
        this.mouseOverItem(dataIndex, hover);
        //update the slope graph
        this.$node.selectAll('line.slope[data-index="' + dataIndex + '"]').classed('hover', hover);
    };
    BodyRenderer.prototype.renderSlopeGraphs = function ($body, rankings, orders, shifts, context) {
        var _this = this;
        var slopes = orders.slice(1).map(function (d, i) { return ({ left: orders[i], left_i: i, right: d, right_i: i + 1 }); });
        var $slopes = $body.selectAll('g.slopegraph').data(slopes);
        $slopes.enter().append('g').attr({
            'class': 'slopegraph'
        });
        $slopes.attr({
            transform: function (d, i) { return 'translate(' + (shifts[i + 1].shift - _this.options.slopeWidth) + ',0)'; }
        });
        var $lines = $slopes.selectAll('line.slope').data(function (d, i) {
            var cache = {};
            d.right.forEach(function (data_index, pos) {
                cache[data_index] = pos;
            });
            return d.left.map(function (data_index, pos) { return ({
                data_index: data_index,
                lpos: pos,
                rpos: cache[data_index]
            }); }).filter(function (d) { return d.rpos != null; });
        });
        $lines.enter().append('line').attr({
            'class': 'slope',
            x2: this.options.slopeWidth
        }).on('mouseenter', function (d) {
            _this.mouseOver(d.data_index, true);
        }).on('mouseleave', function (d) {
            _this.mouseOver(d.data_index, false);
        });
        $lines.attr({
            'data-index': function (d) { return d.data_index; }
        });
        $lines.attr({
            y1: function (d) {
                return context.rowHeight(d.lpos) * 0.5 + context.cellY(d.lpos);
            },
            y2: function (d) {
                return context.rowHeight(d.rpos) * 0.5 + context.cellY(d.rpos);
            }
        });
        $lines.exit().remove();
        $slopes.exit().remove();
    };
    BodyRenderer.prototype.updateFreeze = function (left) {
        var _this = this;
        var numColumns = this.options.freezeCols;
        var $cols = this.$node.select('g.cols');
        var $n = this.$node.select('#c' + this.options.idPrefix + 'Freeze').select('rect');
        var $col = $cols.select("g.child[data-index=\"" + numColumns + "\"]");
        if ($col.empty()) {
            //use the last one
            $col = $cols.select('g.child:last-of-type');
        }
        var x = __WEBPACK_IMPORTED_MODULE_0_d3__["transform"]($col.attr('transform') || '').translate[0];
        $n.attr('x', left + x);
        $cols.selectAll('g.uchild').attr({
            'clip-path': function (d, i) { return i < numColumns ? null : 'url(#c' + _this.options.idPrefix + 'Freeze)'; },
            'transform': function (d, i) { return i < numColumns ? 'translate(' + left + ',0)' : null; }
        });
        this.currentFreezeLeft = left;
        //update all mouse over rows and selected rows with
        this.updateFrozenRows();
    };
    BodyRenderer.prototype.updateFrozenRows = function () {
        var _this = this;
        var numColumns = this.options.freezeCols;
        if (numColumns <= 0) {
            return;
        }
        var left = this.currentFreezeLeft;
        var $rows = this.$node.select('g.rows');
        $rows.select('g.row.hover g.values').selectAll('g.uchild').attr({
            'clip-path': function (d, i) { return i < numColumns ? null : 'url(#c' + _this.options.idPrefix + 'Freeze)'; },
            'transform': function (d, i) { return i < numColumns ? 'translate(' + left + ',0)' : null; }
        });
    };
    /**
     * render the body
     */
    BodyRenderer.prototype.update = function () {
        var _this = this;
        var rankings = this.data.getRankings();
        var maxElems = __WEBPACK_IMPORTED_MODULE_0_d3__["max"](rankings, function (d) { return d.getOrder().length; }) || 0;
        var height = this.options.rowHeight * maxElems;
        var visibleRange = this.slicer(0, maxElems, function (i) { return i * _this.options.rowHeight; });
        var orderSlicer = function (order) {
            if (visibleRange.from === 0 && order.length <= visibleRange.to) {
                return order;
            }
            return order.slice(visibleRange.from, Math.min(order.length, visibleRange.to));
        };
        var orders = rankings.map(function (r) { return orderSlicer(r.getOrder()); });
        var context = this.createContext(visibleRange.from);
        //compute offsets and shifts for individual rankings and columns inside the rankings
        var offset = 0, shifts = rankings.map(function (d, i) {
            var r = offset;
            offset += _this.options.slopeWidth;
            var o2 = 0, shift2 = d.children.filter(function (d) { return !d.isHidden(); }).map(function (o) {
                var r = o2;
                o2 += (o.getCompressed() ? __WEBPACK_IMPORTED_MODULE_2__model__["Column"].COMPRESSED_WIDTH : o.getWidth()) + _this.options.columnPadding;
                if (__WEBPACK_IMPORTED_MODULE_2__model__["isMultiLevelColumn"](o) && !o.getCollapsed() && !o.getCompressed()) {
                    o2 += _this.options.columnPadding * (o.length - 1);
                }
                return r;
            });
            offset += o2;
            return {
                shift: r,
                shifts: shift2,
                width: o2
            };
        });
        this.$node.attr({
            width: Math.max(0, offset - this.options.slopeWidth),
            height: height
        });
        this.updateClipPaths(rankings, context, height);
        var $body = this.$node.select('g.body');
        if ($body.empty()) {
            $body = this.$node.append('g').classed('body', true);
        }
        this.renderRankings($body, rankings, orders, shifts, context, height);
        this.renderSlopeGraphs($body, rankings, orders, shifts, context);
    };
    return BodyRenderer;
}(__WEBPACK_IMPORTED_MODULE_1__utils__["AEventDispatcher"]));
var BodyCanvasRenderer = (function (_super) {
    __extends(BodyCanvasRenderer, _super);
    function BodyCanvasRenderer(data, parent, slicer, options) {
        if (options === void 0) { options = {}; }
        _super.call(this);
        this.data = data;
        this.slicer = slicer;
        this.options = {
            rowHeight: 20,
            rowPadding: 1,
            rowBarPadding: 1,
            idPrefix: '',
            slopeWidth: 150,
            columnPadding: 5,
            stacked: true,
            renderers: __WEBPACK_IMPORTED_MODULE_3__renderer__["renderers"](),
            meanLine: false,
            freezeCols: 0
        };
        this.histCache = __WEBPACK_IMPORTED_MODULE_0_d3__["map"]();
        //merge options
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(this.options, options);
        this.$node = __WEBPACK_IMPORTED_MODULE_0_d3__["select"](parent).append('canvas').classed('lu-canvas.body', true);
        this.changeDataStorage(data);
    }
    BodyCanvasRenderer.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['hoverChanged']);
    };
    Object.defineProperty(BodyCanvasRenderer.prototype, "node", {
        get: function () {
            return this.$node.node();
        },
        enumerable: true,
        configurable: true
    });
    BodyCanvasRenderer.prototype.setOption = function (key, value) {
        this.options[key] = value;
    };
    BodyCanvasRenderer.prototype.updateFreeze = function (left) {
        //dummy impl
    };
    BodyCanvasRenderer.prototype.select = function (dataIndex, additional) {
        if (additional === void 0) { additional = false; }
        //dummy impl
    };
    BodyCanvasRenderer.prototype.changeDataStorage = function (data) {
        if (this.data) {
            this.data.on(['dirtyValues.bodyRenderer', 'selectionChanged.bodyRenderer'], null);
        }
        this.data = data;
        data.on('dirtyValues.bodyRenderer', __WEBPACK_IMPORTED_MODULE_1__utils__["delayedCall"](this.update.bind(this), 1));
        //data.on('selectionChanged.bodyRenderer', utils.delayedCall(this.drawSelection.bind(this), 1));
    };
    BodyCanvasRenderer.prototype.createContext = function (index_shift) {
        var options = this.options;
        return {
            rowKey: undefined,
            cellY: function (index) {
                return (index + index_shift) * (options.rowHeight);
            },
            cellPrevY: function (index) {
                return (index + index_shift) * (options.rowHeight);
            },
            cellX: function (index) {
                return 0;
            },
            rowHeight: function (index) {
                return options.rowHeight * (1 - options.rowPadding);
            },
            renderer: function (col) {
                if (col.getCompressed() && __WEBPACK_IMPORTED_MODULE_2__model__["isNumberColumn"](col)) {
                    return options.renderers.heatmap;
                }
                if (col instanceof __WEBPACK_IMPORTED_MODULE_2__model__["StackColumn"] && col.getCollapsed()) {
                    return options.renderers.number;
                }
                if (__WEBPACK_IMPORTED_MODULE_2__model__["isMultiLevelColumn"](col) && col.getCollapsed()) {
                    return options.renderers.string;
                }
                var l = options.renderers[col.desc.type];
                return l || __WEBPACK_IMPORTED_MODULE_3__renderer__["defaultRenderer"]();
            },
            render: function (col, $this, data, context) {
                if (context === void 0) { context = this; }
                //dummy impl
            },
            renderCanvas: function (col, ctx, data, context) {
                if (context === void 0) { context = this; }
                var act_renderer = this.renderer(col);
                act_renderer.renderCanvas(ctx, col, data, context);
            },
            showStacked: function (col) {
                return col instanceof __WEBPACK_IMPORTED_MODULE_2__model__["StackColumn"] && options.stacked;
            },
            idPrefix: options.idPrefix,
            animated: function ($sel) { return $sel; },
            //show mean line if option is enabled and top level
            showMeanLine: function (col) { return options.meanLine && __WEBPACK_IMPORTED_MODULE_2__model__["isNumberColumn"](col) && !col.getCompressed() && col.parent instanceof __WEBPACK_IMPORTED_MODULE_2__model__["Ranking"]; },
            option: function (key, default_) { return (key in options) ? options[key] : default_; }
        };
    };
    BodyCanvasRenderer.prototype.renderRankings = function (ctx, rankings, orders, shifts, context, height) {
        var _this = this;
        var dataPromises = orders.map(function (r) { return _this.data.view(r); });
        ctx.save();
        rankings.forEach(function (ranking, j) {
            dataPromises[j].then(function (data) {
                ctx.save();
                ctx.translate(shifts[j].shift, 0);
                ctx.save();
                ctx.fillStyle = '#f7f7f7';
                orders[j].forEach(function (order, i) {
                    if (i % 2 === 0) {
                        ctx.fillRect(0, context.cellY(i), shifts[j].width, context.rowHeight(i));
                    }
                });
                ctx.restore();
                ranking.children.forEach(function (child, i) {
                    ctx.save();
                    ctx.translate(shifts[j].shifts[i], 0);
                    context.renderCanvas(child, ctx, data, context);
                    ctx.restore();
                });
                ctx.restore();
            });
        });
        ctx.restore();
    };
    BodyCanvasRenderer.prototype.renderSlopeGraphs = function (ctx, rankings, orders, shifts, context) {
        var _this = this;
        var slopes = orders.slice(1).map(function (d, i) { return ({ left: orders[i], left_i: i, right: d, right_i: i + 1 }); });
        ctx.save();
        ctx.fillStyle = 'darkgray';
        slopes.forEach(function (slope, i) {
            ctx.save();
            ctx.translate(shifts[i + 1].shift - _this.options.slopeWidth, 0);
            var cache = {};
            slope.right.forEach(function (data_index, pos) {
                cache[data_index] = pos;
            });
            var lines = slope.left.map(function (data_index, pos) { return ({
                data_index: data_index,
                lpos: pos,
                rpos: cache[data_index]
            }); }).filter(function (d) { return d.rpos != null; });
            ctx.beginPath();
            lines.forEach(function (line) {
                ctx.moveTo(0, context.rowHeight(line.lpos) * 0.5 + context.cellY(line.lpos));
                ctx.lineTo(_this.options.slopeWidth, context.rowHeight(line.rpos) * 0.5 + context.cellY(line.rpos));
            });
            ctx.stroke();
            ctx.restore();
        });
        ctx.restore();
    };
    /**
     * render the body
     */
    BodyCanvasRenderer.prototype.update = function () {
        var _this = this;
        var rankings = this.data.getRankings();
        var maxElems = __WEBPACK_IMPORTED_MODULE_0_d3__["max"](rankings, function (d) { return d.getOrder().length; }) || 0;
        var height = this.options.rowHeight * maxElems;
        var visibleRange = this.slicer(0, maxElems, function (i) { return i * _this.options.rowHeight; });
        var orderSlicer = function (order) {
            if (visibleRange.from === 0 && order.length <= visibleRange.to) {
                return order;
            }
            return order.slice(visibleRange.from, Math.min(order.length, visibleRange.to));
        };
        var orders = rankings.map(function (r) { return orderSlicer(r.getOrder()); });
        var context = this.createContext(visibleRange.from);
        //compute offsets and shifts for individual rankings and columns inside the rankings
        var offset = 0, shifts = rankings.map(function (d, i) {
            var r = offset;
            offset += _this.options.slopeWidth;
            var o2 = 0, shift2 = d.children.filter(function (d) { return !d.isHidden(); }).map(function (o) {
                var r = o2;
                o2 += (o.getCompressed() ? __WEBPACK_IMPORTED_MODULE_2__model__["Column"].COMPRESSED_WIDTH : o.getWidth()) + _this.options.columnPadding;
                if (o instanceof __WEBPACK_IMPORTED_MODULE_2__model__["StackColumn"] && !o.getCollapsed() && !o.getCompressed()) {
                    o2 += _this.options.columnPadding * (o.length - 1);
                }
                return r;
            });
            offset += o2;
            return {
                shift: r,
                shifts: shift2,
                width: o2
            };
        });
        this.$node.attr({
            width: offset,
            height: height
        });
        var ctx = this.$node.node().getContext('2d');
        ctx.font = '10pt Times New Roman';
        ctx.textBaseline = 'top';
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this.renderRankings(ctx, rankings, orders, shifts, context, height);
        this.renderSlopeGraphs(ctx, rankings, orders, shifts, context);
    };
    return BodyCanvasRenderer;
}(__WEBPACK_IMPORTED_MODULE_1__utils__["AEventDispatcher"]));


/***/ },
/* 7 */
/***/ function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_d3__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__model__ = __webpack_require__(2);
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */



function clamp(v, min, max) {
    return Math.max(Math.min(v, max), min);
}
var MappingEditor = (function () {
    function MappingEditor(parent, scale_, original, old_filter, dataPromise, options) {
        if (options === void 0) { options = {}; }
        this.parent = parent;
        this.scale_ = scale_;
        this.original = original;
        this.old_filter = old_filter;
        this.dataPromise = dataPromise;
        this.options = {
            width: 370,
            height: 225,
            padding_hor: 7,
            padding_ver: 7,
            filter_height: 20,
            radius: 5,
            callback: function (d) { return d; },
            callbackThisArg: null,
            triggerCallback: 'change' //change, dragend
        };
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils__["merge"])(this.options, options);
        //work on a local copy
        this.scale_ = scale_.clone();
        this.build(__WEBPACK_IMPORTED_MODULE_0_d3__["select"](parent));
    }
    Object.defineProperty(MappingEditor.prototype, "scale", {
        get: function () {
            return this.scale_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MappingEditor.prototype, "filter", {
        get: function () {
            return this.computeFilter();
        },
        enumerable: true,
        configurable: true
    });
    MappingEditor.prototype.build = function ($root) {
        var options = this.options, that = this;
        $root = $root.append('div').classed('lugui-me', true);
        var width = options.width - options.padding_hor * 2;
        var height = options.height - options.padding_ver * 2 - options.filter_height;
        $root.node().innerHTML = "<form onsubmit=\"return false\">\n      <div style=\"text-align: center\"><label for=\"mapping_type\">Mapping Type: <select id=\"mapping_type\">\n        <option value=\"linear\">Linear</option>\n        <option value=\"linear_invert\">Invert</option>\n        <option value=\"linear_abs\">Absolute</option>\n        <option value=\"log\">Log</option>\n        <option value=\"pow1.1\">Pow 1.1</option>\n        <option value=\"pow2\">Pow 2</option>\n        <option value=\"pow3\">Pow 3</option>\n        <option value=\"sqrt\">Sqrt</option>\n        <option value=\"script\">Custom Script</option>\n      </select>\n      </label></div>\n      <div class=\"mapping_area\">\n        <div>\n          <span>0</span>\n          <input type=\"text\" class=\"raw_min\" id=\"raw_min\" value=\"0\"><label for=\"raw_min\">Min</label>\n        </div>\n        <svg width=\"" + options.width + "\" height=\"" + options.height + "\">\n          <line y1=\"" + options.padding_ver + "\" y2=\"" + options.padding_ver + "\" x1=\"" + options.padding_hor + "\" x2=\"" + (width + options.padding_hor) + "\" stroke=\"black\"></line>\n          <rect class=\"adder\" x=\"" + options.padding_hor + "\" width=\"" + width + "\" height=\"10\"></rect>\n          <line y1=\"" + (options.height - options.filter_height - 5) + "\" y2=\"" + (options.height - options.filter_height - 5) + "\" x1=\"" + options.padding_hor + "\" x2=\"" + (width + options.padding_hor) + "\" stroke=\"black\"></line>\n          <rect class=\"adder\" x=\"" + options.padding_hor + "\" width=\"" + width + "\" height=\"10\" y=\"" + (options.height - options.filter_height - 10) + "\"></rect>\n          <g transform=\"translate(" + options.padding_hor + "," + options.padding_ver + ")\">\n            <g class=\"samples\">\n      \n            </g>\n            <g class=\"mappings\">\n      \n            </g>\n            <g class=\"filter\" transform=\"translate(0," + (options.height - options.filter_height - 10) + ")\">\n               <g class=\"left_filter\" transform=\"translate(0,0)\">\n                  <path d=\"M0,0L4,7L-4,7z\"></path>\n                  <rect x=\"-4\" y=\"7\" width=\"40\" height=\"13\" rx=\"2\" ry=\"2\"></rect>\n                  <text y=\"10\" x=\"4\" text-anchor=\"start\">&gt; 0</text>\n              </g>\n              <g class=\"right_filter\" transform=\"translate(" + width + ",0)\">\n                  <path d=\"M0,0L4,7L-4,7z\"></path>\n                  <rect x=\"-36\" y=\"7\" width=\"40\" height=\"13\" rx=\"2\" ry=\"2\"></rect>\n                  <text y=\"10\" x=\"3\" text-anchor=\"end\">&lt; 1</text>\n              </g>\n            </g>\n          </g>\n        </svg>\n        <div>\n          <span>1</span>\n          <input type=\"text\" class=\"raw_max\" id=\"raw_max\" value=\"1\"><label for=\"raw_max\">Max</label>\n        </div>\n      </div>\n      <div class=\"script\" style=\"/* display: none; */\">\n        <label for=\"script_code\">Custom Script</label><button>Apply</button>\n        <textarea id=\"script_code\">\n        </textarea>\n      </div>\n    </form>";
        var raw2pixel = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].linear().domain([Math.min(this.scale.domain[0], this.original.domain[0]), Math.max(this.scale.domain[this.scale.domain.length - 1], this.original.domain[this.original.domain.length - 1])])
            .range([0, width]);
        var normal2pixel = __WEBPACK_IMPORTED_MODULE_0_d3__["scale"].linear().domain([0, 1])
            .range([0, width]);
        $root.select('input.raw_min')
            .property('value', raw2pixel.domain()[0])
            .on('blur', function () {
            var d = raw2pixel.domain();
            d[0] = parseFloat(this.value);
            raw2pixel.domain(d);
            var old = that.scale_.domain;
            old[0] = d[0];
            that.scale_.domain = old;
            updateRaw();
            triggerUpdate();
        });
        $root.select('input.raw_max')
            .property('value', raw2pixel.domain()[1])
            .on('blur', function () {
            var d = raw2pixel.domain();
            d[1] = parseFloat(this.value);
            raw2pixel.domain(d);
            var old = that.scale_.domain;
            old[old.length - 1] = d[1];
            that.scale_.domain = old;
            updateRaw();
            triggerUpdate();
        });
        //lines that show mapping of individual data items
        var datalines = $root.select('g.samples').selectAll('line').data([]);
        this.dataPromise.then(function (data) {
            //to unique values
            data = __WEBPACK_IMPORTED_MODULE_0_d3__["set"](data.map(String)).values().map(parseFloat);
            datalines = datalines.data(data);
            datalines.enter()
                .append('line')
                .attr({
                x1: function (d) { return normal2pixel(that.scale.apply(d)); },
                y1: 0,
                x2: raw2pixel,
                y2: height
            }).style('visibility', function (d) {
                var domain = that.scale.domain;
                return (d < domain[0] || d > domain[domain.length - 1]) ? 'hidden' : null;
            });
        });
        function updateDataLines() {
            datalines.attr({
                x1: function (d) { return normal2pixel(that.scale.apply(d)); },
                x2: raw2pixel
            }).style('visibility', function (d) {
                var domain = that.scale.domain;
                return (d < domain[0] || d > domain[domain.length - 1]) ? 'hidden' : null;
            });
        }
        function createDrag(move) {
            return __WEBPACK_IMPORTED_MODULE_0_d3__["behavior"].drag()
                .on('dragstart', function () {
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this)
                    .classed('dragging', true)
                    .attr('r', options.radius * 1.1);
            })
                .on('drag', move)
                .on('dragend', function () {
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this)
                    .classed('dragging', false)
                    .attr('r', options.radius);
                triggerUpdate(true);
            });
        }
        var mapping_lines = [];
        function renderMappingLines() {
            if (!(that.scale instanceof __WEBPACK_IMPORTED_MODULE_2__model__["ScaleMappingFunction"])) {
                return;
            }
            {
                var sscale = that.scale;
                var domain = sscale.domain;
                var range_1 = sscale.range;
                mapping_lines = domain.map(function (d, i) { return ({ r: d, n: range_1[i] }); });
            }
            function updateScale() {
                //sort by raw value
                mapping_lines.sort(function (a, b) { return a.r - b.r; });
                //update the scale
                var scale = that.scale;
                scale.domain = mapping_lines.map(function (d) { return d.r; });
                scale.range = mapping_lines.map(function (d) { return d.n; });
                //console.log(sscale.domain, sscale.range);
                updateDataLines();
            }
            function removePoint(i) {
                if (mapping_lines.length <= 2) {
                    return; //can't remove have to have at least two
                }
                mapping_lines.splice(i, 1);
                updateScale();
                renderMappingLines();
            }
            function addPoint(x) {
                x = clamp(x, 0, width);
                mapping_lines.push({
                    n: normal2pixel.invert(x),
                    r: raw2pixel.invert(x)
                });
                updateScale();
                renderMappingLines();
            }
            $root.selectAll('rect.adder').on('click', function () {
                addPoint(__WEBPACK_IMPORTED_MODULE_0_d3__["mouse"]($root.select('svg > g').node())[0]);
            });
            var $mapping = $root.select('g.mappings').selectAll('g.mapping').data(mapping_lines);
            var $mapping_enter = $mapping.enter().append('g').classed('mapping', true).on('contextmenu', function (d, i) {
                __WEBPACK_IMPORTED_MODULE_0_d3__["event"].preventDefault();
                __WEBPACK_IMPORTED_MODULE_0_d3__["event"].stopPropagation();
                removePoint(i);
            });
            $mapping_enter.append('line').attr({
                y1: 0,
                y2: height
            }).call(createDrag(function (d) {
                //drag the line shifts both point in parallel
                var dx = __WEBPACK_IMPORTED_MODULE_0_d3__["event"].dx;
                var nx = clamp(normal2pixel(d.n) + dx, 0, width);
                var rx = clamp(raw2pixel(d.r) + dx, 0, width);
                d.n = normal2pixel.invert(nx);
                d.r = raw2pixel.invert(rx);
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).attr('x1', nx).attr('x2', rx);
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentElement).select('circle.normalized').attr('cx', nx);
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentElement).select('circle.raw').attr('cx', rx);
                updateScale();
            }));
            $mapping_enter.append('circle').classed('normalized', true).attr('r', options.radius).call(createDrag(function (d) {
                //drag normalized
                var x = clamp(__WEBPACK_IMPORTED_MODULE_0_d3__["event"].x, 0, width);
                d.n = normal2pixel.invert(x);
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).attr('cx', x);
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentElement).select('line').attr('x1', x);
                updateScale();
            }));
            $mapping_enter.append('circle').classed('raw', true).attr('r', options.radius).attr('cy', height).call(createDrag(function (d) {
                //drag raw
                var x = clamp(__WEBPACK_IMPORTED_MODULE_0_d3__["event"].x, 0, width);
                d.r = raw2pixel.invert(x);
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).attr('cx', x);
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this.parentElement).select('line').attr('x2', x);
                updateScale();
            }));
            $mapping.select('line').attr({
                x1: function (d) { return normal2pixel(d.n); },
                x2: function (d) { return raw2pixel(d.r); }
            });
            $mapping.select('circle.normalized').attr('cx', function (d) { return normal2pixel(d.n); });
            $mapping.select('circle.raw').attr('cx', function (d) { return raw2pixel(d.r); });
            $mapping.exit().remove();
        }
        function renderScript() {
            if (!(that.scale instanceof __WEBPACK_IMPORTED_MODULE_2__model__["ScriptMappingFunction"])) {
                $root.select('div.script').style('display', 'none');
                return;
            }
            $root.select('div.script').style('display', null);
            var sscale = that.scale;
            var $text = $root.select('textarea').text(sscale.code);
            $root.select('div.script').select('button').on('click', function () {
                sscale.code = $text.property('value');
                updateDataLines();
                triggerUpdate();
            });
        }
        renderMappingLines();
        renderScript();
        function triggerUpdate(isDragEnd) {
            if (isDragEnd === void 0) { isDragEnd = false; }
            if (isDragEnd && (options.triggerCallback !== 'dragend')) {
                return;
            }
            options.callback.call(options.callbackThisArg, that.scale.clone(), that.filter);
        }
        {
            var min_filter_1 = (isFinite(this.old_filter.min) ? raw2pixel(this.old_filter.min) : 0);
            var max_filter_1 = (isFinite(this.old_filter.max) ? raw2pixel(this.old_filter.max) : width);
            var toFilterString_1 = function (d, i) { return isFinite(d) ? ((i === 0 ? '>' : '<') + d.toFixed(1)) : 'any'; };
            $root.selectAll('g.left_filter, g.right_filter')
                .data([this.old_filter.min, this.old_filter.max])
                .attr('transform', function (d, i) { return ("translate(" + (i === 0 ? min_filter_1 : max_filter_1) + ",0)"); }).call(createDrag(function (d, i) {
                //drag normalized
                var x = clamp(__WEBPACK_IMPORTED_MODULE_0_d3__["event"].x, 0, width);
                var v = raw2pixel.invert(x);
                var filter = (x <= 0 && i === 0 ? -Infinity : (x >= width && i === 1 ? Infinity : v));
                __WEBPACK_IMPORTED_MODULE_0_d3__["select"](this).datum(filter)
                    .attr('transform', "translate(" + x + ",0)")
                    .select('text').text(toFilterString_1(filter, i));
            }))
                .select('text').text(toFilterString_1);
        }
        this.computeFilter = function () {
            return {
                min: parseFloat($root.select('g.left_filter').datum()),
                max: parseFloat($root.select('g.right_filter').datum())
            };
        };
        function updateRaw() {
            var d = raw2pixel.domain();
            $root.select('input.raw_min').property('value', d[0]);
            $root.select('input.raw_max').property('value', d[1]);
            updateDataLines();
            renderMappingLines();
        }
        updateRaw();
        $root.select('select').on('change', function () {
            var v = this.value;
            if (v === 'linear_invert') {
                that.scale_ = new __WEBPACK_IMPORTED_MODULE_2__model__["ScaleMappingFunction"](raw2pixel.domain(), 'linear', [1, 0]);
            }
            else if (v === 'linear_abs') {
                var d = raw2pixel.domain();
                that.scale_ = new __WEBPACK_IMPORTED_MODULE_2__model__["ScaleMappingFunction"]([d[0], (d[1] - d[0]) / 2, d[1]], 'linear', [1, 0, 1]);
            }
            else if (v === 'script') {
                that.scale_ = new __WEBPACK_IMPORTED_MODULE_2__model__["ScriptMappingFunction"](raw2pixel.domain());
            }
            else {
                that.scale_ = new __WEBPACK_IMPORTED_MODULE_2__model__["ScaleMappingFunction"](raw2pixel.domain(), v);
            }
            updateDataLines();
            renderMappingLines();
            renderScript();
            triggerUpdate();
        }).property('selectedIndex', function () {
            var name = 'script';
            if (that.scale_ instanceof __WEBPACK_IMPORTED_MODULE_2__model__["ScaleMappingFunction"]) {
                name = that.scale.scaleType;
            }
            var types = ['linear', 'linear_invert', 'linear_abs', 'log', 'pow1.1', 'pow2', 'pow3', 'sqrt', 'script'];
            return types.indexOf(name);
        });
    };
    return MappingEditor;
}());
/* harmony default export */ exports["a"] = MappingEditor;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__style_scss__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__style_scss___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__style_scss__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__model__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__provider__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__renderer__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__ui__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__ui_dialogs__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_d3__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_d3___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7_d3__);
/* harmony export (binding) */ __webpack_require__.d(exports, "model", function() { return model; });
/* harmony export (binding) */ __webpack_require__.d(exports, "provider", function() { return provider; });
/* harmony export (binding) */ __webpack_require__.d(exports, "renderer", function() { return renderer; });
/* harmony export (binding) */ __webpack_require__.d(exports, "ui", function() { return ui; });
/* harmony export (binding) */ __webpack_require__.d(exports, "utils", function() { return utils; });
/* harmony export (binding) */ __webpack_require__.d(exports, "ui_dialogs", function() { return ui_dialogs; });
/* harmony export (binding) */ __webpack_require__.d(exports, "LineUp", function() { return LineUp; });
/* harmony export (immutable) */ exports["deriveColors"] = deriveColors;
/* harmony export (immutable) */ exports["createLocalStorage"] = createLocalStorage;
/* harmony export (immutable) */ exports["create"] = create;
/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};








/**
 * access to the model module
 * @type {--global-type--}
 */
var model = __WEBPACK_IMPORTED_MODULE_1__model__;
/**
 * access to the provider module
 * @type {--global-type--}
 */
var provider = __WEBPACK_IMPORTED_MODULE_2__provider__;
/**
 * access to the renderer module
 * @type {--global-type--}
 */
var renderer = __WEBPACK_IMPORTED_MODULE_3__renderer__;
/**
 * access to the ui module
 * @type {--global-type--}
 */
var ui = __WEBPACK_IMPORTED_MODULE_4__ui__;
/**
 * access to the utils module
 * @type {--global-type--}
 */
var utils = __WEBPACK_IMPORTED_MODULE_5__utils__;
/**
 * access to the ui_dialogs module
 * @type {--global-type--}
 */
var ui_dialogs = __WEBPACK_IMPORTED_MODULE_6__ui_dialogs__;
/**
 * main LineUp class managing data and rendering
 */
var LineUp = (function (_super) {
    __extends(LineUp, _super);
    function LineUp(container, data, config) {
        var _this = this;
        if (config === void 0) { config = {}; }
        _super.call(this);
        this.data = data;
        /**
         * default config of LineUp with all available options
         */
        this.config = {
            /**
             * a prefix used for all generated html ids
             */
            idPrefix: Math.random().toString(36).slice(-8).substr(0, 3),
            /**
             * options related to the header html layout
             */
            header: {
                /**
                 * standard height of the header
                 */
                headerHeight: 20,
                /**
                 * height of the header including histogram
                 */
                headerHistogramHeight: 40,
                /**
                 * should labels be automatically rotated if they doesn't fit?
                 */
                autoRotateLabels: false,
                /**
                 * space reserved if a label is rotated
                 */
                rotationHeight: 50,
                /**
                 * the degrees to rotate a label
                 */
                rotationDegree: -20,
                /**
                 * hook for adding buttons to rankings in the header
                 */
                rankingButtons: __WEBPACK_IMPORTED_MODULE_4__ui__["dummyRankingButtonHook"],
                /**
                 * templates for link patterns
                 */
                linkTemplates: []
            },
            /**
             * old name for header
             */
            htmlLayout: {},
            /**
             * visual representation options
             */
            renderingOptions: {
                /**
                 * show combined bars as stacked bars
                 */
                stacked: true,
                /**
                 * use animation for reordering
                 */
                animation: true,
                /**
                 * show histograms of the headers (just settable at the beginning)
                 */
                histograms: false,
                /**
                 * show a mean line for single numberial columns
                 */
                meanLine: false,
            },
            /**
             * options related to the rendering of the body
             */
            body: {
                renderer: 'svg',
                rowHeight: 17,
                rowPadding: 0.2,
                rowBarPadding: 1,
                /**
                 * whether just the visible rows or all rows should be rendered - rendering performance (default: true)
                 */
                visibleRowsOnly: true,
                /**
                 * number of backup rows to keep to avoid updating on every small scroll thing
                 */
                backupScrollRows: 4,
                animationDuration: 1000,
                //number of cols that should be frozen on the left side
                freezeCols: 0,
                rowActions: []
            },
            /**
             * old name for body
             */
            svgLayout: {},
            /**
             *  enables manipulation features, remove column, reorder,...
             */
            manipulative: true,
            /**
             * automatically add a column pool at the end
             */
            pool: false,
            /**
             * the renderers to use for rendering the columns
             */
            renderers: __WEBPACK_IMPORTED_MODULE_3__renderer__["renderers"]()
        };
        this.body = null;
        this.header = null;
        this.pools = [];
        this.contentScroller = null;
        /**
         * local variable that is used by update()
         * @type {boolean}
         */
        this.isUpdateInitialized = false;
        this.$container = container instanceof __WEBPACK_IMPORTED_MODULE_7_d3__["selection"] ? container : __WEBPACK_IMPORTED_MODULE_7_d3__["select"](container);
        this.$container = this.$container.append('div').classed('lu', true);
        this.config.svgLayout = this.config.body;
        this.config.htmlLayout = this.config.header;
        utils.merge(this.config, config);
        this.data.on('selectionChanged.main', this.triggerSelection.bind(this));
        this.header = new __WEBPACK_IMPORTED_MODULE_4__ui__["HeaderRenderer"](data, this.node, {
            manipulative: this.config.manipulative,
            headerHeight: this.config.header.headerHeight,
            headerHistogramHeight: this.config.header.headerHistogramHeight,
            histograms: this.config.renderingOptions.histograms,
            autoRotateLabels: this.config.header.autoRotateLabels,
            rotationHeight: this.config.header.rotationHeight,
            rotationDegree: this.config.header.rotationDegree,
            freezeCols: this.config.body.freezeCols,
            rankingButtons: this.config.header.rankingButtons,
            linkTemplates: this.config.header.linkTemplates
        });
        this.body = new (this.config.body.renderer === 'svg' ? __WEBPACK_IMPORTED_MODULE_4__ui__["BodyRenderer"] : __WEBPACK_IMPORTED_MODULE_4__ui__["BodyCanvasRenderer"])(data, this.node, this.slice.bind(this), {
            rowHeight: this.config.body.rowHeight,
            rowPadding: this.config.body.rowPadding,
            rowBarPadding: this.config.body.rowBarPadding,
            animationDuration: this.config.body.animationDuration,
            meanLine: this.config.renderingOptions.meanLine,
            animation: this.config.renderingOptions.animation,
            stacked: this.config.renderingOptions.stacked,
            actions: this.config.body.rowActions,
            idPrefix: this.config.idPrefix,
            freezeCols: this.config.body.freezeCols,
            renderers: this.config.renderers
        });
        //share hist caches
        this.body.histCache = this.header.sharedHistCache;
        this.forward(this.body, LineUp.EVENT_HOVER_CHANGED);
        if (this.config.pool && this.config.manipulative) {
            this.addPool(new __WEBPACK_IMPORTED_MODULE_4__ui__["PoolRenderer"](data, this.node, this.config));
        }
        if (this.config.body.visibleRowsOnly) {
            this.contentScroller = new __WEBPACK_IMPORTED_MODULE_5__utils__["ContentScroller"](this.$container.node(), this.body.node, {
                backupRows: this.config.body.backupScrollRows,
                rowHeight: this.config.body.rowHeight,
                topShift: function () { return _this.header.currentHeight(); }
            });
            this.contentScroller.on('scroll', function (top, left) {
                //in two svg mode propagate horizontal shift
                //console.log(top, left,'ss');
                _this.header.$node.style('transform', 'translate(' + 0 + 'px,' + top + 'px)');
                if (_this.config.body.freezeCols > 0) {
                    _this.header.updateFreeze(left);
                    _this.body.updateFreeze(left);
                }
            });
            this.contentScroller.on('redraw', this.body.update.bind(this.body));
        }
    }
    LineUp.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat([LineUp.EVENT_HOVER_CHANGED, LineUp.EVENT_SELECTION_CHANGED, LineUp.EVENT_MULTISELECTION_CHANGED, LineUp.EVENT_UPDATE_START, LineUp.EVENT_UPDATE_FINISHED]);
    };
    LineUp.prototype.addPool = function (pool_node, config) {
        if (config === void 0) { config = this.config; }
        if (pool_node instanceof __WEBPACK_IMPORTED_MODULE_4__ui__["PoolRenderer"]) {
            this.pools.push(pool_node);
        }
        else {
            this.pools.push(new __WEBPACK_IMPORTED_MODULE_4__ui__["PoolRenderer"](this.data, pool_node, config));
        }
        return this.pools[this.pools.length - 1];
    };
    Object.defineProperty(LineUp.prototype, "node", {
        /**
         * returns the main lineup DOM element
         * @returns {Element}
         */
        get: function () {
            return this.$container.node();
        },
        enumerable: true,
        configurable: true
    });
    LineUp.prototype.slice = function (start, length, row2y) {
        if (this.contentScroller) {
            return this.contentScroller.select(start, length, row2y);
        }
        return { from: start, to: length };
    };
    /**
     * destroys the DOM elements created by this lineup instance, this should be the last call to this lineup instance
     */
    LineUp.prototype.destroy = function () {
        this.pools.forEach(function (p) { return p.remove(); });
        this.$container.remove();
        if (this.contentScroller) {
            this.contentScroller.destroy();
        }
    };
    /**
     * sorts LineUp by he given column
     * @param column callback function finding the column to sort
     * @param ascending
     * @returns {boolean}
     */
    LineUp.prototype.sortBy = function (column, ascending) {
        if (ascending === void 0) { ascending = false; }
        var col = this.data.find(column);
        if (col) {
            col.sortByMe(ascending);
        }
        return col !== null;
    };
    LineUp.prototype.dump = function () {
        return this.data.dump();
    };
    LineUp.prototype.changeDataStorage = function (data, dump) {
        if (this.data) {
            this.data.on('selectionChanged.main', null);
        }
        this.data = data;
        if (dump) {
            this.data.restore(dump);
        }
        this.data.on('selectionChanged.main', this.triggerSelection.bind(this));
        this.header.changeDataStorage(data);
        this.body.changeDataStorage(data);
        this.pools.forEach(function (p) { return p.changeDataStorage(data); });
        this.update();
    };
    LineUp.prototype.triggerSelection = function (data_indices) {
        this.fire(LineUp.EVENT_SELECTION_CHANGED, data_indices.length > 0 ? data_indices[0] : -1);
        this.fire(LineUp.EVENT_MULTISELECTION_CHANGED, data_indices);
    };
    LineUp.prototype.restore = function (dump) {
        this.changeDataStorage(this.data, dump);
    };
    LineUp.prototype.update = function () {
        var _this = this;
        // HACK: when calling update for the first time the BodyRenderer
        // fires 3x the `renderFinished` event. However, we want to wait for
        // the last event before firing LineUp.EVENT_UPDATE_FINISHED.
        // For any further call of update() the body render will fire the
        // `renderFinished` event only once
        var waitForBodyRenderer = (this.isUpdateInitialized) ? 1 : 3;
        this.isUpdateInitialized = true;
        this.fire(LineUp.EVENT_UPDATE_START);
        this.header.update();
        this.body.update();
        this.pools.forEach(function (p) { return p.update(); });
        this.body.on('renderFinished', function () {
            waitForBodyRenderer -= 1;
            if (waitForBodyRenderer === 0) {
                _this.fire(LineUp.EVENT_UPDATE_FINISHED);
            }
        });
    };
    LineUp.prototype.changeRenderingOption = function (option, value) {
        this.config.renderingOptions[option] = value;
        if (option === 'animation' || option === 'stacked') {
            this.body.setOption(option, value);
            this.body.update();
        }
    };
    /**
     * triggered when the mouse is over a specific row
     * @argument data_index:number the selected data index or <0 if no row
     */
    LineUp.EVENT_HOVER_CHANGED = 'hoverChanged';
    /**
     * triggered when the user click on a row
     * @argument data_index:number the selected data index or <0 if no row
     */
    LineUp.EVENT_SELECTION_CHANGED = 'selectionChanged';
    /**
     * triggered when the user selects one or more rows
     * @argument data_indices:number[] the selected data indices
     */
    LineUp.EVENT_MULTISELECTION_CHANGED = 'multiSelectionChanged';
    /**
     * triggered when LineUpJS.update() was called
     */
    LineUp.EVENT_UPDATE_START = 'updateStart';
    /**
     * triggered when LineUpJS.update() was called and the rendering the body has finished
     */
    LineUp.EVENT_UPDATE_FINISHED = 'updateFinished';
    return LineUp;
}(__WEBPACK_IMPORTED_MODULE_5__utils__["AEventDispatcher"]));
/**
 * assigns colors to colmns if they are numbers and not yet defined
 * @param columns
 * @returns {model_.IColumnDesc[]}
 */
function deriveColors(columns) {
    var colors = __WEBPACK_IMPORTED_MODULE_7_d3__["scale"].category10().range().slice();
    columns.forEach(function (col) {
        switch (col.type) {
            case 'number':
                col.color = colors.shift();
                break;
        }
    });
    return columns;
}
/**
 * creates a local storage provider
 * @param data
 * @param columns
 * @param options
 * @returns {LocalDataProvider}
 */
function createLocalStorage(data, columns, options) {
    if (options === void 0) { options = {}; }
    return new __WEBPACK_IMPORTED_MODULE_2__provider__["LocalDataProvider"](data, columns, options);
}
function create(data, container, config) {
    if (config === void 0) { config = {}; }
    return new LineUp(container, data, config);
}


/***/ }
/******/ ])
});
;
//# sourceMappingURL=LineUpJS.js.map