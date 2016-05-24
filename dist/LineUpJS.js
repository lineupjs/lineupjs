/*! LineUpJS - v0.2.0 - 2016-05-24
* https://github.com/sgratzl/lineup.js
* Copyright (c) 2016 ; Licensed BSD */

//based on https://github.com/ForbesLindesay/umd but with a custom list of external dependencies
;(function (f) {
  // CommonJS
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f(require)(1);

    // RequireJS
  } else if (typeof define === "function" && define.amd) {
    var deps = ['d3'];
    define(deps, function () {
      var resolved_deps = arguments;
      return f(function(name) { return resolved_deps[deps.indexOf(name)]; })(1);
    });
    // <script>
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      // works providing we're not in "use strict";
      // needed for Java 8 Nashorn
      // seee https://github.com/facebook/react/issues/3037
      g = this;
    }
    g.LineUpJS = f(function(name) { return g[name]; })(1);
  }

})(function (require) {
  return  (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
///<reference path='../typings/tsd.d.ts' />
var model_ = require('./model');
var provider_ = require('./provider');
var renderer_ = require('./renderer');
var ui_ = require('./ui');
var utils_ = require('./utils');
var ui_dialogs_ = require('./ui_dialogs');
var d3 = require('d3');
/**
 * access to the model module
 * @type {--global-type--}
 */
exports.model = model_;
/**
 * access to the provider module
 * @type {--global-type--}
 */
exports.provider = provider_;
/**
 * access to the renderer module
 * @type {--global-type--}
 */
exports.renderer = renderer_;
/**
 * access to the ui module
 * @type {--global-type--}
 */
exports.ui = ui_;
/**
 * access to the utils module
 * @type {--global-type--}
 */
exports.utils = utils_;
/**
 * access to the ui_dialogs module
 * @type {--global-type--}
 */
exports.ui_dialogs = ui_dialogs_;
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
                rankingButtons: ui_.dummyRankingButtonHook,
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
            pool: false
        };
        this.body = null;
        this.header = null;
        this.pools = [];
        this.contentScroller = null;
        this.$container = container instanceof d3.selection ? container : d3.select(container);
        this.$container = this.$container.append('div').classed('lu', true);
        this.config.svgLayout = this.config.body;
        this.config.htmlLayout = this.config.header;
        exports.utils.merge(this.config, config);
        this.data.on('selectionChanged.main', this.triggerSelection.bind(this));
        this.header = new ui_.HeaderRenderer(data, this.node, {
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
        this.body = new (this.config.body.renderer === 'svg' ? ui_.BodyRenderer : ui_.BodyCanvasRenderer)(data, this.node, this.slice.bind(this), {
            rowHeight: this.config.body.rowHeight,
            rowPadding: this.config.body.rowPadding,
            rowBarPadding: this.config.body.rowBarPadding,
            animationDuration: this.config.body.animationDuration,
            meanLine: this.config.renderingOptions.meanLine,
            animation: this.config.renderingOptions.animation,
            stacked: this.config.renderingOptions.stacked,
            actions: this.config.body.rowActions,
            idPrefix: this.config.idPrefix,
            freezeCols: this.config.body.freezeCols
        });
        //share hist caches
        this.body.histCache = this.header.sharedHistCache;
        this.forward(this.body, LineUp.EVENT_HOVER_CHANGED);
        if (this.config.pool && this.config.manipulative) {
            this.addPool(new ui_.PoolRenderer(data, this.node, this.config));
        }
        if (this.config.body.visibleRowsOnly) {
            this.contentScroller = new utils_.ContentScroller(this.$container.node(), this.body.node, {
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
        return _super.prototype.createEventList.call(this).concat([LineUp.EVENT_HOVER_CHANGED, LineUp.EVENT_SELECTION_CHANGED, LineUp.EVENT_MULTISELECTION_CHANGED]);
    };
    LineUp.prototype.addPool = function (pool_node, config) {
        if (config === void 0) { config = this.config; }
        if (pool_node instanceof ui_.PoolRenderer) {
            this.pools.push(pool_node);
        }
        else {
            this.pools.push(new ui_.PoolRenderer(this.data, pool_node, config));
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
        this.header.update();
        this.body.update();
        this.pools.forEach(function (p) { return p.update(); });
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
    return LineUp;
}(utils_.AEventDispatcher));
exports.LineUp = LineUp;
/**
 * assigns colors to colmns if they are numbers and not yet defined
 * @param columns
 * @returns {model_.IColumnDesc[]}
 */
function deriveColors(columns) {
    var colors = d3.scale.category10().range().slice();
    columns.forEach(function (col) {
        switch (col.type) {
            case 'number':
                col.color = colors.shift();
                break;
        }
    });
    return columns;
}
exports.deriveColors = deriveColors;
/**
 * creates a local storage provider
 * @param data
 * @param columns
 * @param options
 * @returns {LocalDataProvider}
 */
function createLocalStorage(data, columns, options) {
    if (options === void 0) { options = {}; }
    return new provider_.LocalDataProvider(data, columns, options);
}
exports.createLocalStorage = createLocalStorage;
function create(data, container, config) {
    if (config === void 0) { config = {}; }
    return new LineUp(container, data, config);
}
exports.create = create;

},{"./model":3,"./provider":4,"./renderer":5,"./ui":6,"./ui_dialogs":7,"./utils":8,"d3":undefined}],2:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
"use strict";
///<reference path='../typings/tsd.d.ts' />
var d3 = require('d3');
var utils = require('./utils');
var model = require('./model');
'use strict';
function clamp(v, min, max) {
    return Math.max(Math.min(v, max), min);
}
var MappingEditor = (function () {
    function MappingEditor(parent, scale_, original, dataPromise, options) {
        if (options === void 0) { options = {}; }
        this.parent = parent;
        this.scale_ = scale_;
        this.original = original;
        this.dataPromise = dataPromise;
        this.options = {
            width: 320,
            height: 200,
            padding_hor: 5,
            padding_ver: 5,
            radius: 5,
            callback: function (d) { return d; },
            callbackThisArg: null,
            triggerCallback: 'change' //change, dragend
        };
        utils.merge(this.options, options);
        //work on a local copy
        this.scale_ = scale_.clone();
        this.build(d3.select(parent));
    }
    Object.defineProperty(MappingEditor.prototype, "scale", {
        get: function () {
            return this.scale_;
        },
        enumerable: true,
        configurable: true
    });
    MappingEditor.prototype.build = function ($root) {
        var options = this.options, that = this;
        $root = $root.append('div').classed('lugui-me', true);
        $root.node().innerHTML = "<div>\n    <span class=\"raw_min\">0</span>\n    <span class=\"center\"><label><select>\n        <option value=\"linear\">Linear</option>\n        <option value=\"linear_invert\">Invert</option>\n        <option value=\"linear_abs\">Absolute</option>\n        <option value=\"log\">Log</option>\n        <option value=\"pow1.1\">Pow 1.1</option>\n        <option value=\"pow2\">Pow 2</option>\n        <option value=\"pow3\">Pow 3</option>\n        <option value=\"sqrt\">Sqrt</option>\n        <option value=\"script\">Custom Script</option>\n      </select></label>\n      </span>\n    <span class=\"raw_max\">1</span>\n  </div>\n  <svg width=\"" + options.width + "\" height=\"" + options.height + "\">\n    <rect width=\"100%\" height=\"10\"></rect>\n    <rect width=\"100%\" height=\"10\" y=\"" + (options.height - 10) + "\"></rect>\n    <g transform=\"translate(" + options.padding_hor + "," + options.padding_ver + ")\">\n      <g class=\"samples\">\n\n      </g>\n      <g class=\"mappings\">\n\n      </g>\n    </g>\n  </svg>\n  <div>\n    <input type=\"text\" class=\"raw_min\" value=\"0\">\n    <span class=\"center\">Raw</span>\n    <input type=\"text\" class=\"raw_max\" value=\"1\">\n  </div>\n  <div class=\"script\">\n    <textarea>\n\n    </textarea>\n    <button>Apply</button>\n  </div>";
        var width = options.width - options.padding_hor * 2;
        var height = options.height - options.padding_ver * 2;
        var raw2pixel = d3.scale.linear().domain([Math.min(this.scale.domain[0], this.original.domain[0]), Math.max(this.scale.domain[this.scale.domain.length - 1], this.original.domain[this.original.domain.length - 1])])
            .range([0, width]);
        var normal2pixel = d3.scale.linear().domain([0, 1])
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
            data = d3.set(data.map(String)).values().map(parseFloat);
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
            return d3.behavior.drag()
                .on('dragstart', function () {
                d3.select(this)
                    .classed('dragging', true)
                    .attr('r', options.radius * 1.1);
            })
                .on('drag', move)
                .on('dragend', function () {
                d3.select(this)
                    .classed('dragging', false)
                    .attr('r', options.radius);
                triggerUpdate(true);
            });
        }
        var mapping_lines = [];
        function renderMappingLines() {
            if (!(that.scale instanceof model.ScaleMappingFunction)) {
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
            $root.selectAll('rect').on('click', function () {
                addPoint(d3.mouse($root.select('svg > g').node())[0]);
            });
            var $mapping = $root.select('g.mappings').selectAll('g.mapping').data(mapping_lines);
            var $mapping_enter = $mapping.enter().append('g').classed('mapping', true).on('contextmenu', function (d, i) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                removePoint(i);
            });
            $mapping_enter.append('line').attr({
                y1: 0,
                y2: height
            }).call(createDrag(function (d) {
                //drag the line shifts both point in parallel
                var dx = d3.event.dx;
                var nx = clamp(normal2pixel(d.n) + dx, 0, width);
                var rx = clamp(raw2pixel(d.r) + dx, 0, width);
                d.n = normal2pixel.invert(nx);
                d.r = raw2pixel.invert(rx);
                d3.select(this).attr('x1', nx).attr('x2', rx);
                d3.select(this.parentElement).select('circle.normalized').attr('cx', nx);
                d3.select(this.parentElement).select('circle.raw').attr('cx', rx);
                updateScale();
            }));
            $mapping_enter.append('circle').classed('normalized', true).attr('r', options.radius).call(createDrag(function (d) {
                //drag normalized
                var x = clamp(d3.event.x, 0, width);
                d.n = normal2pixel.invert(x);
                d3.select(this).attr('cx', x);
                d3.select(this.parentElement).select('line').attr('x1', x);
                updateScale();
            }));
            $mapping_enter.append('circle').classed('raw', true).attr('r', options.radius).attr('cy', height).call(createDrag(function (d) {
                //drag raw
                var x = clamp(d3.event.x, 0, width);
                d.r = raw2pixel.invert(x);
                d3.select(this).attr('cx', x);
                d3.select(this.parentElement).select('line').attr('x2', x);
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
            if (!(that.scale instanceof model.ScriptMappingFunction)) {
                $root.select('div.script').style('display', 'none');
                return;
            }
            $root.select('div.script').style('display', null);
            var sscale = that.scale;
            var $text = $root.select('textarea').text(sscale.code);
            $root.select('div.script').select('button').on('click', function () {
                var code = $text.property('value');
                sscale.code = code;
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
            options.callback.call(options.callbackThisArg, that.scale.clone());
        }
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
                that.scale_ = new model.ScaleMappingFunction(raw2pixel.domain(), 'linear', [1, 0]);
            }
            else if (v === 'linear_abs') {
                var d = raw2pixel.domain();
                that.scale_ = new model.ScaleMappingFunction([d[0], (d[1] - d[0]) / 2, d[1]], 'linear', [1, 0, 1]);
            }
            else if (v === 'script') {
                that.scale_ = new model.ScriptMappingFunction(raw2pixel.domain());
            }
            else {
                that.scale_ = new model.ScaleMappingFunction(raw2pixel.domain(), v);
            }
            updateDataLines();
            renderMappingLines();
            renderScript();
            triggerUpdate();
        }).property('selectedIndex', function () {
            var name = 'script';
            if (that.scale_ instanceof model.ScaleMappingFunction) {
                name = that.scale.scaleType;
            }
            var types = ['linear', 'linear_invert', 'linear_abs', 'log', 'pow1.1', 'pow2', 'pow3', 'sqrt', 'script'];
            return types.indexOf(name);
        });
    };
    return MappingEditor;
}());
exports.MappingEditor = MappingEditor;
function create(parent, scale, original, dataPromise, options) {
    if (options === void 0) { options = {}; }
    return new MappingEditor(parent, scale, original, dataPromise, options);
}
exports.create = create;

},{"./model":3,"./utils":8,"d3":undefined}],3:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 06.08.2015.
 */
///<reference path='../typings/tsd.d.ts' />
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var d3 = require('d3');
var utils = require('./utils');
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
        if (value.label === this.label && this.color === value.color) {
            return;
        }
        var events = this.color === value.color ? ['labelChanged', 'metaDataChanged', 'dirtyHeader', 'dirty'] : ['labelChanged', 'metaDataChanged', 'dirtyHeader', 'dirtyValues', 'dirty'];
        this.fire(events, this.getMetaData(), {
            label: this.label = value.label,
            color: this.color = value.color
        });
    };
    Column.prototype.getMetaData = function () {
        return {
            label: this.label,
            color: this.color
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
}(utils.AEventDispatcher));
exports.Column = Column;
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
exports.ValueColumn = ValueColumn;
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
exports.DummyColumn = DummyColumn;
/**
 * checks whether the given column or description is a number column, i.e. the value is a number
 * @param col
 * @returns {boolean}
 */
function isNumberColumn(col) {
    return (col instanceof Column && typeof col.getNumber === 'function' || (!(col instanceof Column) && col.type.match(/(number|stack|ordinal)/) != null));
}
exports.isNumberColumn = isNumberColumn;
/**
 * checks whether the given column or description is a categorical column, i.e. the value is a list of categories
 * @param col
 * @returns {boolean}
 */
function isCategoricalColumn(col) {
    return (col instanceof Column && typeof col.getCategories === 'function' || (!(col instanceof Column) && col.type.match(/(categorical|ordinal)/) != null));
}
exports.isCategoricalColumn = isCategoricalColumn;
function toScale(type) {
    if (type === void 0) { type = 'linear'; }
    switch (type) {
        case 'log':
            return d3.scale.log().clamp(true);
        case 'sqrt':
            return d3.scale.sqrt().clamp(true);
        case 'pow1.1':
            return d3.scale.pow().exponent(1.1).clamp(true);
        case 'pow2':
            return d3.scale.pow().exponent(2).clamp(true);
        case 'pow3':
            return d3.scale.pow().exponent(3).clamp(true);
        default:
            return d3.scale.linear().clamp(true);
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
exports.ScaleMappingFunction = ScaleMappingFunction;
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
exports.ScriptMappingFunction = ScriptMappingFunction;
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
exports.createMappingFunction = createMappingFunction;
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
        this.numberFormat = d3.format('.3n');
        if (desc.map) {
            this.mapping = createMappingFunction(desc.map);
        }
        else if (desc.domain) {
            this.mapping = new ScaleMappingFunction(desc.domain, 'linear', desc.range || [0, 1]);
        }
        this.original = this.mapping.clone();
        if (desc.numberFormat) {
            this.numberFormat = d3.format(desc.numberFormat);
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
            this.numberFormat = d3.format(dump.numberFormat);
        }
    };
    NumberColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['mappingChanged']);
    };
    NumberColumn.prototype.getLabel = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        //keep non number if it is not a number else convert using formatter
        return '' + (typeof v === 'number' ? this.numberFormat(v) : v);
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
        return !((isFinite(this.currentFilter.min) && v < this.currentFilter.min) || (isFinite(this.currentFilter.max) && v < this.currentFilter.max));
    };
    return NumberColumn;
}(ValueColumn));
exports.NumberColumn = NumberColumn;
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
        return v;
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
        return d3.ascending(this.getValue(a), this.getValue(b));
    };
    return StringColumn;
}(ValueColumn));
exports.StringColumn = StringColumn;
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
exports.LinkColumn = LinkColumn;
/**
 * a string column in which the values can be edited locally
 */
