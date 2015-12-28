/*! LineUpJS - v0.2.0 - 2015-12-28
* https://github.com/sgratzl/lineup.js
* Copyright (c) 2015 ; Licensed BSD */

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
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", './model', './provider', './renderer', './ui', './utils', './ui_dialogs', 'd3'], function (require, exports, model_, provider_, renderer_, ui_, utils_, ui_dialogs_, d3) {
    exports.model = model_;
    exports.provider = provider_;
    exports.renderer = renderer_;
    exports.ui = ui_;
    exports.utils = utils_;
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
             *
             */
            this.config = {
                idPrefix: Math.random().toString(36).slice(-8).substr(0, 3),
                numberformat: d3.format('.3n'),
                htmlLayout: {
                    headerHeight: 20,
                    headerOffset: 1,
                    buttonTopPadding: 10,
                    labelLeftPadding: 5
                },
                renderingOptions: {
                    stacked: false,
                    animation: true,
                    visibleRowsOnly: true
                },
                svgLayout: {
                    rowHeight: 17,
                    rowPadding: 0.2,
                    rowBarPadding: 1,
                    visibleRowsOnly: true,
                    /**
                     * number of backup rows to keep to avoid updating on every small scroll thing
                     */
                    backupScrollRows: 4,
                    animationDuration: 1000,
                    //number of rows that should be frozen on the left side
                    freezeRows: 0,
                    rowActions: []
                },
                /* enables manipulation features, remove column, reorder,... */
                manipulative: true,
                interaction: {
                    //enable the table tooltips
                    tooltips: true,
                    multiselect: function () {
                        return false;
                    },
                    rangeselect: function () {
                        return false;
                    }
                },
                pool: false
            };
            this.body = null;
            this.header = null;
            this.pools = [];
            this.contentScroller = null;
            this.$container = container instanceof d3.selection ? container : d3.select(container);
            this.$container = this.$container.append('div').classed('lu', true);
            exports.utils.merge(this.config, config);
            this.data.on('selectionChanged.main', this.triggerSelection.bind(this));
            this.header = new ui_.HeaderRenderer(data, this.node, {
                manipulative: this.config.manipulative,
                headerHeight: this.config.htmlLayout.headerHeight
            });
            this.body = new ui_.BodyRenderer(data, this.node, this.slice.bind(this), {
                rowHeight: this.config.svgLayout.rowHeight,
                rowPadding: this.config.svgLayout.rowPadding,
                rowBarPadding: this.config.svgLayout.rowBarPadding,
                animationDuration: this.config.svgLayout.animationDuration,
                animation: this.config.renderingOptions.animation,
                stacked: this.config.renderingOptions.stacked,
                actions: this.config.svgLayout.rowActions,
                idPrefix: this.config.idPrefix
            });
            this.forward(this.body, 'hoverChanged');
            if (this.config.pool && this.config.manipulative) {
                this.addPool(new ui_.PoolRenderer(data, this.node, this.config));
            }
            if (this.config.svgLayout.visibleRowsOnly) {
                this.contentScroller = new utils_.ContentScroller(this.$container.node(), this.body.node, {
                    backupRows: this.config.svgLayout.backupScrollRows,
                    rowHeight: this.config.svgLayout.rowHeight,
                    topShift: this.config.htmlLayout.headerHeight
                });
                this.contentScroller.on('scroll', function (top, left) {
                    //in two svg mode propagate horizontal shift
                    //console.log(top, left,'ss');
                    _this.header.$node.style('transform', 'translate(' + 0 + 'px,' + top + 'px)');
                    if (_this.config.svgLayout.freezeRows > 0) {
                        _this.header.updateFreeze(_this.config.svgLayout.freezeRows, left);
                        _this.body.updateFreeze(_this.config.svgLayout.freezeRows, left);
                    }
                });
                this.contentScroller.on('redraw', this.body.update.bind(this.body));
            }
        }
        LineUp.prototype.createEventList = function () {
            return _super.prototype.createEventList.call(this).concat(['hoverChanged', 'selectionChanged', 'multiSelectionChanged']);
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
        LineUp.prototype.sortBy = function (column, ascending) {
            if (ascending === void 0) { ascending = false; }
            var col = this.data.find(column);
            if (col) {
                col.sortByMe(ascending);
            }
            return col !== null;
        };
        LineUp.prototype.dump = function () {
            var s = this.data.dump();
            return s;
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
            this.fire('selectionChanged', data_indices.length > 0 ? data_indices[0] : -1);
            this.fire('multiSelectionChanged', data_indices);
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
        return LineUp;
    })(utils_.AEventDispatcher);
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
     * @returns {LocalDataProvider}
     */
    function createLocalStorage(data, columns) {
        return new provider_.LocalDataProvider(data, columns);
    }
    exports.createLocalStorage = createLocalStorage;
    function create(data, container, config) {
        if (config === void 0) { config = {}; }
        return new LineUp(container, data, config);
    }
    exports.create = create;
});

},{}]},{},[1]);
 
});