var AnnotateColumn = (function (_super) {
    __extends(AnnotateColumn, _super);
    function AnnotateColumn(id, desc) {
        _super.call(this, id, desc);
        this.annotations = d3.map();
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
exports.AnnotateColumn = AnnotateColumn;
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
    return SelectionColumn;
}(ValueColumn));
exports.SelectionColumn = SelectionColumn;
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
        return d3.ascending(this.getValue(a), this.getValue(b));
    };
    return BooleanColumn;
}(ValueColumn));
exports.BooleanColumn = BooleanColumn;
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
        this.colors = d3.scale.category10();
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
            var cats = [], cols = this.colors.range();
            desc.categories.forEach(function (cat, i) {
                if (typeof cat === 'string') {
                    cats.push(cat);
                }
                else {
                    cats.push(cat.name);
                    cols[i] = cat.color;
                }
            });
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
    CategoricalColumn.prototype.colorOf = function (cat) {
        return this.colors(cat);
    };
    CategoricalColumn.prototype.getLabel = function (row) {
        return '' + StringColumn.prototype.getValue.call(this, row);
    };
    CategoricalColumn.prototype.getFirstLabel = function (row) {
        var l = this.getLabels(row);
        return l.length > 0 ? l[0] : null;
    };
    CategoricalColumn.prototype.getLabels = function (row) {
        var v = StringColumn.prototype.getValue.call(this, row);
        var r = v.split(this.separator);
        return r;
    };
    CategoricalColumn.prototype.getValue = function (row) {
        var r = this.getValues(row);
        return r.length > 0 ? r[0] : null;
    };
    CategoricalColumn.prototype.getValues = function (row) {
        var v = StringColumn.prototype.getValue.call(this, row);
        var r = v.split(this.separator);
        return r;
    };
    CategoricalColumn.prototype.getCategories = function (row) {
        return this.getValues(row);
    };
    CategoricalColumn.prototype.getColor = function (row) {
        var cat = this.getFirstLabel(row);
        if (cat === null || cat === '') {
            return null;
        }
        return this.colors(cat);
    };
    CategoricalColumn.prototype.getColors = function (row) {
        return this.getLabels(row).map(this.colors);
    };
    CategoricalColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.filter = this.currentFilter;
        r.colors = {
            domain: this.colors.domain(),
            range: this.colors.range(),
            separator: this.separator
        };
        return r;
    };
    CategoricalColumn.prototype.restore = function (dump, factory) {
        _super.prototype.restore.call(this, dump, factory);
        this.currentFilter = dump.filter || null;
        if (dump.colors) {
            this.colors.domain(dump.colors.domain).range(dump.colors.range);
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
        var vs = this.getValues(row), filter = this.currentFilter;
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
            var ci = d3.ascending(va[i], vb[i]);
            if (ci !== 0) {
                return ci;
            }
        }
        //smaller length wins
        return va.length - vb.length;
    };
    return CategoricalColumn;
}(ValueColumn));
exports.CategoricalColumn = CategoricalColumn;
/**
 * similar to a categorical column but the categories are mapped to numbers
 */
var CategoricalNumberColumn = (function (_super) {
    __extends(CategoricalNumberColumn, _super);
    function CategoricalNumberColumn(id, desc) {
        _super.call(this, id, desc);
        this.colors = d3.scale.category10();
        this.scale = d3.scale.ordinal().rangeRoundPoints([0, 1]);
        this.currentFilter = null;
        /**
         * separator for multi handling
         * @type {string}
         */
        this.separator = ';';
        this.combiner = d3.max;
        this.separator = desc.separator || this.separator;
        CategoricalColumn.prototype.initCategories.call(this, desc);
        this.scale.domain(this.colors.domain());
        if (desc.categories) {
            var values = [];
            desc.categories.forEach(function (d) {
                if (typeof d !== 'string' && typeof (d.value) === 'number') {
                    values.push(d.value);
                }
                else {
                    values.push(0.5); //by default 0.5
                }
            });
            this.scale.range(values);
        }
    }
    CategoricalNumberColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['mappingChanged']);
    };
    Object.defineProperty(CategoricalNumberColumn.prototype, "categories", {
        get: function () {
            return this.colors.domain();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CategoricalNumberColumn.prototype, "categoryColors", {
        get: function () {
            return this.colors.range();
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
        if (this.combiner === d3.max) {
            //use the max color
            return cs.slice(1).reduce(function (prev, act, i) { return vs[i + 1] > prev.v ? { c: act, v: vs[i + 1] } : prev; }, {
                c: cs[0],
                v: vs[0]
            }).c;
        }
        else if (this.combiner === d3.min) {
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
exports.CategoricalNumberColumn = CategoricalNumberColumn;
/**
 * implementation of a combine column, standard operations how to select
 */
var CompositeColumn = (function (_super) {
    __extends(CompositeColumn, _super);
    function CompositeColumn(id, desc) {
        _super.call(this, id, desc);
        this.missingValue = 0;
        this._children = [];
        this.numberFormat = d3.format('.3n');
        if (desc.numberFormat) {
            this.numberFormat = d3.format(desc.numberFormat);
        }
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
        r.missingValue = this.missingValue;
        return r;
    };
    CompositeColumn.prototype.restore = function (dump, factory) {
        var _this = this;
        if (dump.missingValue) {
            this.missingValue = dump.missingValue;
        }
        if (dump.numberFormat) {
            this.numberFormat = d3.format(dump.numberFormat);
        }
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
        if (!isNumberColumn(col)) {
            return null;
        }
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
    CompositeColumn.prototype.getLabel = function (row) {
        var v = this.getValue(row);
        //keep non number if it is not a number else convert using formatter
        return '' + (typeof v === 'number' ? this.numberFormat(v) : v);
    };
    CompositeColumn.prototype.getValue = function (row) {
        //weighted sum
        var v = this.compute(row);
        if (typeof (v) === 'undefined' || v == null || isNaN(v)) {
            return this.missingValue;
        }
        return v;
    };
    CompositeColumn.prototype.compute = function (row) {
        return NaN;
    };
    CompositeColumn.prototype.getNumber = function (row) {
        return this.getValue(row);
    };
    CompositeColumn.prototype.compare = function (a, b) {
        return numberCompare(this.getValue(a), this.getValue(b));
    };
    CompositeColumn.prototype.isFiltered = function () {
        return this._children.some(function (d) { return d.isFiltered(); });
    };
    CompositeColumn.prototype.filter = function (row) {
        return this._children.every(function (d) { return d.filter(row); });
    };
    return CompositeColumn;
}(Column));
exports.CompositeColumn = CompositeColumn;
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
            s = d3.sum(weights);
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
        s = d3.sum(weights) / this.getWidth();
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
}(CompositeColumn));
exports.StackColumn = StackColumn;
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
        return d3.max(this._children, function (d) { return d.getValue(row); });
    };
    return MaxColumn;
}(CompositeColumn));
exports.MaxColumn = MaxColumn;
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
        return d3.min(this._children, function (d) { return d.getValue(row); });
    };
    return MinColumn;
}(CompositeColumn));
exports.MinColumn = MinColumn;
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
        return d3.mean(this._children, function (d) { return d.getValue(row); });
    };
    return MeanColumn;
}(CompositeColumn));
exports.MeanColumn = MeanColumn;
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
exports.ScriptColumn = ScriptColumn;
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
exports.RankColumn = RankColumn;
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
     * converts the sorting criteria to a json compatible notation for transfering it to the server
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
}(utils.AEventDispatcher));
exports.Ranking = Ranking;
/**
 * utility for creating a stacked column description
 * @type {function(string=): {type: string, label: string}}
 */
exports.createStackDesc = StackColumn.desc;
exports.createRankDesc = RankColumn.desc;
exports.createSelectionDesc = SelectionColumn.desc;
exports.createMinDesc = MinColumn.desc;
exports.createMaxDesc = MaxColumn.desc;
exports.createMeanDesc = MeanColumn.desc;
exports.createScriptDesc = ScriptColumn.desc;
/**
 * utility for creating an action description with optional label
 * @param label
 * @returns {{type: string, label: string}}
 */
function createActionDesc(label) {
    if (label === void 0) { label = 'actions'; }
    return { type: 'actions', label: label };
}
exports.createActionDesc = createActionDesc;
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
        script: ScriptColumn
    };
}
exports.models = models;

},{"./utils":8,"d3":undefined}],4:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var model = require('./model');
var utils = require('./utils');
var d3 = require('d3');
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
    var hist = d3.layout.histogram().value(acc);
    if (range) {
        hist.range(function () { return range; });
    }
    var ex = d3.extent(arr, acc);
    var hist_data = hist(arr);
    return {
        min: ex[0],
        max: ex[1],
        mean: d3.mean(arr, acc),
        count: arr.length,
        maxBin: d3.max(hist_data, function (d) { return d.y; }),
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
    var m = d3.map();
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
        maxBin: d3.max(m.values()),
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
    function DataProvider() {
        var _this = this;
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
        this.selection = d3.set();
        this.uid = 0;
        /**
         * lookup map of a column type to its column implementation
         */
        this.columnTypes = model.models();
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
        var that = this;
        this.reorder = function () {
            that.triggerReorder(this.source);
        };
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
        r.on('dirtyOrder.provider', this.reorder);
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
     * @returns {model.Ranking[]}
     */
    DataProvider.prototype.getRankings = function () {
        return this.rankings_.slice();
    };
    /**
     * returns the last ranking for quicker access
     * @returns {model.Ranking}
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
     * @return {model.Column} the newly created column or null
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
     * @return {model.Column} the newly created column or null
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
     * @returns {model.Column] the new column or null if it can't be created
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
     * @returns {model.Column}
     */
    DataProvider.prototype.clone = function (col) {
        var dump = this.dumpColumn(col);
        return this.restoreColumn(dump);
    };
    /**
     * restores a column from a dump
     * @param dump
     * @returns {model.Column}
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
     * @returns {model.Column}
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
        if (!ranking.children.some(function (d) { return d instanceof model.RankColumn; })) {
            ranking.insert(this.create(model.RankColumn.desc()), 0);
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
                if (!ranking.children.some(function (d) { return d instanceof model.RankColumn; })) {
                    ranking.insert(_this.create(model.RankColumn.desc()), 0);
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
                return _this.create(model.createRankDesc());
            }
            if (column.type === 'selection') {
                return _this.create(model.createSelectionDesc());
            }
            if (column.type === 'actions') {
                var r = _this.create(model.createActionDesc(column.label || 'actions'));
                r.restore(column, null);
                return r;
            }
            if (column.type === 'stacked') {
                //create a stacked one
                var r_1 = _this.create(model.createStackDesc(column.label || 'Combined'));
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
        if (!ranking.children.some(function (d) { return d instanceof model.RankColumn; })) {
            ranking.insert(this.create(model.createRankDesc()), 0);
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
     * @returns {{stats: (function(model.INumberColumn): *), hist: (function(model.ICategoricalColumn): *)}}
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
     */
    DataProvider.prototype.selectAll = function (indices) {
        var _this = this;
        indices.forEach(function (index) {
            _this.selection.add(String(index));
        });
        this.fire('selectionChanged', this.selection.values().map(Number));
    };
    /**
     * set the selection to the given rows
     * @param indices
     */
    DataProvider.prototype.setSelection = function (indices) {
        var _this = this;
        if (this.selection.size() === indices.length && indices.every(function (i) { return _this.selection.has(String(i)); })) {
            return; //no change
        }
        this.selection = d3.set();
        this.selectAll(indices);
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
        this.selection = d3.set();
        this.fire('selectionChanged', []);
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
            quoteChar: '"'
        };
        //optionaly quote not numbers
        function quote(l, c) {
            if (op.quote && (!c || !model.isNumberColumn(c))) {
                return op.quoteChar + l + op.quoteChar;
            }
            return l;
        }
        utils.merge(op, options);
        var columns = ranking.flatColumns;
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
}(utils.AEventDispatcher));
exports.DataProvider = DataProvider;
/**
 * common base implementation of a DataProvider with a fixed list of column descriptions
 */
var CommonDataProvider = (function (_super) {
    __extends(CommonDataProvider, _super);
    function CommonDataProvider(columns) {
        var _this = this;
        if (columns === void 0) { columns = []; }
        _super.call(this);
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
        this.rankingIndex = 1 + d3.max(this.getRankings(), function (r) { return +r.id.substring(4); });
    };
    CommonDataProvider.prototype.nextRankingId = function () {
        return 'rank' + (this.rankingIndex++);
    };
    return CommonDataProvider;
}(DataProvider));
exports.CommonDataProvider = CommonDataProvider;
/**
 * a data provider based on an local array
 */
var LocalDataProvider = (function (_super) {
    __extends(LocalDataProvider, _super);
    function LocalDataProvider(data, columns, options) {
        if (columns === void 0) { columns = []; }
        if (options === void 0) { options = {}; }
        _super.call(this, columns);
        this.data = data;
        this.options = {
            /**
             * whether the filter should be applied to all rankings regardless where they are
             */
            filterGlobally: false
        };
        utils.merge(this.options, options);
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
        var new_ = new model.Ranking(id);
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
            new_.push(this.create(model.createRankDesc()));
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
        var slice = indices.map(function (index) { return _this.data[index]; });
        return Promise.resolve(slice);
    };
    /**
     * helper for computing statistics
     * @param indices
     * @returns {{stats: (function(model.INumberColumn): *), hist: (function(model.ICategoricalColumn): *)}}
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
        var f = typeof search === 'string' ? function (v) { return v.indexOf(search) >= 0; } : function (v) { return v.match(search) != null; };
        var indices = this.data.filter(function (row) {
            return f(col.getLabel(row));
        }).map(function (row) { return row._index; });
        this.setSelection(indices);
    };
    return LocalDataProvider;
}(CommonDataProvider));
exports.LocalDataProvider = LocalDataProvider;
/**
 * a remote implementation of the data provider
 */
var RemoteDataProvider = (function (_super) {
    __extends(RemoteDataProvider, _super);
    function RemoteDataProvider(server, columns) {
        if (columns === void 0) { columns = []; }
        _super.call(this, columns);
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
        var r = new model.Ranking(id);
        r.push(this.create(model.createRankDesc()));
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
exports.RemoteDataProvider = RemoteDataProvider;

},{"./model":3,"./utils":8,"d3":undefined}],5:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var model = require('./model');
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
        if (rowNode.hasChildNodes()) {
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
exports.DefaultCellRenderer = DefaultCellRenderer;
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
    }
    BarCellRenderer.prototype.render = function ($col, col, rows, context) {
        var _this = this;
        //map to bars
        var $rows = $col.datum(col).selectAll('rect.bar').data(rows, context.rowKey);
        $rows.enter().append('rect').attr({
            'class': 'bar ' + col.cssClass,
            x: function (d, i) { return context.cellX(i); },
            y: function (d, i) { return context.cellPrevY(i) + context.option('rowPadding', 1); },
            width: function (d) {
                var n = col.getWidth() * col.getValue(d);
                return isNaN(n) ? 0 : n;
            }
        }).style('fill', col.color);
        $rows.attr({
            'data-index': function (d, i) { return i; },
            height: function (d, i) { return context.rowHeight(i) - context.option('rowPadding', 1) * 2; }
        });
        context.animated($rows).attr({
            x: function (d, i) { return context.cellX(i); },
            y: function (d, i) { return context.cellY(i) + context.option('rowPadding', 1); },
            width: function (d) {
                var n = col.getWidth() * col.getValue(d);
                return isNaN(n) ? 0 : n;
            }
        }).style({
            fill: function (d, i) { return _this.colorOf(d, i, col); }
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
        return $col.selectAll('rect.bar[data-index="' + index + '"]');
    };
    BarCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
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
        ctx.save();
        rows.forEach(function (d, i) {
            var x = context.cellX(i);
            var y = context.cellY(i) + context.option('rowPadding', 1);
            var n = col.getWidth() * col.getValue(d);
            var w = isNaN(n) ? 0 : n;
            var h = context.rowHeight(i) - context.option('rowPadding', 1) * 2;
            ctx.fillStyle = _this.colorOf(d, i, col) || col.color || model.Column.DEFAULT_COLOR;
            ctx.fillRect(x, y, w, h);
        });
        ctx.restore();
    };
    BarCellRenderer.prototype.mouseEnterCanvas = function (ctx, col, row, index, context) {
        ctx.save();
        ctx.fillText(col.getLabel(row), context.cellX(index), context.cellY(index), col.getWidth());
        ctx.restore();
    };
    return BarCellRenderer;
}(DefaultCellRenderer));
exports.BarCellRenderer = BarCellRenderer;
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
        var color = d3.hsl(col.color || model.Column.DEFAULT_COLOR);
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
exports.HeatMapCellRenderer = HeatMapCellRenderer;
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
            d3.event.preventDefault();
            d3.event.stopPropagation();
            d.action(row);
        });
    };
    ActionCellRenderer.prototype.mouseLeave = function ($col, $row, col, row, index, context) {
        $row.selectAll('*').remove();
    };
    return ActionCellRenderer;
}());
exports.ActionCellRenderer = ActionCellRenderer;
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
            d3.event.preventDefault();
            d3.event.stopPropagation();
            var new_ = col.toggleValue(d);
            d3.select(this).text(new_ === true ? '\uf046' : '\uf096');
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
exports.SelectionCellRenderer = SelectionCellRenderer;
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
        }).on('click', function () { return d3.event.stopPropagation(); });
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
exports.defaultRenderer = defaultRenderer;
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
exports.barRenderer = barRenderer;
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
    function StackCellRenderer() {
        _super.apply(this, arguments);
    }
    StackCellRenderer.prototype.renderImpl = function ($base, col, context, perChild, rowGetter, animated) {
        if (animated === void 0) { animated = true; }
        var $group = $base.datum(col), children = col.children, stacked = context.showStacked(col);
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
            perChild(d3.select(this), d, i, context);
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
        var children = stack.children, stacked = context.showStacked(stack);
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
        ordinal: combineRenderer,
        max: combineRenderer,
        min: combineRenderer,
        mean: combineRenderer,
        script: combineRenderer,
        actions: new ActionCellRenderer(),
        annotate: new AnnotateCellRenderer(),
        selection: new SelectionCellRenderer()
    };
}
exports.renderers = renderers;

},{"./model":3}],6:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
///<reference path='../typings/tsd.d.ts' />
var d3 = require('d3');
var utils = require('./utils');
var model = require('./model');
var renderer = require('./renderer');
var dialogs = require('./ui_dialogs');
var PoolEntry = (function () {
    function PoolEntry(desc) {
        this.desc = desc;
        this.used = 0;
    }
    return PoolEntry;
}());
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
        utils.merge(this.options, options);
        this.$node = d3.select(parent).append('div').classed('lu-pool', true);
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
            var e = d3.event;
            e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
            e.dataTransfer.setData('text/plain', d.label);
            e.dataTransfer.setData('application/caleydo-lineup-column', JSON.stringify(data.toDescRef(d)));
            if (model.isNumberColumn(d)) {
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
                return s.cssClass ? null : s.color || model.Column.DEFAULT_COLOR;
            }
        });
        $headers.attr({
            title: function (d) { return d.label; }
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
                var perRow = d3.round(this.options.width / this.options.elemWidth, 0);
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
                var perRow = d3.round(this.options.width / this.options.elemWidth, 0);
                return { x: (i % perRow) * this.options.elemWidth, y: Math.floor(i / perRow) * this.options.elemHeight };
            //case 'vertical':
            default:
                return { x: 0, y: i * this.options.elemHeight };
        }
    };
    return PoolRenderer;
}());
exports.PoolRenderer = PoolRenderer;
function dummyRankingButtonHook() {
    return null;
}
exports.dummyRankingButtonHook = dummyRankingButtonHook;
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
            filterDialogs: dialogs.filterDialogs(),
            linkTemplates: [],
            searchAble: function (col) { return col instanceof model.StringColumn; },
            sortOnLabel: true,
            autoRotateLabels: false,
            rotationHeight: 50,
            rotationDegree: -20,
            freezeCols: 0,
            rankingButtons: dummyRankingButtonHook
        };
        this.histCache = d3.map();
        this.dragHandler = d3.behavior.drag()
            .on('dragstart', function () {
            d3.select(this).classed('dragging', true);
            d3.event.sourceEvent.stopPropagation();
            d3.event.sourceEvent.preventDefault();
        })
            .on('drag', function (d) {
            //the new width
            var newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
            d.setWidth(newValue);
            d3.event.sourceEvent.stopPropagation();
            d3.event.sourceEvent.preventDefault();
        })
            .on('dragend', function (d) {
            d3.select(this).classed('dragging', false);
            d3.event.sourceEvent.stopPropagation();
            d3.event.sourceEvent.preventDefault();
        });
        this.dropHandler = utils.dropAble(['application/caleydo-lineup-column-ref', 'application/caleydo-lineup-column'], function (data, d, copy) {
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
            if (d instanceof model.Column) {
                return d.insertAfterMe(col) != null;
            }
            else {
                var r = _this.data.getLastRanking();
                return r.push(col) !== null;
            }
        });
        utils.merge(this.options, options);
        this.$node = d3.select(parent).append('div').classed('lu-header', true);
        this.$node.append('div').classed('drop', true).call(this.dropHandler);
        this.changeDataStorage(data);
    }
    HeaderRenderer.prototype.changeDataStorage = function (data) {
        var _this = this;
        if (this.data) {
            this.data.on(['dirtyHeader.headerRenderer', 'orderChanged.headerRenderer', 'selectionChanged.headerRenderer'], null);
        }
        this.data = data;
        data.on('dirtyHeader.headerRenderer', utils.delayedCall(this.update.bind(this), 1));
        if (this.options.histograms) {
            data.on('orderChanged.headerRenderer', function () {
                _this.updateHist();
                _this.update();
            });
            data.on('selectionChanged.headerRenderer', utils.delayedCall(this.drawSelection.bind(this), 1));
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
            cols.filter(function (d) { return d instanceof model.NumberColumn && !d.isHidden(); }).forEach(function (col) {
                _this.histCache.set(col.id, histo === null ? null : histo.stats(col));
            });
            cols.filter(function (d) { return model.isCategoricalColumn(d) && !d.isHidden(); }).forEach(function (col) {
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
                cols.filter(function (d) { return d instanceof model.NumberColumn && !d.isHidden(); }).forEach(function (col) {
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
                cols.filter(function (d) { return model.isCategoricalColumn(d) && !d.isHidden(); }).forEach(function (col) {
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
        function countStacked(c) {
            if (c instanceof model.StackColumn && !c.getCollapsed() && !c.getCompressed()) {
                return 1 + Math.max.apply(Math, c.children.map(countStacked));
            }
            return 1;
        }
        var levels = Math.max.apply(Math, columns.map(countStacked));
        var height = (this.options.histograms ? this.options.headerHistogramHeight : this.options.headerHeight) + (levels - 1) * this.options.headerHeight;
        if (this.options.autoRotateLabels) {
            //check if we have overflows
            var rotatedAny = false;
            this.$node.selectAll('div.header')
                .style('height', height + 'px').select('div.lu-label').each(function (d) {
                var w = this.querySelector('span.lu-label').offsetWidth;
                var actWidth = d.getWidth();
                if (w > (actWidth + 30)) {
                    d3.select(this).style('transform', "rotate(" + that.options.rotationDegree + "deg)");
                    rotatedAny = true;
                }
                else {
                    d3.select(this).style('transform', null);
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
        var $regular = $node.filter(function (d) { return !(d instanceof model.Ranking); }), $stacked = $node.filter(function (d) { return d instanceof model.StackColumn; });
        //edit weights
        $stacked.append('i').attr('class', 'fa fa-tasks').attr('title', 'Edit Weights').on('click', function (d) {
            dialogs.openEditWeightsDialog(d, d3.select(this.parentNode.parentNode));
            d3.event.stopPropagation();
        });
        //rename
        $regular.append('i').attr('class', 'fa fa-pencil-square-o').attr('title', 'Rename').on('click', function (d) {
            dialogs.openRenameDialog(d, d3.select(this.parentNode.parentNode));
            d3.event.stopPropagation();
        });
        //clone
        $regular.append('i').attr('class', 'fa fa-code-fork').attr('title', 'Generate Snapshot').on('click', function (d) {
            provider.takeSnapshot(d);
            d3.event.stopPropagation();
        });
        //edit link
        $node.filter(function (d) { return d instanceof model.LinkColumn; }).append('i').attr('class', 'fa fa-external-link').attr('title', 'Edit Link Pattern').on('click', function (d) {
            dialogs.openEditLinkDialog(d, d3.select(this.parentNode.parentNode), [].concat(d.desc.templates || [], that.options.linkTemplates));
            d3.event.stopPropagation();
        });
        //edit script
        $node.filter(function (d) { return d instanceof model.ScriptColumn; }).append('i').attr('class', 'fa fa-gears').attr('title', 'Edit Combine Script').on('click', function (d) {
            dialogs.openEditScriptDialog(d, d3.select(this.parentNode.parentNode));
            d3.event.stopPropagation();
        });
        //filter
        $node.filter(function (d) { return filterDialogs.hasOwnProperty(d.desc.type); }).append('i').attr('class', 'fa fa-filter').attr('title', 'Filter').on('click', function (d) {
            filterDialogs[d.desc.type](d, d3.select(this.parentNode.parentNode), provider);
            d3.event.stopPropagation();
        });
        //search
        $node.filter(function (d) { return _this.options.searchAble(d); }).append('i').attr('class', 'fa fa-search').attr('title', 'Search').on('click', function (d) {
            dialogs.openSearchDialog(d, d3.select(this.parentNode.parentNode), provider);
            d3.event.stopPropagation();
        });
        //collapse
        $regular.append('i')
            .attr('class', 'fa')
            .classed('fa-toggle-left', function (d) { return !d.getCompressed(); })
            .classed('fa-toggle-right', function (d) { return d.getCompressed(); })
            .attr('title', '(Un)Collapse')
            .on('click', function (d) {
            d.setCompressed(!d.getCompressed());
            d3.select(this)
                .classed('fa-toggle-left', !d.getCompressed())
                .classed('fa-toggle-right', d.getCompressed());
            d3.event.stopPropagation();
        });
        //compress
        $stacked.append('i')
            .attr('class', 'fa')
            .classed('fa-compress', function (d) { return !d.getCollapsed(); })
            .classed('fa-expand', function (d) { return d.getCollapsed(); })
            .attr('title', 'Compress/Expand')
            .on('click', function (d) {
            d.setCollapsed(!d.getCollapsed());
            d3.select(this)
                .classed('fa-compress', !d.getCollapsed())
                .classed('fa-expand', d.getCollapsed());
            d3.event.stopPropagation();
        });
        //remove
        $node.append('i').attr('class', 'fa fa-times').attr('title', 'Hide').on('click', function (d) {
            if (d instanceof model.RankColumn) {
                provider.removeRanking(d.findMyRanker());
                if (provider.getRankings().length === 0) {
                    provider.pushRanking();
                }
            }
            else {
                d.removeMe();
            }
            d3.event.stopPropagation();
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
        });
        var $header_enter_div = $headers_enter.append('div').classed('lu-label', true).on('click', function (d) {
            if (_this.options.manipulative && !d3.event.defaultPrevented) {
                d.toggleMySorting();
            }
        })
            .on('dragstart', function (d) {
            var e = d3.event;
            e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
            e.dataTransfer.setData('text/plain', d.label);
            e.dataTransfer.setData('application/caleydo-lineup-column-ref', d.id);
            var ref = JSON.stringify(_this.data.toDescRef(d.desc));
            e.dataTransfer.setData('application/caleydo-lineup-column', ref);
            if (model.isNumberColumn(d)) {
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
            title: function (d) { return d.label; },
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
        $headers.filter(function (d) { return d instanceof model.StackColumn; }).each(function (col) {
            if (col.getCollapsed() || col.getCompressed()) {
                d3.select(this).selectAll('div.' + clazz + '_i').remove();
            }
            else {
                var s_shifts = [];
                col.flatten(s_shifts, 0, 1, that.options.columnPadding);
                var s_columns = s_shifts.map(function (d) { return d.col; });
                that.renderColumns(s_columns, s_shifts, d3.select(this), clazz + (clazz.substr(clazz.length - 2) !== '_i' ? '_i' : ''));
            }
        }).select('div.lu-label').call(utils.dropAble(['application/caleydo-lineup-column-number-ref', 'application/caleydo-lineup-column-number'], function (data, d, copy) {
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
            $headers.filter(function (d) { return model.isCategoricalColumn(d); }).each(function (col) {
                var $this = d3.select(this).select('div.histogram');
                var hist = that.histCache.get(col.id);
                if (hist) {
                    hist.then(function (stats) {
                        var $bars = $this.selectAll('div.bar').data(stats.hist);
                        $bars.enter().append('div').classed('bar', true);
                        var sx = d3.scale.ordinal().domain(col.categories).rangeBands([0, 100], 0.1);
                        var sy = d3.scale.linear().domain([0, stats.maxBin]).range([0, 100]);
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
            $headers.filter(function (d) { return d instanceof model.NumberColumn; }).each(function (col) {
                var $this = d3.select(this).select('div.histogram');
                var hist = that.histCache.get(col.id);
                if (hist) {
                    hist.then(function (stats) {
                        var $bars = $this.selectAll('div.bar').data(stats.hist);
                        $bars.enter().append('div').classed('bar', true);
                        var sx = d3.scale.ordinal().domain(d3.range(stats.hist.length).map(String)).rangeBands([0, 100], 0.1);
                        var sy = d3.scale.linear().domain([0, stats.maxBin]).range([0, 100]);
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
exports.HeaderRenderer = HeaderRenderer;
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
            renderers: renderer.renderers(),
            meanLine: false,
            actions: [],
            freezeCols: 0
        };
        this.currentFreezeLeft = 0;
        this.histCache = d3.map();
        //merge options
        utils.merge(this.options, options);
        this.$node = d3.select(parent).append('svg').classed('lu-body', true);
        this.changeDataStorage(data);
    }
    BodyRenderer.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['hoverChanged']);
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
        if (this.data) {
            this.data.on(['dirtyValues.bodyRenderer', 'selectionChanged.bodyRenderer'], null);
        }
        this.data = data;
        data.on('dirtyValues.bodyRenderer', utils.delayedCall(this.update.bind(this), 1));
        data.on('selectionChanged.bodyRenderer', utils.delayedCall(this.drawSelection.bind(this), 1));
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
                if (col.getCompressed() && model.isNumberColumn(col)) {
                    return options.renderers.heatmap;
                }
                if (col instanceof model.StackColumn && col.getCollapsed()) {
                    return options.renderers.number;
                }
                var l = options.renderers[col.desc.type];
                return l || renderer.defaultRenderer();
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
                return options.stacked;
            },
            idPrefix: options.idPrefix,
            animated: function ($sel) { return options.animation ? $sel.transition().duration(options.animationDuration) : $sel; },
            //show mean line if option is enabled and top level
            showMeanLine: function (col) { return options.meanLine && model.isNumberColumn(col) && !col.getCompressed() && col.parent instanceof model.Ranking; },
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
            var $col = d3.select(this);
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
                    context.renderer(d).mouseEnter($cols.selectAll('g.child[data-index="' + i + '"]'), d3.select(_this), d, data[index], index, context);
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
                    context.renderer(d).mouseLeave($cols.selectAll('g.child[data-index="' + i + '"]'), d3.select(_this).select('g.child'), d, data[index], index, context);
                });
            }).remove();
            //data.mouseLeave(d, i);
        }
        this.mouseOverItem = function (data_index, hover) {
            if (hover === void 0) { hover = true; }
            $rankings.each(function (ranking, rankingIndex) {
                var $ranking = d3.select(this);
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
            _this.select(data_index.d, d3.event.ctrlKey);
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
    BodyRenderer.prototype.select = function (dataIndex, additional) {
        if (additional === void 0) { additional = false; }
        var selected = this.data.toggleSelection(dataIndex, additional);
        this.$node.selectAll('g.row[data-index="' + dataIndex + '"], line.slope[data-index="' + dataIndex + '"]').classed('selected', selected);
    };
    BodyRenderer.prototype.hasAnySelectionColumn = function () {
        return this.data.getRankings().some(function (r) { return r.children.some(function (c) { return c instanceof model.SelectionColumn && !c.isHidden(); }); });
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
            var s = d3.set(indices);
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
        var x = d3.transform($col.attr('transform') || '').translate[0];
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
        var maxElems = d3.max(rankings, function (d) { return d.getOrder().length; }) || 0;
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
                o2 += (o.getCompressed() ? model.Column.COMPRESSED_WIDTH : o.getWidth()) + _this.options.columnPadding;
                if (o instanceof model.StackColumn && !o.getCollapsed() && !o.getCompressed()) {
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
}(utils.AEventDispatcher));
exports.BodyRenderer = BodyRenderer;
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
            renderers: renderer.renderers(),
            meanLine: false,
            freezeCols: 0
        };
        this.histCache = d3.map();
        //merge options
        utils.merge(this.options, options);
        this.$node = d3.select(parent).append('canvas').classed('lu-canvas.body', true);
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
        data.on('dirtyValues.bodyRenderer', utils.delayedCall(this.update.bind(this), 1));
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
                if (col.getCompressed() && model.isNumberColumn(col)) {
                    return options.renderers.heatmap;
                }
                if (col instanceof model.StackColumn && col.getCollapsed()) {
                    return options.renderers.number;
                }
                var l = options.renderers[col.desc.type];
                return l || renderer.defaultRenderer();
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
                return options.stacked;
            },
            idPrefix: options.idPrefix,
            animated: function ($sel) { return $sel; },
            //show mean line if option is enabled and top level
            showMeanLine: function (col) { return options.meanLine && model.isNumberColumn(col) && !col.getCompressed() && col.parent instanceof model.Ranking; },
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
        var maxElems = d3.max(rankings, function (d) { return d.getOrder().length; }) || 0;
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
                o2 += (o.getCompressed() ? model.Column.COMPRESSED_WIDTH : o.getWidth()) + _this.options.columnPadding;
                if (o instanceof model.StackColumn && !o.getCollapsed() && !o.getCompressed()) {
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
}(utils.AEventDispatcher));
exports.BodyCanvasRenderer = BodyCanvasRenderer;

},{"./model":3,"./renderer":5,"./ui_dialogs":7,"./utils":8,"d3":undefined}],7:[function(require,module,exports){
/**
 * a set of simple dialogs for LineUp
 *
 * Created by Samuel Gratzl on 24.08.2015.
 */
"use strict";
var model = require('./model');
var utils = require('./utils');
var mappingeditor = require('./mappingeditor');
function dialogForm(title, body, buttonsWithLabel) {
    if (buttonsWithLabel === void 0) { buttonsWithLabel = false; }
    return '<span style="font-weight: bold">' + title + '</span>' +
        '<form onsubmit="return false">' +
        body + '<button type = "submit" class="ok fa fa-check" title="ok"></button>' +
        '<button type = "reset" class="cancel fa fa-times" title="cancel"></button>' +
        '<button type = "button" class="reset fa fa-undo" title="reset"></button></form>';
}
exports.dialogForm = dialogForm;
/**
 * creates a simple popup dialog under the given attachment
 * @param attachement
 * @param title
 * @param body
 * @returns {Selection<any>}
 */
function makePopup(attachement, title, body) {
    var pos = utils.offset(attachement.node());
    var $popup = d3.select('body').append('div')
        .attr({
        'class': 'lu-popup2'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
    }).html(dialogForm(title, body));
    $popup.on('keydown', function () {
        if (d3.event.which === 27) {
            $popup.remove();
        }
    });
    var auto = $popup.select('input[autofocus]').node();
    if (auto) {
        auto.focus();
    }
    return $popup;
}
exports.makePopup = makePopup;
/**
 * opens a rename dialog for the given column
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openRenameDialog(column, $header) {
    var popup = makePopup($header, 'Rename Column', "<input type=\"text\" size=\"15\" value=\"" + column.label + "\" required=\"required\" autofocus=\"autofocus\"><br><input type=\"color\" size=\"15\" value=\"" + column.color + "\" required=\"required\"><br>");
    popup.select('.ok').on('click', function () {
        var newValue = popup.select('input[type="text"]').property('value');
        var newColor = popup.select('input[type="color"]').property('value');
        column.setMetaData({ label: newValue, color: newColor });
        popup.remove();
    });
    popup.select('.cancel').on('click', function () {
        popup.remove();
    });
}
exports.openRenameDialog = openRenameDialog;
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
exports.openEditLinkDialog = openEditLinkDialog;
/**
 * opens a search dialog for the given column
 * @param column the column to rename
 * @param $header the visual header element of this column
 * @param provider the data provider for the actual search
 */
function openSearchDialog(column, $header, provider) {
    var popup = makePopup($header, 'Search', '<input type="text" size="15" value="" required="required" autofocus="autofocus"><br><label><input type="checkbox">RegExp</label><br>');
    popup.select('input[type="text"]').on('input', function () {
        var search = d3.event.target.value;
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
exports.openSearchDialog = openSearchDialog;
/**
 * opens a dialog for editing the weights of a stack column
 * @param column the column to filter
 * @param $header the visual header element of this column
 */
function openEditWeightsDialog(column, $header) {
    var weights = column.getWeights(), children = column.children.map(function (d, i) { return ({ col: d, weight: weights[i] * 100 }); });
    //map weights to pixels
    var scale = d3.scale.linear().domain([0, 100]).range([0, 120]);
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
exports.openEditWeightsDialog = openEditWeightsDialog;
/**
 * flags the header to be filtered
 * @param $header
 * @param filtered
 */
function markFiltered($header, filtered) {
    if (filtered === void 0) { filtered = false; }
    $header.classed('filtered', filtered);
}
/**
 * opens a dialog for filtering a categorical column
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openCategoricalFilter(column, $header) {
    var bak = column.getFilter() || [];
    var popup = makePopup($header, 'Edit Filter', '<div class="selectionTable"><table><thead><th></th><th>Category</th></thead><tbody></tbody></table></div>');
    // list all data rows !
    var trData = column.categories.map(function (d) {
        return { d: d, isChecked: bak.length === 0 || bak.indexOf(d) >= 0 };
    });
    var trs = popup.select('tbody').selectAll('tr').data(trData);
    trs.enter().append('tr');
    trs.append('td').attr('class', 'checkmark');
    trs.append('td').attr('class', 'datalabel').text(function (d) {
        return d.d;
    });
    function redraw() {
        var trs = popup.select('tbody').selectAll('tr').data(trData);
        trs.select('.checkmark').html(function (d) { return '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>'; })
            .on('click', function (d) {
            d.isChecked = !d.isChecked;
            redraw();
        });
        trs.select('.datalabel').style('opacity', function (d) { return d.isChecked ? '1.0' : '.8'; });
    }
    redraw();
    function updateData(filter) {
        markFiltered($header, filter && filter.length > 0 && filter.length < column.categories.length);
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
        var f = trData.filter(function (d) { return d.isChecked; }).map(function (d) { return d.d; });
        if (f.length === column.categories.length) {
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
    var bak = column.getFilter() || '';
    var $popup = makePopup($header, 'Filter', "<input type=\"text\" placeholder=\"containing...\" autofocus=\"true\" size=\"15\" value=\"" + ((bak instanceof RegExp) ? bak.source : bak) + "\" autofocus=\"autofocus\">\n    <br><label><input type=\"checkbox\" " + ((bak instanceof RegExp) ? 'checked="checked"' : '') + ">RegExp</label>\n    <br>");
    function updateData(filter) {
        markFiltered($header, (filter && filter !== ''));
        column.setFilter(filter);
    }
    function updateImpl(force) {
        //get value
        var search = $popup.select('input[type="text"]').property('value');
        if (search.length >= 3 || force) {
            var isRegex = $popup.select('input[type="checkbox"]').property('checked');
            if (isRegex) {
                search = new RegExp(search);
            }
            updateData(search);
        }
    }
    $popup.select('input[type="checkbox"]').on('change', updateImpl);
    $popup.select('input[type="text"]').on('input', updateImpl);
    $popup.select('.cancel').on('click', function () {
        $popup.select('input[type="text"]').property('value', bak);
        $popup.select('input[type="checkbox"]').property('checked', bak instanceof RegExp ? 'checked' : null);
        updateData(bak);
        $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
        $popup.select('input[type="text"]').property('value', '');
        $popup.select('input[type="checkbox"]').property('checked', null);
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
        $popup.select('textarea').property('value', model.ScriptColumn.DEFAULT_SCRIPT);
        updateData(model.ScriptColumn.DEFAULT_SCRIPT);
    });
    $popup.select('.ok').on('click', function () {
        updateImpl();
        $popup.remove();
    });
}
exports.openEditScriptDialog = openEditScriptDialog;
/**
 * opens the mapping editor for a given NumberColumn
 * @param column the column to rename
 * @param $header the visual header element of this column
 * @param data the data provider for illustrating the mapping by example
 */
function openMappingEditor(column, $header, data) {
    var pos = utils.offset($header.node()), bak = column.getMapping(), original = column.getOriginalMapping(), act = bak.clone();
    var popup = d3.select('body').append('div')
        .attr({
        'class': 'lu-popup'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
    })
        .html(dialogForm('Change Mapping', '<div class="mappingArea"></div>' +
        '<label><input type="checkbox" id="filterIt" value="filterIt">Filter Outliers</label><br>'));
    var $filterIt = popup.select('input').on('change', function () {
        applyMapping(act);
    });
    $filterIt.property('checked', column.isFiltered());
    function applyMapping(newscale) {
        act = newscale;
        markFiltered($header, !newscale.eq(original));
        column.setMapping(newscale);
        var val = $filterIt.property('checked');
        if (val) {
            column.setFilter({ min: newscale.domain[0], max: newscale.domain[1] });
        }
        else {
            column.setFilter();
        }
    }
    var editorOptions = {
        callback: applyMapping,
        triggerCallback: 'dragend'
    };
    var data_sample = data.mappingSample(column);
    var editor = mappingeditor.create(popup.select('.mappingArea').node(), act, original, data_sample, editorOptions);
    popup.select('.ok').on('click', function () {
        applyMapping(editor.scale);
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
        applyMapping(act);
        popup.selectAll('.mappingArea *').remove();
        editor = mappingeditor.create(popup.select('.mappingArea').node(), act, original, data_sample, editorOptions);
    });
}
/**
 * opens the mapping editor for a given CategoricalNumberColumn, i.e. to map categories to numbers
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openCategoricalMappingEditor(column, $header) {
    var range = column.getScale().range, colors = column.categoryColors, children = column.categories.map(function (d, i) { return ({ cat: d, range: range[i] * 100, color: colors[i] }); });
    var scale = d3.scale.linear().domain([0, 100]).range([0, 120]);
    var $popup = makePopup($header, 'Edit Categorical Mapping', '<table></table>');
    var $rows = $popup.select('table').selectAll('tr').data(children);
    var $rows_enter = $rows.enter().append('tr');
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
    $rows_enter.append('td').append('div')
        .attr('class', 'bar')
        .style('background-color', function (d) { return d.color; });
    $rows_enter.append('td').text(function (d) { return d.cat; });
    function redraw() {
        $rows.select('.bar').transition().style({
            width: function (d) {
                return scale(d.range) + 'px';
            }
        });
    }
    redraw();
    $popup.select('.cancel').on('click', function () {
        column.setMapping(range);
        $popup.remove();
    });
    /*$popup.select('.reset').on('click', function () {
  
     });*/
    $popup.select('.ok').on('click', function () {
        column.setMapping(children.map(function (d) { return d.range / 100; }));
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
exports.filterDialogs = filterDialogs;

},{"./mappingeditor":2,"./model":3,"./utils":8}],8:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
///<reference path='../typings/tsd.d.ts' />
var d3 = require('d3');
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
        args.unshift(thisCallback);
        tm = setTimeout(callback.bind.apply(callback, args), timeToDelay);
    };
}
exports.delayedCall = delayedCall;
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
exports.forwardEvent = forwardEvent;
/**
 * base class for event dispatching using d3 event mechanism
 */
var AEventDispatcher = (function () {
    function AEventDispatcher() {
        this.forwarder = forwardEvent(this);
        this.listeners = d3.dispatch.apply(d3, this.createEventList());
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
exports.AEventDispatcher = AEventDispatcher;
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
            if (Object.prototype.toString.call(value) === TYPE_OBJECT) {
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
exports.merge = merge;
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
exports.offset = offset;
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
        d3.select(container).on('scroll.scroller', function () { return _this.onScroll(); });
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
        d3.select(this.container).on('scroll.scroller', null);
    };
    return ContentScroller;
}(AEventDispatcher));
exports.ContentScroller = ContentScroller;
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
exports.hasDnDType = hasDnDType;
/**
 * should it be a copy dnd operation?
 */
function copyDnD(e) {
    var dT = e.dataTransfer;
    return (e.ctrlKey && dT.effectAllowed.match(/copy/gi) != null) || (dT.effectAllowed.match(/move/gi) == null);
}
exports.copyDnD = copyDnD;
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
exports.updateDropEffect = updateDropEffect;
/**
 * returns a d3 callable function to make an element dropable, managed the class css 'drag_over' for hovering effects
 * @param mimeTypes the mime types to be dropable
 * @param onDrop: handler when an element is dropped
 */
function dropAble(mimeTypes, onDrop) {
    return function ($node) {
        $node.on('dragenter', function () {
            var e = d3.event;
            //var xy = d3.mouse($node.node());
            if (hasDnDType(e, mimeTypes)) {
                d3.select(this).classed('drag_over', true);
                //sounds good
                return false;
            }
            //not a valid mime type
            d3.select(this).classed('drag_over', false);
        }).on('dragover', function () {
            var e = d3.event;
            if (hasDnDType(e, mimeTypes)) {
                e.preventDefault();
                updateDropEffect(e);
                d3.select(this).classed('drag_over', true);
                return false;
            }
        }).on('dragleave', function () {
            //
            d3.select(this).classed('drag_over', false);
        }).on('drop', function (d) {
            var e = d3.event;
            e.preventDefault();
            d3.select(this).classed('drag_over', false);
            //var xy = d3.mouse($node.node());
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
exports.dropAble = dropAble;

},{"d3":undefined}]},{},[1]);
 
});
