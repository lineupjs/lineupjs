/*! LineUpJS - v0.1.0 - 2015-08-25
* https://github.com/Caleydo/lineup.js
* Copyright (c) 2015 ; Licensed BSD */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('./utils');
var d3 = require('d3');
var LineUp = (function (_super) {
    __extends(LineUp, _super);
    function LineUp(container, data, config) {
        var _this = this;
        if (config === void 0) { config = {}; }
        _super.call(this);
        this.data = data;
        this.config = {
            grayColor: '#999999',
            numberformat: d3.format('.3n'),
            htmlLayout: {
                headerHeight: 50,
                headerOffset: 1,
                buttonTopPadding: 10,
                labelLeftPadding: 5,
                buttonRightPadding: 15,
                buttonWidth: 13
            },
            renderingOptions: {
                stacked: false,
                values: false,
                animation: true,
                histograms: false
            },
            svgLayout: {
                mode: 'combined',
                rowHeight: 17,
                rowPadding: 0.2,
                rowBarPadding: 1,
                backupScrollRows: 4,
                animationDuration: 1000,
                addPlusSigns: false,
                plusSigns: {
                    addStackedColumn: {
                        title: 'add stacked column',
                        action: 'addNewEmptyStackedColumn',
                        x: 0, y: 2,
                        w: 21, h: 21
                    }
                },
                rowActions: new Array()
            },
            manipulative: true,
            interaction: {
                tooltips: true,
                multiselect: function () { return false; },
                rangeselect: function () { return false; }
            },
            filter: {
                skip: 0,
                limit: Number.POSITIVE_INFINITY,
                filter: undefined
            }
        };
        this.$container = container instanceof d3.selection ? container : d3.select(container);
        utils.merge(this.config, config);
        if (this.config.svgLayout.mode === 'combined') {
            this.$container.classed('lu-mode-combined', true);
            this.$table = this.$container.append('svg').attr('class', 'lu');
            var $defs = this.$table.append('defs');
            $defs.append('defs').attr('class', 'columnheader');
            $defs.append('defs').attr('class', 'column');
            $defs.append('defs').attr('class', 'overlay');
            this.$body = this.$table.append('g').attr('class', 'body').attr('transform', 'translate(0,' + this.config.htmlLayout.headerHeight + ')');
            this.$header = this.$table.append('g').attr('class', 'header');
            this.$bodySVG = this.$headerSVG = this.$table;
            this.scroller = new utils.ContentScroller(this.$container.node(), this.$table.node(), {
                topShift: this.config.htmlLayout.headerHeight,
                backupRows: this.config.svgLayout.backupScrollRows,
                rowHeight: this.config.svgLayout.rowHeight
            });
        }
        else {
            this.$container.classed('lu-mode-separate', true);
            this.$table = this.$container;
            this.$headerSVG = this.$table.append('svg').attr('class', 'lu lu-header');
            this.$headerSVG.attr('height', this.config.htmlLayout.headerHeight);
            this.$headerSVG.append('defs').attr('class', 'columnheader');
            this.$header = this.$headerSVG.append('g');
            this.$bodySVG = this.$table.append('div').attr('class', 'lu-wrapper').append('svg').attr('class', 'lu lu-body');
            var $defs = this.$bodySVG.append('defs');
            $defs.append('defs').attr('class', 'column');
            $defs.append('defs').attr('class', 'overlay');
            this.$body = this.$bodySVG;
            this.scroller = new utils.ContentScroller(this.$container.select('div.lu-wrapper').node(), this.$table.node(), {
                topShift: 0,
                backupRows: this.config.svgLayout.backupScrollRows,
                rowHeight: this.config.svgLayout.rowHeight
            });
        }
        this.$header.append('rect').attr({
            width: '100%',
            height: this.config.htmlLayout.headerHeight,
            'class': 'headerbg'
        });
        this.$header.append('g').attr('class', 'main');
        this.$header.append('g').attr('class', 'overlay');
        this.scroller.on('scroll', function (top, left) { return _this.scrolled(top, left); });
        this.scroller.on('redraw', function () { return _this.renderBody(); });
    }
    LineUp.prototype.renderBody = function () {
        console.log('TODO');
    };
    LineUp.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['hover', 'change-sortcriteria', 'change-filter', 'selected', 'multiselected']);
    };
    LineUp.prototype.scrolled = function (top, left) {
        if (this.config.svgLayout.mode === 'combined') {
            this.$header.attr('transform', 'translate(0,' + top + ')');
        }
        else {
            this.$header.attr('transform', 'translate(' + -left + ',0)');
        }
    };
    LineUp.prototype.destroy = function () {
        this.scroller.destroy();
        this.$container.selectAll('*').remove();
        if (this.config.svgLayout.mode === 'combined') {
            this.$container.on('scroll.lineup', null);
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
    return LineUp;
})(utils.AEventDispatcher);
exports.LineUp = LineUp;

},{"./utils":9,"d3":"d3"}],2:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
///<reference path='../typings/tsd.d.ts' />
var d3 = require('d3');
var utils = require('./utils');
'use strict';
function addLine($svg, x1, y1, x2, y2, clazz) {
    return $svg.append('line').attr({
        x1: x1, y1: y1, x2: x2, y2: y2, 'class': clazz
    });
}
function addText($svg, x, y, text, dy, clazz) {
    return $svg.append('text').attr({
        x: x, y: y, dy: dy, 'class': clazz
    }).text(text);
}
function addCircle($svg, x, shift, y, radius) {
    shift -= x;
    return $svg
        .append('circle')
        .attr({
        'class': 'handle',
        r: radius,
        cx: x,
        cy: y,
        transform: 'translate(' + shift + ',0)'
    });
}
function open(scale, dataDomain, dataPromise, options) {
    options = utils.merge({
        width: 400,
        height: 400,
        padding: 50,
        radius: 10,
        callback: function (d) { return d; },
        callbackThisArg: null,
        triggerCallback: 'change'
    }, options);
    var editor = function ($root) {
        var $svg = $root.append('svg').attr({
            'class': 'lugui-me',
            width: options.width,
            height: options.height
        });
        var lowerLimitX = options.padding;
        var upperLimitX = options.width - options.padding;
        var scoreAxisY = options.padding;
        var raw2pixelAxisY = options.height - options.padding;
        var raw2pixel = d3.scale.linear().domain(dataDomain).range([lowerLimitX, upperLimitX]);
        var normal2pixel = d3.scale.linear().domain([0, 1]).range([lowerLimitX, upperLimitX]);
        var lowerNormalized = normal2pixel(scale.range()[0]);
        var upperNormalized = normal2pixel(scale.range()[1]);
        var lowerRaw = raw2pixel(scale.domain()[0]);
        var upperRaw = raw2pixel(scale.domain()[1]);
        scale = d3.scale.linear()
            .clamp(true)
            .domain(scale.domain())
            .range([lowerNormalized, upperNormalized]);
        var $base = $svg.append('g');
        addLine($base, lowerLimitX, scoreAxisY, upperLimitX, scoreAxisY, 'axis');
        addText($base, lowerLimitX, scoreAxisY - 25, 0, '.75em');
        addText($base, upperLimitX, scoreAxisY - 25, 1, '.75em');
        addText($base, options.width / 2, scoreAxisY - 25, 'Score', '.75em', 'centered');
        addLine($base, lowerLimitX, raw2pixelAxisY, upperLimitX, raw2pixelAxisY, 'axis');
        addText($base, lowerLimitX, raw2pixelAxisY + 20, dataDomain[0], '.75em');
        addText($base, upperLimitX, raw2pixelAxisY + 20, dataDomain[1], '.75em');
        addText($base, options.width / 2, raw2pixelAxisY + 20, 'Raw', '.75em', 'centered');
        var datalines = $svg.append('g').classed('data', true).selectAll('line').data([]);
        dataPromise.then(function (data) {
            datalines = datalines.data(data);
            datalines.enter().append('line')
                .attr({
                x1: scale,
                y1: scoreAxisY,
                x2: raw2pixel,
                y2: raw2pixelAxisY
            }).style('visibility', function (d) {
                var a;
                if (lowerRaw < upperRaw) {
                    a = (raw2pixel(d) < lowerRaw || raw2pixel(d) > upperRaw);
                }
                else {
                    a = (raw2pixel(d) > lowerRaw || raw2pixel(d) < upperRaw);
                }
                return a ? 'hidden' : null;
            });
        });
        var mapperLineLowerBounds = addLine($svg, lowerNormalized, scoreAxisY, lowerRaw, raw2pixelAxisY, 'bound');
        var mapperLineUpperBounds = addLine($svg, upperNormalized, scoreAxisY, upperRaw, raw2pixelAxisY, 'bound');
        var lowerBoundNormalizedLabel = addText($svg, lowerLimitX + 5, scoreAxisY - 15, d3.round(normal2pixel.invert(lowerNormalized), 2), '.25em', 'drag').attr('transform', 'translate(' + (lowerNormalized - lowerLimitX) + ',0)');
        var lowerBoundRawLabel = addText($svg, lowerLimitX + 5, raw2pixelAxisY - 15, d3.round(raw2pixel.invert(lowerRaw), 2), '.25em', 'drag').attr('transform', 'translate(' + (lowerRaw - lowerLimitX) + ',0)');
        var upperBoundNormalizedLabel = addText($svg, upperLimitX + 5, scoreAxisY - 15, d3.round(normal2pixel.invert(upperNormalized), 2), '.25em', 'drag').attr('transform', 'translate(' + (upperNormalized - upperLimitX) + ',0)');
        var upperBoundRawLabel = addText($svg, upperLimitX + 5, raw2pixelAxisY - 15, d3.round(raw2pixel.invert(upperRaw), 2), '.25em', 'drag').attr('transform', 'translate(' + (upperRaw - upperLimitX) + ',0)');
        function createDrag(label, move) {
            return d3.behavior.drag()
                .on('dragstart', function () {
                d3.select(this)
                    .classed('dragging', true)
                    .attr('r', options.radius * 1.1);
                label.style('visibility', 'visible');
            })
                .on('drag', move)
                .on('dragend', function () {
                d3.select(this)
                    .classed('dragging', false)
                    .attr('r', options.radius);
                label.style('visibility', null);
                updateScale(true);
            })
                .origin(function () {
                var t = d3.transform(d3.select(this).attr('transform'));
                return { x: t.translate[0], y: t.translate[1] };
            });
        }
        function updateNormalized() {
            scale.range([lowerNormalized, upperNormalized]);
            datalines.attr('x1', scale);
            updateScale();
        }
        function updateRaw() {
            var hiddenDatalines, shownDatalines;
            if (lowerRaw < upperRaw) {
                hiddenDatalines = datalines.filter(function (d) {
                    return (raw2pixel(d) < lowerRaw || raw2pixel(d) > upperRaw);
                });
                shownDatalines = datalines.filter(function (d) {
                    return !(raw2pixel(d) < lowerRaw || raw2pixel(d) > upperRaw);
                });
            }
            else {
                hiddenDatalines = datalines.filter(function (d) {
                    return (raw2pixel(d) > lowerRaw || raw2pixel(d) < upperRaw);
                });
                shownDatalines = datalines.filter(function (d) {
                    return !(raw2pixel(d) > lowerRaw || raw2pixel(d) < upperRaw);
                });
            }
            hiddenDatalines.style('visibility', 'hidden');
            scale.domain([raw2pixel.invert(lowerRaw), raw2pixel.invert(upperRaw)]);
            shownDatalines
                .style('visibility', null)
                .attr('x1', scale);
            updateScale();
        }
        addCircle($svg, lowerLimitX, lowerNormalized, scoreAxisY, options.radius)
            .call(createDrag(lowerBoundNormalizedLabel, function () {
            if (d3.event.x >= 0 && d3.event.x <= (upperLimitX - lowerLimitX)) {
                mapperLineLowerBounds.attr('x1', lowerLimitX + d3.event.x);
                d3.select(this)
                    .attr('transform', 'translate(' + d3.event.x + ', 0)');
                lowerNormalized = d3.event.x + lowerLimitX;
                lowerBoundNormalizedLabel
                    .text(d3.round(normal2pixel.invert(lowerNormalized), 2))
                    .attr('transform', 'translate(' + d3.event.x + ', 0)');
                updateNormalized();
            }
        }));
        addCircle($svg, upperLimitX, upperNormalized, scoreAxisY, options.radius)
            .call(createDrag(upperBoundNormalizedLabel, function () {
            if (d3.event.x >= (-1 * (upperLimitX - lowerLimitX)) && d3.event.x <= 0) {
                mapperLineUpperBounds.attr('x1', upperLimitX + d3.event.x);
                d3.select(this)
                    .attr('transform', 'translate(' + d3.event.x + ', 0)');
                upperNormalized = d3.event.x + upperLimitX;
                upperBoundNormalizedLabel
                    .text(d3.round(normal2pixel.invert(upperNormalized), 2))
                    .attr('transform', 'translate(' + d3.event.x + ', 0)');
                updateNormalized();
            }
        }));
        addCircle($svg, lowerLimitX, lowerRaw, raw2pixelAxisY, options.radius)
            .call(createDrag(lowerBoundRawLabel, function () {
            if (d3.event.x >= 0 && d3.event.x <= (upperLimitX - lowerLimitX)) {
                mapperLineLowerBounds.attr('x2', lowerLimitX + d3.event.x);
                d3.select(this)
                    .attr('transform', 'translate(' + d3.event.x + ', 0)');
                lowerRaw = d3.event.x + lowerLimitX;
                lowerBoundRawLabel
                    .text(d3.round(raw2pixel.invert(lowerRaw), 2))
                    .attr('transform', 'translate(' + d3.event.x + ', 0)');
                updateRaw();
            }
        }));
        addCircle($svg, upperLimitX, upperRaw, raw2pixelAxisY, options.radius)
            .call(createDrag(upperBoundRawLabel, function () {
            if (d3.event.x >= (-1 * (upperLimitX - lowerLimitX)) && d3.event.x <= 0) {
                mapperLineUpperBounds.attr('x2', upperLimitX + d3.event.x);
                d3.select(this)
                    .attr('transform', 'translate(' + d3.event.x + ', 0)');
                upperRaw = d3.event.x + upperLimitX;
                upperBoundRawLabel
                    .text(d3.round(raw2pixel.invert(upperRaw), 2))
                    .attr('transform', 'translate(' + d3.event.x + ', 0)');
                updateRaw();
            }
        }));
        function updateScale(isDragEnd) {
            if (isDragEnd === void 0) { isDragEnd = false; }
            if (isDragEnd !== (options.triggerCallback === 'dragend')) {
                return;
            }
            var newScale = d3.scale.linear()
                .domain([raw2pixel.invert(lowerRaw), raw2pixel.invert(upperRaw)])
                .range([normal2pixel.invert(lowerNormalized), normal2pixel.invert(upperNormalized)]);
            options.callback.call(options.callbackThisArg, newScale);
        }
    };
    return editor;
}
exports.open = open;

},{"./utils":9,"d3":"d3"}],3:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 06.08.2015.
 */
///<reference path='../typings/tsd.d.ts' />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var d3 = require('d3');
var utils = require('./utils');
function fixCSS(id) {
    return id.replace(/[\s!#$%&'\(\)\*\+,\.\/:;<=>\?@\[\\\]\^`\{\|}~]/g, '_');
}
function numberCompare(a, b) {
    if (a === b || (isNaN(a) && isNaN(b))) {
        return 0;
    }
    return a - b;
}
var Column = (function (_super) {
    __extends(Column, _super);
    function Column(id, desc) {
        _super.call(this);
        this.desc = desc;
        this.width_ = 100;
        this.parent = null;
        this.id = fixCSS(id);
        this.label = this.desc.label || this.id;
    }
    Object.defineProperty(Column.prototype, "fqid", {
        get: function () {
            return this.parent ? this.parent.fqid + '_' + this.id : this.id;
        },
        enumerable: true,
        configurable: true
    });
    Column.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['widthChanged', 'dirtySorting', 'dirtyFilter', 'dirtyValues', 'addColumn', 'removeColumn', 'dirty', 'dirtyHeader']);
    };
    Column.prototype.getWidth = function () {
        return this.width_;
    };
    Column.prototype.flatten = function (r, offset, levelsToGo, padding) {
        if (levelsToGo === void 0) { levelsToGo = 0; }
        if (padding === void 0) { padding = 0; }
        r.push({ col: this, offset: offset, width: this.getWidth() });
        return this.getWidth();
    };
    Column.prototype.setWidth = function (value) {
        if (this.width_ === value) {
            return;
        }
        this.fire('widthChanged', this, this.width_, this.width_ = value);
        this.fire('dirty', this);
    };
    Column.prototype.setLabel = function (value) {
        if (value === this.label) {
            return;
        }
        this.fire('dirtyHeader', this, this.label, this.label = value);
        this.fire('dirty', this);
    };
    Object.defineProperty(Column.prototype, "color", {
        get: function () {
            return this.desc.color || Column.DEFAULT_COLOR;
        },
        enumerable: true,
        configurable: true
    });
    Column.prototype.sortByMe = function (ascending) {
        if (ascending === void 0) { ascending = false; }
        var r = this.findMyRanker();
        if (r) {
            return r.sortBy(this, ascending);
        }
        return false;
    };
    Column.prototype.toggleMySorting = function () {
        var r = this.findMyRanker();
        if (r) {
            return r.toggleSorting(this);
        }
        return false;
    };
    Column.prototype.removeMe = function () {
        if (this.parent) {
            return this.parent.remove(this);
        }
        return false;
    };
    Column.prototype.insertAfterMe = function (col) {
        if (this.parent) {
            return this.parent.insertAfter(col, this);
        }
        return false;
    };
    Column.prototype.findMyRanker = function () {
        if (this.parent) {
            return this.parent.findMyRanker();
        }
        return null;
    };
    Column.prototype.dump = function (toDescRef) {
        return {
            id: this.id,
            desc: toDescRef(this.desc),
            width: this.width_
        };
    };
    Column.prototype.restore = function (dump, factory) {
        this.width_ = dump.width;
    };
    Column.prototype.getLabel = function (row) {
        return '' + this.getValue(row);
    };
    Column.prototype.getValue = function (row) {
        return '';
    };
    Column.prototype.compare = function (a, b) {
        return 0;
    };
    Column.prototype.isFiltered = function () {
        return false;
    };
    Column.prototype.filter = function (row) {
        return row !== null;
    };
    Column.DEFAULT_COLOR = 'gray';
    return Column;
})(utils.AEventDispatcher);
exports.Column = Column;
var ValueColumn = (function (_super) {
    __extends(ValueColumn, _super);
    function ValueColumn(id, desc) {
        _super.call(this, id, desc);
        this.accessor = desc.accessor || (function (row, id, desc) { return null; });
    }
    ValueColumn.prototype.getLabel = function (row) {
        return '' + this.getValue(row);
    };
    ValueColumn.prototype.getValue = function (row) {
        return this.accessor(row, this.id, this.desc);
    };
    ValueColumn.prototype.compare = function (a, b) {
        return 0;
    };
    return ValueColumn;
})(Column);
exports.ValueColumn = ValueColumn;
var NumberColumn = (function (_super) {
    __extends(NumberColumn, _super);
    function NumberColumn(id, desc) {
        _super.call(this, id, desc);
        this.missingValue = NaN;
        this.scale = d3.scale.linear().domain([NaN, NaN]).range([0, 1]).clamp(true);
        this.mapping = d3.scale.linear().domain([NaN, NaN]).range([0, 1]).clamp(true);
        this.filter_ = { min: -Infinity, max: Infinity };
        if (desc.domain) {
            this.scale.domain(desc.domain);
        }
        if (desc.range) {
            this.scale.range(desc.range);
        }
        this.mapping.domain(this.scale.domain()).range(this.scale.range());
    }
    NumberColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.domain = this.scale.domain();
        r.range = this.scale.range();
        r.mapping = this.getMapping();
        r.filter = this.filter;
        r.missingValue = this.missingValue;
        return r;
    };
    NumberColumn.prototype.restore = function (dump, factory) {
        _super.prototype.restore.call(this, dump, factory);
        this.scale.domain(dump.domain);
        this.scale.range(dump.range);
        this.mapping.domain(dump.mapping.scale).range(dump.mapping.range);
        this.filter_ = dump.filter;
        this.missingValue = dump.missingValue;
    };
    NumberColumn.prototype.getLabel = function (row) {
        return '' + _super.prototype.getValue.call(this, row);
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
        return this.scale(v);
    };
    NumberColumn.prototype.getNumber = function (row) {
        return this.getValue(row);
    };
    NumberColumn.prototype.compare = function (a, b) {
        return numberCompare(this.getValue(a), this.getValue(b));
    };
    NumberColumn.prototype.getMapping = function () {
        return {
            domain: this.mapping.domain(),
            range: this.mapping.range()
        };
    };
    NumberColumn.prototype.getOriginalMapping = function () {
        return {
            domain: this.mapping.domain(),
            range: this.mapping.range()
        };
    };
    NumberColumn.prototype.setMapping = function (domain, range) {
        var bak = this.getMapping();
        this.mapping.domain(domain).range(range);
        this.fire('dirtyValues', this, bak, this.getMapping());
        this.fire('dirty', this);
    };
    NumberColumn.prototype.isFiltered = function () {
        return isFinite(this.filter_.min) || isFinite(this.filter_.max);
    };
    Object.defineProperty(NumberColumn.prototype, "filterMin", {
        get: function () {
            return this.filter_.min;
        },
        set: function (min) {
            var bak = { min: this.filter_.min, max: this.filter_.max };
            this.filter_.min = isNaN(min) ? -Infinity : min;
            this.fire('dirtyFilter', this, bak, this.filter_);
            this.fire('dirty', this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NumberColumn.prototype, "filterMax", {
        get: function () {
            return this.filter_.max;
        },
        set: function (max) {
            var bak = { min: this.filter_.min, max: this.filter_.max };
            this.filter_.max = isNaN(max) ? Infinity : max;
            this.fire('dirtyFilter', this, bak, this.filter_);
            this.fire('dirty', this);
        },
        enumerable: true,
        configurable: true
    });
    NumberColumn.prototype.getFilter = function () {
        return this.filter_;
    };
    NumberColumn.prototype.setFilter = function (min, max) {
        if (min === void 0) { min = -Infinity; }
        if (max === void 0) { max = +Infinity; }
        var bak = { min: this.filter_.min, max: this.filter_.max };
        this.filter_.min = isNaN(min) ? -Infinity : min;
        this.filter_.max = isNaN(max) ? Infinity : max;
        this.fire('dirtyFilter', this, bak, this.filter_);
        this.fire('dirty', this);
    };
    NumberColumn.prototype.filter = function (row) {
        if (!this.isFiltered()) {
            return true;
        }
        var v = this.getRawValue(row);
        if (isNaN(v)) {
            return true;
        }
        return !((isFinite(this.filter_.min) && v < this.filter_.min) || (isFinite(this.filter_.max) && v < this.filter_.max));
    };
    return NumberColumn;
})(ValueColumn);
exports.NumberColumn = NumberColumn;
var StringColumn = (function (_super) {
    __extends(StringColumn, _super);
    function StringColumn(id, desc) {
        _super.call(this, id, desc);
        this.filter_ = null;
    }
    StringColumn.prototype.getValue = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        if (typeof (v) === 'undefined' || v == null) {
            return '';
        }
        return v;
    };
    StringColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.filter = this.filter_;
        return r;
    };
    StringColumn.prototype.restore = function (dump, factory) {
        _super.prototype.restore.call(this, dump, factory);
        this.filter_ = dump.filter || null;
    };
    StringColumn.prototype.isFiltered = function () {
        return this.filter_ != null;
    };
    StringColumn.prototype.filter = function (row) {
        if (!this.isFiltered()) {
            return true;
        }
        var r = this.getLabel(row), filter = this.filter_;
        if (typeof filter === 'string' && filter.length > 0) {
            return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
        }
        return true;
    };
    StringColumn.prototype.getFilter = function () {
        return this.filter_;
    };
    StringColumn.prototype.setFilter = function (filter) {
        if (filter === '') {
            filter = null;
        }
        this.fire('dirtyFilter', this, this.filter_, this.filter_ = filter);
        this.fire('dirty', this);
    };
    StringColumn.prototype.compare = function (a, b) {
        return d3.ascending(this.getValue(a), this.getValue(b));
    };
    return StringColumn;
})(ValueColumn);
exports.StringColumn = StringColumn;
var LinkColumn = (function (_super) {
    __extends(LinkColumn, _super);
    function LinkColumn(id, desc) {
        _super.call(this, id, desc);
        this.link = null;
        this.link = desc.link;
    }
    LinkColumn.prototype.getLabel = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        if (v.alt) {
            return v.alt;
        }
        return '' + v;
    };
    LinkColumn.prototype.getValue = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        if (v.href) {
            return v.href;
        }
        else if (this.link) {
            return this.link.replace(/\$1/g, v);
        }
        return v;
    };
    return LinkColumn;
})(StringColumn);
exports.LinkColumn = LinkColumn;
var CategoricalColumn = (function (_super) {
    __extends(CategoricalColumn, _super);
    function CategoricalColumn(id, desc) {
        _super.call(this, id, desc);
        this.colors = d3.scale.category10();
        this.filter_ = null;
        this.init(desc);
    }
    CategoricalColumn.prototype.init = function (desc) {
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
    CategoricalColumn.prototype.getValue = function (row) {
        return StringColumn.prototype.getValue.call(this, row);
    };
    CategoricalColumn.prototype.getColor = function (row) {
        var cat = this.getLabel(row);
        if (cat === null || cat === '') {
            return null;
        }
        return this.colors(cat);
    };
    CategoricalColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.filter = this.filter_;
        r.colors = {
            domain: this.colors.domain(),
            range: this.colors.range()
        };
        return r;
    };
    CategoricalColumn.prototype.restore = function (dump, factory) {
        _super.prototype.restore.call(this, dump, factory);
        this.filter_ = dump.filter || null;
        this.colors.domain(dump.colors.domain).range(dump.colors.range);
    };
    CategoricalColumn.prototype.isFiltered = function () {
        return this.filter_ != null;
    };
    CategoricalColumn.prototype.filter = function (row) {
        if (!this.isFiltered()) {
            return true;
        }
        var r = this.getLabel(row), filter = this.filter_;
        if (Array.isArray(filter) && filter.length > 0) {
            return filter.indexOf(r) >= 0;
        }
        else if (typeof filter === 'string' && filter.length > 0) {
            return r && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
        }
        else if (filter instanceof RegExp) {
            return r != null && r.match(filter).length > 0;
        }
        return true;
    };
    CategoricalColumn.prototype.getFilter = function () {
        return this.filter_;
    };
    CategoricalColumn.prototype.setFilter = function (filter) {
        this.fire('dirtyFilter', this, this.filter_, this.filter_ = filter);
        this.fire('dirty', this);
    };
    CategoricalColumn.prototype.compare = function (a, b) {
        return StringColumn.prototype.compare.call(this, a, b);
    };
    return CategoricalColumn;
})(ValueColumn);
exports.CategoricalColumn = CategoricalColumn;
var CategoricalNumberColumn = (function (_super) {
    __extends(CategoricalNumberColumn, _super);
    function CategoricalNumberColumn(id, desc) {
        _super.call(this, id, desc);
        this.colors = d3.scale.category10();
        this.scale = d3.scale.ordinal().rangeRoundPoints([0, 1]);
        this.filter_ = null;
        CategoricalColumn.prototype.init.call(this, desc);
        this.scale.domain(this.colors.domain());
        if (desc.categories) {
            var values = [];
            desc.categories.forEach(function (d) {
                if (typeof d !== 'string' && typeof (d.value) === 'number') {
                    values.push(d.value);
                }
                else {
                    values.push(0.5);
                }
            });
            this.scale.range(values);
        }
    }
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
    CategoricalNumberColumn.prototype.getLabel = function (row) {
        var v = _super.prototype.getValue.call(this, row);
        if (typeof (v) === 'undefined' || v == null) {
            return '';
        }
        return v;
    };
    CategoricalNumberColumn.prototype.getValue = function (row) {
        var v = this.getLabel(row);
        return this.scale(v);
    };
    CategoricalNumberColumn.prototype.getNumber = function (row) {
        return this.getValue(row);
    };
    CategoricalNumberColumn.prototype.getColor = function (row) {
        return CategoricalColumn.prototype.getColor.call(this, row);
    };
    CategoricalNumberColumn.prototype.dump = function (toDescRef) {
        var r = CategoricalColumn.prototype.dump.call(this, toDescRef);
        r.scale = {
            domain: this.scale.domain(),
            range: this.scale.range()
        };
        return r;
    };
    CategoricalNumberColumn.prototype.restore = function (dump, factory) {
        CategoricalColumn.prototype.restore.call(this, dump, factory);
        this.scale.domain(dump.scale.domain).range(dump.scale.range);
    };
    CategoricalNumberColumn.prototype.getScale = function () {
        return {
            domain: this.scale.domain(),
            range: this.scale.range()
        };
    };
    CategoricalNumberColumn.prototype.setRange = function (range) {
        var bak = this.getScale();
        this.scale.range(range);
        this.fire('dirtyValues', this, bak, this.getScale());
    };
    CategoricalNumberColumn.prototype.isFiltered = function () {
        return this.filter_ != null;
    };
    CategoricalNumberColumn.prototype.filter = function (row) {
        return CategoricalColumn.prototype.filter.call(this, row);
    };
    CategoricalNumberColumn.prototype.getFilter = function () {
        return this.filter_;
    };
    CategoricalNumberColumn.prototype.setFilter = function (filter) {
        this.fire('dirtyFilter', this, this.filter_, this.filter_ = filter);
        this.fire('dirty', this);
    };
    CategoricalNumberColumn.prototype.compare = function (a, b) {
        return NumberColumn.prototype.compare.call(this, a, b);
    };
    return CategoricalNumberColumn;
})(ValueColumn);
exports.CategoricalNumberColumn = CategoricalNumberColumn;
var StackColumn = (function (_super) {
    __extends(StackColumn, _super);
    function StackColumn(id, desc) {
        var _this = this;
        _super.call(this, id, desc);
        this.missingValue = NaN;
        this.children_ = [];
        this.triggerResort = function () { return _this.fire('dirtySorting', _this); };
        this.forwards = {
            dirtyFilter: utils.forwardEvent(this, 'dirtyFilter'),
            dirtyValues: utils.forwardEvent(this, 'dirtyValues'),
            addColumn: utils.forwardEvent(this, 'addColumn'),
            removeColumn: utils.forwardEvent(this, 'removeColumn'),
            dirty: utils.forwardEvent(this, 'dirty')
        };
        this.adaptChange = this.adaptWidthChange.bind(this);
        this._collapsed = false;
    }
    StackColumn.desc = function (label) {
        return { type: 'stack', label: label };
    };
    StackColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['pushChild', 'removeChild', 'changeCollapse']);
    };
    Object.defineProperty(StackColumn.prototype, "children", {
        get: function () {
            return this.children_.slice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackColumn.prototype, "length", {
        get: function () {
            return this.children_.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackColumn.prototype, "weights", {
        get: function () {
            var w = this.getWidth();
            return this.children_.map(function (d) { return d.getWidth() / w; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackColumn.prototype, "collapsed", {
        get: function () {
            return this._collapsed;
        },
        set: function (value) {
            if (this._collapsed === value) {
                return;
            }
            this.fire('changeCollapse', this, this._collapsed, this._collapsed = value);
        },
        enumerable: true,
        configurable: true
    });
    StackColumn.prototype.flatten = function (r, offset, levelsToGo, padding) {
        if (levelsToGo === void 0) { levelsToGo = 0; }
        if (padding === void 0) { padding = 0; }
        if (levelsToGo === 0) {
            var w = this.getWidth();
            if (!this.collapsed) {
                w += (this.children_.length - 1) * padding;
            }
            r.push({ col: this, offset: offset, width: w });
            return w;
        }
        else {
            var acc = offset;
            this.children_.forEach(function (c) {
                acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
            });
            return acc - offset - padding;
        }
    };
    StackColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.children = this.children_.map(function (d) { return d.dump(toDescRef); });
        r.missingValue = this.missingValue;
        return r;
    };
    StackColumn.prototype.restore = function (dump, factory) {
        var _this = this;
        this.missingValue = dump.missingValue;
        dump.children.map(function (child) {
            _this.push(factory(child));
        });
        _super.prototype.restore.call(this, dump, factory);
    };
    StackColumn.prototype.insert = function (col, index, weight) {
        if (weight === void 0) { weight = NaN; }
        if (typeof col.getNumber !== 'function') {
            return null;
        }
        if (col instanceof StackColumn) {
            col.collapsed = true;
        }
        if (!isNaN(weight)) {
            col.setWidth((weight / (1 - weight) * this.getWidth()));
        }
        this.children_.splice(index, 0, col);
        col.parent = this;
        col.on('dirtyFilter.stack', this.forwards.dirtyFilter);
        col.on('dirtyValues.stack', this.forwards.dirtyValues);
        col.on('addColumn.stack', this.forwards.addColumn);
        col.on('removeColumn.stack', this.forwards.removeColumn);
        col.on('dirtySorting.stack', this.triggerResort);
        col.on('widthChanged.stack', this.adaptChange);
        col.on('dirty.stack', this.forwards.dirty);
        _super.prototype.setWidth.call(this, this.children_.length === 1 ? col.getWidth() : (this.getWidth() + col.getWidth()));
        this.fire('pushChild', this, col, col.getWidth() / this.getWidth());
        this.fire('addColumn', this, col);
        this.fire('dirtySorting', this);
        this.fire('dirty', this);
        return true;
    };
    StackColumn.prototype.push = function (col, weight) {
        if (weight === void 0) { weight = NaN; }
        return this.insert(col, this.children_.length, weight);
    };
    StackColumn.prototype.indexOf = function (col) {
        var j = -1;
        this.children_.some(function (d, i) {
            if (d === col) {
                j = i;
                return true;
            }
            return false;
        });
        return j;
    };
    StackColumn.prototype.insertAfter = function (col, ref, weight) {
        if (weight === void 0) { weight = NaN; }
        var i = this.indexOf(ref);
        if (i < 0) {
            return false;
        }
        return this.insert(col, i + 1, weight);
    };
    StackColumn.prototype.adaptWidthChange = function (col, old, new_) {
        var _this = this;
        if (old === new_) {
            return;
        }
        var full = this.getWidth(), change = (new_ - old) / full;
        var oldWeight = old / full;
        var factor = (1 - oldWeight - change) / (1 - oldWeight);
        this.children_.forEach(function (c) {
            if (c === col) {
            }
            else {
                c.on('widthChanged.stack', null);
                c.setWidth(c.getWidth() * factor);
                c.on('widthChanged.stack', _this.adaptChange);
            }
        });
        this.fire('dirtyValues', this);
        this.fire('dirtySorting', this);
        this.fire('widthChanged', this, full, full);
        this.fire('dirty', this);
    };
    StackColumn.prototype.setWeights = function (weights) {
        var _this = this;
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
        this.children_.forEach(function (c, i) {
            c.on('widthChanged.stack', null);
            c.setWidth(weights[i]);
            c.on('widthChanged.stack', _this.adaptChange);
        });
        this.fire('dirtyValues', this);
        this.fire('dirtySorting', this);
        this.fire('widthChanged', this, this.getWidth(), this.getWidth());
        this.fire('dirty', this);
    };
    StackColumn.prototype.remove = function (child) {
        var i = this.children_.indexOf(child);
        if (i < 0) {
            return false;
        }
        this.children_.splice(i, 1);
        child.parent = null;
        child.on('dirtyFilter.stack', null);
        child.on('dirtyValues.stack', null);
        child.on('addColumn.stack', null);
        child.on('removeColumn.stack', null);
        child.on('dirtySorting.stack', null);
        child.on('widthChanged.stack', null);
        child.on('dirty.stack', null);
        _super.prototype.setWidth.call(this, this.length === 0 ? 100 : this.getWidth() - child.getWidth());
        this.fire('removeChild', this, child);
        this.fire('removeColumn', this, child);
        this.fire('dirtySorting', this);
        this.fire('dirty', this);
        return true;
    };
    StackColumn.prototype.setWidth = function (value) {
        var _this = this;
        var factor = value / this.getWidth();
        this.children_.forEach(function (child) {
            child.on('widthChanged.stack', null);
            child.setWidth(child.getWidth() * factor);
            child.on('widthChanged.stack', _this.adaptChange);
        });
        _super.prototype.setWidth.call(this, value);
    };
    StackColumn.prototype.getValue = function (row) {
        var w = this.getWidth();
        var v = this.children_.reduce(function (acc, d) { return acc + d.getValue(row) * (d.getWidth() / w); }, 0);
        if (typeof (v) === 'undefined' || v == null || isNaN(v)) {
            return this.missingValue;
        }
        return v;
    };
    StackColumn.prototype.getNumber = function (row) {
        return this.getValue(row);
    };
    StackColumn.prototype.compare = function (a, b) {
        return numberCompare(this.getValue(a), this.getValue(b));
    };
    StackColumn.prototype.isFiltered = function () {
        return this.children_.some(function (d) { return d.isFiltered(); });
    };
    StackColumn.prototype.filter = function (row) {
        return this.children_.every(function (d) { return d.filter(row); });
    };
    return StackColumn;
})(Column);
exports.StackColumn = StackColumn;
var RankColumn = (function (_super) {
    __extends(RankColumn, _super);
    function RankColumn(id, desc) {
        var _this = this;
        _super.call(this, id, desc);
        this.sortBy_ = null;
        this.ascending = false;
        this.columns_ = [];
        this.extra = {};
        this.triggerResort = function () { return _this.fire('dirtySorting', _this); };
        this.forwards = {
            dirtyFilter: utils.forwardEvent(this, 'dirtyFilter'),
            dirtyValues: utils.forwardEvent(this, 'dirtyValues'),
            widthChanged: utils.forwardEvent(this, 'widthChanged'),
            addColumn: utils.forwardEvent(this, 'addColumn'),
            removeColumn: utils.forwardEvent(this, 'removeColumn'),
            dirty: utils.forwardEvent(this, 'dirty')
        };
        this.comparator = function (a, b) {
            if (_this.sortBy_ === null) {
                return 0;
            }
            var r = _this.sortBy_.compare(a, b);
            return _this.ascending ? r : -r;
        };
    }
    RankColumn.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['sortCriteriaChanged', 'pushChild', 'removeChild']);
    };
    RankColumn.prototype.dump = function (toDescRef) {
        var r = _super.prototype.dump.call(this, toDescRef);
        r.columns = this.columns_.map(function (d) { return d.dump(toDescRef); });
        r.sortCriteria = this.sortCriteria();
        if (this.sortBy_) {
            r.sortCriteria.sortBy = this.sortBy_.id;
        }
        return r;
    };
    RankColumn.prototype.restore = function (dump, factory) {
        var _this = this;
        _super.prototype.restore.call(this, dump, factory);
        dump.columns.map(function (child) {
            _this.push(factory(child.col));
        });
        this.ascending = dump.sortCriteria.asc;
        if (dump.sortCriteria.sortBy) {
            this.sortBy(this.columns_.filter(function (d) { return d.id === dump.sortCriteria.sortBy; })[0], dump.sortCriteria.asc);
        }
    };
    RankColumn.prototype.flatten = function (r, offset, levelsToGo, padding) {
        if (levelsToGo === void 0) { levelsToGo = 0; }
        if (padding === void 0) { padding = 0; }
        r.push({ col: this, offset: offset, width: this.getWidth() });
        var acc = offset + this.getWidth() + padding;
        if (levelsToGo > 0) {
            this.columns_.forEach(function (c) {
                acc += c.flatten(r, acc, levelsToGo - 1, padding) + padding;
            });
        }
        return acc - offset;
    };
    RankColumn.prototype.sortCriteria = function () {
        return {
            col: this.sortBy_,
            asc: this.ascending
        };
    };
    RankColumn.prototype.sortByMe = function (ascending) {
        if (ascending === void 0) { ascending = false; }
    };
    RankColumn.prototype.toggleMySorting = function () {
    };
    RankColumn.prototype.findMyRanker = function () {
        return this;
    };
    RankColumn.prototype.insertAfterMe = function (col) {
        return this.insert(col, 0) !== null;
    };
    RankColumn.prototype.toggleSorting = function (col) {
        if (this.sortBy_ === col) {
            return this.sortBy(col, !this.ascending);
        }
        return this.sortBy(col);
    };
    RankColumn.prototype.sortBy = function (col, ascending) {
        if (ascending === void 0) { ascending = false; }
        if (col.on('dirtyFilter.ranking') !== this.forwards.dirtyFilter) {
            return false;
        }
        if (this.sortBy_ === col && this.ascending === ascending) {
            return true;
        }
        if (this.sortBy_) {
            this.sortBy_.on('dirtySorting.ranking', null);
        }
        var bak = this.sortCriteria();
        this.sortBy_ = col;
        if (this.sortBy_) {
            this.sortBy_.on('dirtySorting.ranking', this.triggerResort);
        }
        this.ascending = ascending;
        this.fire('sortCriteriaChanged', this, bak, this.sortCriteria());
        this.fire('dirty', this);
        this.triggerResort();
        return true;
    };
    Object.defineProperty(RankColumn.prototype, "children", {
        get: function () {
            return this.columns_.slice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RankColumn.prototype, "length", {
        get: function () {
            return this.columns_.length;
        },
        enumerable: true,
        configurable: true
    });
    RankColumn.prototype.insert = function (col, index) {
        if (index === void 0) { index = this.columns_.length; }
        this.columns_.splice(index, 0, col);
        col.parent = this;
        col.on('dirtyFilter.ranking', this.forwards.dirtyFilter);
        col.on('dirtyValues.ranking', this.forwards.dirtyValues);
        col.on('addColumn.ranking', this.forwards.addColumn);
        col.on('removeColumn.ranking', this.forwards.removeColumn);
        col.on('widthChanged.ranking', this.forwards.widthChanged);
        col.on('dirty.ranking', this.forwards.dirty);
        if (this.sortBy_ === null) {
            this.sortBy_ = col;
            this.sortBy_.on('dirtySorting.ranking', this.triggerResort);
            this.triggerResort();
        }
        this.fire('pushChild', this, col, index);
        this.fire('dirty', this);
        return col;
    };
    RankColumn.prototype.insertAfter = function (col, ref) {
        if (ref === this) {
            return this.insert(col, 0) != null;
        }
        var i = this.columns_.indexOf(ref);
        if (i < 0) {
            return false;
        }
        return this.insert(col, i + 1) != null;
    };
    RankColumn.prototype.push = function (col) {
        return this.insert(col);
    };
    RankColumn.prototype.remove = function (col) {
        var i = this.columns_.indexOf(col);
        if (i < 0) {
            return false;
        }
        col.on('dirtyFilter.ranking', null);
        col.on('dirtyValues.ranking', null);
        col.on('widthChanged.ranking', null);
        col.on('addColumn.ranking', null);
        col.on('removeColumn.ranking', null);
        col.on('dirty.ranking', null);
        col.parent = null;
        this.columns_.splice(i, 1);
        if (this.sortBy_ === col) {
            this.sortBy(this.columns_.length > 0 ? this.columns_[0] : null);
        }
        this.fire('removeChild', this, col);
        this.fire('dirty', this);
        return true;
    };
    RankColumn.prototype.find = function (id_or_filter) {
        var filter = typeof (id_or_filter) === 'string' ? function (col) { return col.id === id_or_filter; } : id_or_filter;
        var r = [];
        this.flatten(r, 0, Number.POSITIVE_INFINITY);
        for (var i = 0; i < r.length; ++i) {
            if (filter(r[i].col)) {
                return r[i].col;
            }
        }
        return null;
    };
    RankColumn.prototype.toSortingDesc = function (toId) {
        var resolve = function (s) {
            if (s === null) {
                return null;
            }
            if (s instanceof StackColumn) {
                var w = s.weights;
                return s.children.map(function (child, i) {
                    return {
                        weight: w[i],
                        id: resolve(child)
                    };
                });
            }
            return toId(s.desc);
        };
        var id = resolve(this.sortBy_);
        if (id === null) {
            return null;
        }
        return {
            id: id,
            asc: this.ascending
        };
    };
    RankColumn.prototype.isFiltered = function () {
        return this.columns_.some(function (d) { return d.isFiltered(); });
    };
    RankColumn.prototype.filter = function (row) {
        return this.columns_.every(function (d) { return d.filter(row); });
    };
    return RankColumn;
})(ValueColumn);
exports.RankColumn = RankColumn;
function models() {
    return {
        number: NumberColumn,
        string: StringColumn,
        link: LinkColumn,
        stack: StackColumn,
        rank: RankColumn,
        categorical: CategoricalColumn,
        ordinal: CategoricalNumberColumn
    };
}
exports.models = models;

},{"./utils":9,"d3":"d3"}],4:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var model = require('./model');
var utils = require('./utils');
var IColumnDesc = (function () {
    function IColumnDesc() {
    }
    return IColumnDesc;
})();
exports.IColumnDesc = IColumnDesc;
var DataProvider = (function (_super) {
    __extends(DataProvider, _super);
    function DataProvider() {
        _super.apply(this, arguments);
        this.rankings_ = [];
        this.selection = d3.set();
        this.uid = 0;
        this.columnTypes = model.models();
        this.forwards = {
            addColumn: utils.forwardEvent(this, 'addColumn'),
            removeColumn: utils.forwardEvent(this, 'removeColumn'),
            dirty: utils.forwardEvent(this, 'dirty')
        };
    }
    DataProvider.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['addColumn', 'removeColumn', 'addRanking', 'removeRanking', 'dirty']);
    };
    DataProvider.prototype.pushRanking = function (existing) {
        var r = this.cloneRanking(existing);
        this.rankings_.push(r);
        r.on('addColumn.provider', this.forwards.addColumn);
        r.on('removeColumn.provider', this.forwards.removeColumn);
        r.on('dirty.provider', this.forwards.dirty);
        this.fire('addRanking', r);
        this.fire('dirty', this);
        return r;
    };
    DataProvider.prototype.removeRanking = function (ranking) {
        var i = this.rankings_.indexOf(ranking);
        if (i < 0) {
            return false;
        }
        ranking.on('addColumn.provider', null);
        ranking.on('removeColumn.provider', null);
        ranking.on('dirty.provider', null);
        this.rankings_.splice(i, 1);
        this.fire('removeRanking', ranking);
        this.cleanUpRanking(ranking);
        this.fire('dirty', this);
        return true;
    };
    DataProvider.prototype.getRankings = function () {
        return this.rankings_.slice();
    };
    DataProvider.prototype.cleanUpRanking = function (ranking) {
    };
    DataProvider.prototype.cloneRanking = function (existing) {
        return null;
    };
    DataProvider.prototype.push = function (ranking, desc) {
        var r = this.create(desc);
        if (r) {
            ranking.push(r);
            return r;
        }
        return null;
    };
    DataProvider.prototype.create = function (desc) {
        var type = this.columnTypes[desc.type];
        if (type) {
            return new type(this.nextId(), desc);
        }
        return null;
    };
    DataProvider.prototype.clone = function (col) {
        var _this = this;
        var dump = col.dump(function (d) { return d; });
        var create = function (d) {
            var type = _this.columnTypes[d.desc.type];
            var c = new type(_this.nextId(), d.desc);
            c.restore(d, create);
            return c;
        };
        return create(dump);
    };
    DataProvider.prototype.find = function (id_or_filter) {
        var filter = typeof (id_or_filter) === 'string' ? function (col) { return col.id === id_or_filter; } : id_or_filter;
        for (var i = 0; i < this.rankings_.length; ++i) {
            var r = this.rankings_[i].find(filter);
            if (r) {
                return r;
            }
        }
        return null;
    };
    DataProvider.prototype.insert = function (ranking, index, desc) {
        var r = this.create(desc);
        if (r) {
            ranking.insert(r, index);
            return r;
        }
        return null;
    };
    DataProvider.prototype.nextId = function () {
        return 'col' + (this.uid++);
    };
    DataProvider.prototype.dump = function () {
        var _this = this;
        return {
            uid: this.uid,
            rankings: this.rankings_.map(function (r) { return r.dump(_this.toDescRef); })
        };
    };
    DataProvider.prototype.toDescRef = function (desc) {
        return desc;
    };
    DataProvider.prototype.fromDescRef = function (descRef) {
        return descRef;
    };
    DataProvider.prototype.restore = function (dump) {
        var _this = this;
        var create = function (d) {
            var desc = _this.fromDescRef(d.desc);
            var type = _this.columnTypes[desc.type];
            var c = new type(d.id, desc);
            c.restore(d, create);
            return c;
        };
        this.uid = dump.uid;
        this.rankings_ = dump.rankings.map(create);
    };
    DataProvider.prototype.sort = function (ranking) {
        return Promise.reject('not implemented');
    };
    DataProvider.prototype.view = function (indices) {
        return Promise.reject('not implemented');
    };
    DataProvider.prototype.mappingSample = function (col) {
        return Promise.reject('not implemented');
    };
    DataProvider.prototype.rowKey = function (row, i) {
        return typeof (row) === 'number' ? String(row) : String(row._index);
    };
    DataProvider.prototype.isSelected = function (row) {
        return this.selection.has(this.rowKey(row, -1));
    };
    DataProvider.prototype.select = function (row) {
        this.selection.add(this.rowKey(row, -1));
    };
    DataProvider.prototype.selectAll = function (rows) {
        var _this = this;
        rows.forEach(function (row) {
            _this.selection.add(_this.rowKey(row, -1));
        });
    };
    DataProvider.prototype.setSelection = function (rows) {
        this.clearSelection();
        this.selectAll(rows);
    };
    DataProvider.prototype.deselect = function (row) {
        this.selection.remove(this.rowKey(row, -1));
    };
    DataProvider.prototype.selectedRows = function () {
        if (this.selection.empty()) {
            return Promise.resolve([]);
        }
        var indices = [];
        this.selection.forEach(function (s) { return indices.push(+s); });
        indices.sort();
        return this.view(indices);
    };
    DataProvider.prototype.clearSelection = function () {
        this.selection = d3.set();
    };
    return DataProvider;
})(utils.AEventDispatcher);
exports.DataProvider = DataProvider;
var CommonDataProvider = (function (_super) {
    __extends(CommonDataProvider, _super);
    function CommonDataProvider(columns) {
        var _this = this;
        if (columns === void 0) { columns = []; }
        _super.call(this);
        this.columns = columns;
        this.rankingIndex = 0;
        this.rowGetter = function (row, id, desc) { return row[desc.column]; };
        columns.forEach(function (d) { return d.accessor = _this.rowGetter; });
    }
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
})(DataProvider);
exports.CommonDataProvider = CommonDataProvider;
var LocalDataProvider = (function (_super) {
    __extends(LocalDataProvider, _super);
    function LocalDataProvider(data, columns) {
        if (columns === void 0) { columns = []; }
        _super.call(this, columns);
        this.data = data;
        data.forEach(function (d, i) {
            d._rankings = {};
            d._index = i;
        });
    }
    LocalDataProvider.prototype.cloneRanking = function (existing) {
        var _this = this;
        var id = this.nextRankingId();
        var rankDesc = {
            label: 'Rank',
            type: 'rank',
            accessor: function (row, id) { return row._rankings[id] || 0; }
        };
        var new_ = new model.RankColumn(id, rankDesc);
        if (existing) {
            this.data.forEach(function (row) {
                var r = row._rankings;
                r[id] = r[existing.id];
            });
            existing.children.forEach(function (child) {
                _this.push(new_, child.desc);
            });
        }
        return new_;
    };
    LocalDataProvider.prototype.cleanUpRanking = function (ranking) {
        this.data.forEach(function (d) { return delete d._rankings[ranking.id]; });
    };
    LocalDataProvider.prototype.sort = function (ranking) {
        var helper = this.data.map(function (r, i) { return ({ row: r, i: i, prev: r._rankings[ranking.id] || 0 }); });
        if (ranking.isFiltered()) {
            helper = helper.filter(function (d) { return ranking.filter(d.row); });
        }
        helper.sort(function (a, b) { return ranking.comparator(a.row, b.row); });
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
    LocalDataProvider.prototype.mappingSample = function (col) {
        return Promise.resolve(this.data.map(col.getRawValue.bind(col)));
    };
    return LocalDataProvider;
})(CommonDataProvider);
exports.LocalDataProvider = LocalDataProvider;
var RemoteDataProvider = (function (_super) {
    __extends(RemoteDataProvider, _super);
    function RemoteDataProvider(server, columns) {
        if (columns === void 0) { columns = []; }
        _super.call(this, columns);
        this.server = server;
        this.ranks = {};
    }
    RemoteDataProvider.prototype.cloneRanking = function (existing) {
        var _this = this;
        var id = this.nextRankingId();
        var rankDesc = {
            label: 'Rank',
            type: 'rank',
            accessor: function (row, id) { return _this.ranks[id][row._index] || 0; }
        };
        if (existing) {
            this.ranks[id] = this.ranks[existing.id];
        }
        return new model.RankColumn(id, rankDesc);
    };
    RemoteDataProvider.prototype.cleanUpRanking = function (ranking) {
        delete this.ranks[ranking.id];
    };
    RemoteDataProvider.prototype.sort = function (ranking) {
        var _this = this;
        var desc = ranking.toSortingDesc(function (desc) { return desc.column; });
        return this.server.sort(desc).then(function (argsort) {
            _this.ranks[ranking.id] = argsort;
            return argsort;
        });
    };
    RemoteDataProvider.prototype.view = function (argsort) {
        return this.server.view(argsort).then(function (view) {
            view.forEach(function (d, i) { return d._index = argsort[i]; });
            return view;
        });
    };
    RemoteDataProvider.prototype.mappingSample = function (col) {
        return this.server.mappingSample(col.desc.column);
    };
    return RemoteDataProvider;
})(CommonDataProvider);
exports.RemoteDataProvider = RemoteDataProvider;

},{"./model":3,"./utils":9}],5:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var DefaultCellRenderer = (function () {
    function DefaultCellRenderer() {
        this.textClass = 'text';
    }
    DefaultCellRenderer.prototype.render = function ($col, col, rows, context) {
        var $rows = $col.datum(col).selectAll('text.' + this.textClass).data(rows, context.rowKey);
        $rows.enter().append('text').attr({
            'class': this.textClass,
            'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')'
        });
        context.animated($rows).attr({
            x: function (d, i) { return context.cellX(i); },
            y: function (d, i) { return context.cellY(i); },
            'data-index': function (d, i) { return i; }
        }).text(function (d) { return col.getLabel(d); });
        $rows.exit().remove();
    };
    DefaultCellRenderer.prototype.findRow = function ($col, index) {
        return $col.selectAll('text.' + this.textClass + '[data-index="' + index + '"]');
    };
    DefaultCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
        var rowNode = $row.node();
        var n = this.findRow($col, index).node();
        if (n) {
            rowNode.appendChild(n);
        }
    };
    DefaultCellRenderer.prototype.mouseLeave = function ($col, $row, col, row, index, context) {
        var colNode = $col.node();
        var rowNode = $row.node();
        if (rowNode.hasChildNodes()) {
            colNode.appendChild(rowNode.firstChild);
        }
        $row.selectAll('*').remove();
    };
    return DefaultCellRenderer;
})();
exports.DefaultCellRenderer = DefaultCellRenderer;
var DerivedCellRenderer = (function (_super) {
    __extends(DerivedCellRenderer, _super);
    function DerivedCellRenderer(extraFuncs) {
        var _this = this;
        _super.call(this);
        Object.keys(extraFuncs).forEach(function (key) {
            _this[key] = extraFuncs[key];
        });
    }
    return DerivedCellRenderer;
})(DefaultCellRenderer);
var BarCellRenderer = (function (_super) {
    __extends(BarCellRenderer, _super);
    function BarCellRenderer() {
        _super.apply(this, arguments);
    }
    BarCellRenderer.prototype.render = function ($col, col, rows, context) {
        var _this = this;
        var $rows = $col.datum(col).selectAll('rect.bar').data(rows, context.rowKey);
        $rows.enter().append('rect').attr('class', 'bar').style('fill', col.color);
        context.animated($rows).attr({
            x: function (d, i) { return context.cellX(i); },
            y: function (d, i) { return context.cellY(i) + 1; },
            height: function (d, i) { return context.rowHeight(i) - 2; },
            width: function (d) { return col.getWidth() * col.getValue(d); },
            'data-index': function (d, i) { return i; }
        }).style({
            fill: function (d, i) { return _this.colorOf(d, i, col); }
        });
        $rows.exit().remove();
    };
    BarCellRenderer.prototype.colorOf = function (d, i, col) {
        return col.color;
    };
    BarCellRenderer.prototype.findRow = function ($col, index) {
        return $col.selectAll('rect.bar[data-index="' + index + '"]');
    };
    BarCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
        var rowNode = this.findRow($col, index);
        if (!rowNode.empty()) {
            $row.node().appendChild((rowNode.node()));
            $row.append('text').datum(rowNode.datum()).attr({
                'class': 'number',
                'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
                x: context.cellX(index),
                y: context.cellY(index)
            }).text(function (d) { return col.getLabel(d); });
        }
    };
    return BarCellRenderer;
})(DefaultCellRenderer);
exports.BarCellRenderer = BarCellRenderer;
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
})(BarCellRenderer);
var defaultRendererInstance = new DefaultCellRenderer();
var barRendererInstance = new BarCellRenderer();
function defaultRenderer(extraFuncs) {
    if (!extraFuncs) {
        return defaultRendererInstance;
    }
    return new DerivedCellRenderer(extraFuncs);
}
exports.defaultRenderer = defaultRenderer;
function barRenderer(extraFuncs) {
    if (!extraFuncs) {
        return barRendererInstance;
    }
    return new DerivedBarCellRenderer(extraFuncs);
}
exports.barRenderer = barRenderer;
var LinkCellRenderer = (function (_super) {
    __extends(LinkCellRenderer, _super);
    function LinkCellRenderer() {
        _super.apply(this, arguments);
    }
    LinkCellRenderer.prototype.render = function ($col, col, rows, context) {
        var $rows = $col.datum(col).selectAll('a.link').data(rows, context.rowKey);
        $rows.enter().append('a').attr({
            'class': 'link',
            'target': '_blank'
        }).append('text').attr({
            'class': 'text',
            'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')'
        });
        context.animated($rows).attr({
            'xlink:href': function (d) { return col.getValue(d); },
            'data-index': function (d, i) { return i; }
        }).select('text').attr({
            x: function (d, i) { return context.cellX(i); },
            y: function (d, i) { return context.cellY(i); }
        }).text(function (d) { return col.getLabel(d); });
        $rows.exit().remove();
    };
    LinkCellRenderer.prototype.findRow = function ($col, index) {
        return $col.selectAll('a.link[data-index="' + index + '"]');
    };
    return LinkCellRenderer;
})(DefaultCellRenderer);
var StackCellRenderer = (function (_super) {
    __extends(StackCellRenderer, _super);
    function StackCellRenderer() {
        _super.apply(this, arguments);
    }
    StackCellRenderer.prototype.renderImpl = function ($col, col, context, perChild, rowGetter) {
        var $group = $col.datum(col), children = col.children, offset = 0, shifts = children.map(function (d) {
            var r = offset;
            offset += d.getWidth();
            return r;
        });
        var bak = context.cellX;
        if (!context.showStacked(col)) {
            context.cellX = function () { return 0; };
        }
        var $children = $group.selectAll('g.component').data(children);
        $children.enter().append('g').attr({
            'class': 'component'
        });
        $children.attr({
            'class': function (d) { return 'component ' + d.desc.type; },
            'data-index': function (d, i) { return i; }
        }).each(function (d, i) {
            if (context.showStacked(col)) {
                var preChildren = children.slice(0, i);
                context.cellX = function (index) {
                    return -preChildren.reduce(function (prev, child) { return prev + child.getWidth() * (1 - child.getValue(rowGetter(index))); }, 0);
                };
            }
            perChild(d3.select(this), d, i, context);
        });
        context.animated($children).attr({
            transform: function (d, i) { return 'translate(' + shifts[i] + ',0)'; }
        });
        $children.exit().remove();
        context.cellX = bak;
    };
    StackCellRenderer.prototype.render = function ($col, col, rows, context) {
        this.renderImpl($col, col, context, function ($child, col, i, ccontext) {
            ccontext.renderer(col).render($child, col, rows, ccontext);
        }, function (index) { return rows[index]; });
    };
    StackCellRenderer.prototype.mouseEnter = function ($col, $row, col, row, index, context) {
        this.renderImpl($row, col, context, function ($row_i, col, i, ccontext) {
            var $col_i = $col.selectAll('g.component[data-index="' + i + '"]');
            ccontext.renderer(col).mouseEnter($col_i, $row_i, col, row, index, ccontext);
        }, function (index) { return row; });
    };
    StackCellRenderer.prototype.mouseLeave = function ($col, $row, col, row, index, context) {
        this.renderImpl($row, col, context, function ($row_i, d, i, ccontext) {
            var $col_i = $col.selectAll('g.component[data-index="' + i + '"]');
            ccontext.renderer(d).mouseLeave($col_i, $row_i, d, row, index, ccontext);
        }, function (index) { return row; });
        $row.selectAll('*').remove();
    };
    return StackCellRenderer;
})(DefaultCellRenderer);
function renderers() {
    return {
        string: defaultRenderer(),
        link: new LinkCellRenderer(),
        number: barRenderer(),
        rank: defaultRenderer({
            textClass: 'rank'
        }),
        stack: new StackCellRenderer(),
        categorical: defaultRenderer({}),
        ordinal: barRenderer({
            colorOf: function (d, i, col) { return col.getColor(d); }
        })
    };
}
exports.renderers = renderers;

},{}],6:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
///<reference path='../typings/tsd.d.ts' />
var d3 = require('d3');
var provider = require('./provider');
var model = require('./model');
var utils = require('./utils');
var ui = require('./ui');
window.onload = function () {
    var arr = [
        { a: 10, b: 20, c: 30, d: 'Row1', l: { alt: 'Google', href: 'https://google.com' }, cat: 'c2' },
        { a: 5, b: 14, c: 2, d: 'Row2', l: { alt: 'ORF', href: 'https://orf.at' }, cat: 'c3' },
        { a: 2, b: 7, c: 100, d: 'Row3', l: { alt: 'heise.de', href: 'https://heise.de' }, cat: 'c2' },
        { a: 7, b: 1, c: 60, d: 'Row4dasfa dsfasdf  adsf asdf asdf', l: { alt: 'Google', href: 'https://google.com' }, cat: 'c1' }];
    var desc = [
        { label: 'D', type: 'string', column: 'd' },
        { label: 'A', type: 'number', column: 'a', 'domain': [0, 10] },
        { label: 'B', type: 'number', column: 'b', 'domain': [0, 30] },
        { label: 'C', type: 'number', column: 'c', 'domain': [0, 120] },
        { label: 'L', type: 'link', column: 'l' },
        { label: 'L2', type: 'link', column: 'a', link: 'https://duckduckgo.com/?q=$1' },
        { label: 'Cat', type: 'categorical', column: 'cat', categories: ['c1', 'c2', 'c3'] },
        { label: 'Ord', type: 'ordinal', column: 'cat', categories: ['c1', 'c2', 'c3'] }];
    var colors = d3.scale.category10();
    desc.forEach(function (d, i) {
        d.color = colors('' + i);
    });
    var p = new provider.LocalDataProvider(arr, desc);
    var r = p.pushRanking();
    var root = d3.select('body');
    r.push(p.create(desc[0]));
    r.push(p.create(desc[1]));
    var rstack = p.create(model.StackColumn.desc('Stack'));
    r.push(rstack);
    rstack.push(p.create(desc[1]));
    rstack.push(p.create(desc[2]));
    rstack.push(p.create(desc[3]));
    rstack.setWeights([0.2, 0.4]);
    r.push(p.create(desc[4]));
    var r2 = p.pushRanking();
    r2.push(p.create(desc[1]));
    r2.push(p.create(desc[0]));
    r2.push(p.create(desc[5]));
    r2.push(p.create(desc[6]));
    r2.push(p.create(desc[7]));
    var call = utils.delayedCall(update, 2);
    r2.on('dirtySorting', call);
    r2.on('widthChanged', call);
    r.on('dirtySorting', call);
    r.on('widthChanged', call);
    var body = new ui.LineUpRenderer(root.node(), p, desc, function (rank) {
        return rank.extra.argsort;
    }, {
        additionalDesc: [
            model.StackColumn.desc('+ Stack')
        ]
    });
    update();
    function update() {
        console.log('call', arguments);
        Promise.all(p.getRankings().map(function (r) { return p.sort(r); }))
            .then(function (argsorts) {
            p.getRankings().forEach(function (r, i) { return r.extra.argsort = argsorts[i]; });
            body.update();
        });
    }
};

},{"./model":3,"./provider":4,"./ui":7,"./utils":9,"d3":"d3"}],7:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
///<reference path='../typings/tsd.d.ts' />
var d3 = require('d3');
var utils = require('./utils');
var model = require('./model');
var renderer = require('./renderer');
var dialogs = require('./ui_dialogs');
var PoolRenderer = (function () {
    function PoolRenderer(data, columns, parent, options) {
        if (options === void 0) { options = {}; }
        this.data = data;
        this.columns = columns;
        this.options = {
            layout: 'vertical',
            elemWidth: 100,
            elemHeight: 40,
            width: 100,
            height: 500,
            additionalDesc: []
        };
        utils.merge(this.options, options);
        this.columns = this.columns.concat(this.options.additionalDesc);
        this.$node = d3.select(parent).append('div').classed('lu-pool', true);
        this.update();
    }
    PoolRenderer.prototype.update = function () {
        var _this = this;
        var data = this.data;
        var $headers = this.$node.selectAll('div.header').data(this.columns, function (d) { return d.label; });
        var $headers_enter = $headers.enter().append('div').attr({
            'class': 'header',
            'draggable': true
        }).on('dragstart', function (d) {
            var e = d3.event;
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('text/plain', d.label);
            e.dataTransfer.setData('application/caleydo-lineup-column', JSON.stringify(data.toDescRef(d)));
        }).style({
            'background-color': function (d) { return d.color || model.Column.DEFAULT_COLOR; },
            width: this.options.elemWidth + 'px',
            height: this.options.elemHeight + 'px'
        });
        $headers_enter.append('span').classed('label', true).text(function (d) { return d.label; });
        $headers.style('transform', function (d, i) {
            var pos = _this.layout(i);
            return 'translate(' + pos.x + 'px,' + pos.y + 'px)';
        });
        $headers.select('span');
        $headers.exit().remove();
    };
    PoolRenderer.prototype.layout = function (i) {
        switch (this.options.layout) {
            case 'horizontal':
                return { x: i * this.options.elemWidth, y: 0 };
            case 'grid':
                var perRow = d3.round(this.options.width / this.options.elemWidth, 0);
                return { x: (i % perRow) * this.options.elemWidth, y: d3.round(i / perRow, 0) * this.options.elemHeight };
            default:
                return { x: 0, y: i * this.options.elemHeight };
        }
    };
    return PoolRenderer;
})();
exports.PoolRenderer = PoolRenderer;
var HeaderRenderer = (function () {
    function HeaderRenderer(data, parent, options) {
        if (options === void 0) { options = {}; }
        this.data = data;
        this.options = {
            slopeWidth: 200,
            columnPadding: 5,
            headerHeight: 20,
            filterDialogs: dialogs.filterDialogs()
        };
        this.dragHandler = d3.behavior.drag()
            .on('dragstart', function () {
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed('dragging', true);
        })
            .on('drag', function (d) {
            var newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
            d.setWidth(newValue);
            d3.event.sourceEvent.stopPropagation();
        })
            .on('dragend', function () {
            d3.select(this).classed('dragging', false);
            d3.event.sourceEvent.stopPropagation();
        });
        utils.merge(this.options, options);
        this.$node = d3.select(parent).append('div').classed('lu-header', true);
        data.on('dirty.header', this.update.bind(this));
        this.update();
    }
    HeaderRenderer.prototype.update = function () {
        var _this = this;
        var rankings = this.data.getRankings();
        var shifts = [], offset = 0;
        rankings.forEach(function (ranking) {
            offset += ranking.flatten(shifts, offset, 1, _this.options.columnPadding) + _this.options.slopeWidth;
        });
        offset -= this.options.slopeWidth;
        var columns = shifts.map(function (d) { return d.col; });
        if (columns.some(function (c) { return c instanceof model.StackColumn && !c.collapsed; })) {
            this.$node.style('height', this.options.headerHeight * 2 + 'px');
        }
        else {
            this.$node.style('height', this.options.headerHeight + 'px');
        }
        this.renderColumns(columns, shifts);
    };
    HeaderRenderer.prototype.createToolbar = function ($node) {
        var filterDialogs = this.options.filterDialogs, provider = this.data;
        var $regular = $node.filter(function (d) { return !(d instanceof model.RankColumn); }), $stacked = $node.filter(function (d) { return d instanceof model.StackColumn; });
        $stacked.append('i').attr('class', 'fa fa-tasks').on('click', function (d) {
            dialogs.openEditWeightsDialog(d, d3.select(this.parentNode.parentNode));
            d3.event.stopPropagation();
        });
        $regular.append('i').attr('class', 'fa fa-pencil-square-o').on('click', function (d) {
            dialogs.openRenameDialog(d, d3.select(this.parentNode.parentNode));
            d3.event.stopPropagation();
        });
        $regular.append('i').attr('class', 'fa fa-code-fork').on('click', function (d) {
            var r = provider.pushRanking();
            r.push(provider.clone(d));
            d3.event.stopPropagation();
        });
        $node.filter(function (d) { return filterDialogs.hasOwnProperty(d.desc.type); }).append('i').attr('class', 'fa fa-filter').on('click', function (d) {
            filterDialogs[d.desc.type](d, d3.select(this.parentNode.parentNode), provider);
            d3.event.stopPropagation();
        });
        $regular.append('i').attr('class', 'fa fa-times').on('click', function (d) {
            d.removeMe();
            d3.event.stopPropagation();
        });
    };
    HeaderRenderer.prototype.renderColumns = function (columns, shifts, $base, clazz) {
        var _this = this;
        if ($base === void 0) { $base = this.$node; }
        if (clazz === void 0) { clazz = 'header'; }
        var provider = this.data;
        var $headers = $base.selectAll('div.' + clazz).data(columns, function (d) { return d.id; });
        var $headers_enter = $headers.enter().append('div').attr({
            'class': clazz,
            'draggable': true
        }).on('dragstart', function (d) {
            var e = d3.event;
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('text/plain', d.label);
            e.dataTransfer.setData('application/caleydo-lineup-column-ref', d.id);
            e.dataTransfer.setData('application/caleydo-lineup-column', JSON.stringify(provider.toDescRef(d.desc)));
        }).on('click', function (d) {
            d.toggleMySorting();
        }).style({
            'background-color': function (d) { return d.color; }
        });
        $headers_enter.append('i').attr('class', 'fa fa sort_indicator');
        $headers_enter.append('span').classed('label', true);
        $headers_enter.append('div').classed('handle', true)
            .call(this.dragHandler)
            .style('width', this.options.columnPadding + 'px')
            .call(utils.dropAble(['application/caleydo-lineup-column-ref', 'application/caleydo-lineup-column'], function (data, d, copy) {
            var col = null;
            if ('application/caleydo-lineup-column-ref' in data) {
                var id = data['application/caleydo-lineup-column-ref'];
                col = provider.find(id);
                if (copy) {
                    col = provider.clone(col);
                }
                else {
                    col.removeMe();
                }
            }
            else {
                var desc = JSON.parse(data['application/caleydo-lineup-column']);
                col = provider.create(provider.fromDescRef(desc));
            }
            return d.insertAfterMe(col);
        }));
        $headers_enter.append('div').classed('toolbar', true).call(this.createToolbar.bind(this));
        $headers.style({
            width: function (d, i) { return (shifts[i].width + _this.options.columnPadding) + 'px'; },
            left: function (d, i) { return shifts[i].offset + 'px'; }
        });
        $headers.select('i.sort_indicator').attr('class', function (d) {
            var r = d.findMyRanker();
            if (r && r.sortCriteria().col === d) {
                return 'sort_indicator fa fa-sort-' + (r.sortCriteria().asc ? 'asc' : 'desc');
            }
            return 'sort_indicator fa';
        });
        $headers.select('span.label').text(function (d) { return d.label; });
        var that = this;
        $headers.filter(function (d) { return d instanceof model.StackColumn && !d.collapsed; }).each(function (col) {
            var s_shifts = [];
            col.flatten(s_shifts, 0, 1, that.options.columnPadding);
            var s_columns = s_shifts.map(function (d) { return d.col; });
            that.renderColumns(s_columns, s_shifts, d3.select(this), clazz + '_i');
        }).select('span.label').call(utils.dropAble(['application/caleydo-lineup-column-ref', 'application/caleydo-lineup-column'], function (data, d, copy) {
            var col = null;
            if ('application/caleydo-lineup-column-ref' in data) {
                var id = data['application/caleydo-lineup-column-ref'];
                col = provider.find(id);
                if (copy) {
                    col = provider.clone(col);
                }
                else {
                    col.removeMe();
                }
            }
            else {
                var desc = JSON.parse(data['application/caleydo-lineup-column']);
                col = provider.create(provider.fromDescRef(desc));
            }
            return d.push(col);
        }));
        $headers.exit().remove();
    };
    return HeaderRenderer;
})();
exports.HeaderRenderer = HeaderRenderer;
var BodyRenderer = (function () {
    function BodyRenderer(data, parent, argsortGetter, options) {
        if (options === void 0) { options = {}; }
        this.data = data;
        this.argsortGetter = argsortGetter;
        this.options = {
            rowHeight: 20,
            rowSep: 1,
            idPrefix: '',
            slopeWidth: 200,
            columnPadding: 5,
            showStacked: true,
            animated: 0,
            renderers: renderer.renderers()
        };
        utils.merge(this.options, options);
        this.$node = d3.select(parent).append('svg').classed('lu-body', true);
        data.on('dirty.body', this.update.bind(this));
    }
    BodyRenderer.prototype.createContext = function (rankings) {
        var options = this.options;
        return {
            rowKey: this.data.rowKey,
            cellY: function (index) {
                return index * (options.rowHeight + options.rowSep);
            },
            cellX: function (index) {
                return 0;
            },
            rowHeight: function (index) {
                return options.rowHeight;
            },
            renderer: function (col) {
                if (col instanceof model.StackColumn && col.collapsed) {
                    return options.renderers.number;
                }
                var l = options.renderers[col.desc.type];
                return l || renderer.defaultRenderer();
            },
            showStacked: function (col) {
                return options.showStacked;
            },
            idPrefix: options.idPrefix,
            animated: function ($sel) { return options.animated > 0 ? $sel.transition().duration(options.animated) : $sel; }
        };
    };
    BodyRenderer.prototype.updateClipPathsImpl = function (r, context) {
        var $base = this.$node.select('defs.body');
        if ($base.empty()) {
            $base = this.$node.append('defs').classed('body', true);
        }
        var textClipPath = $base.selectAll(function () {
            return this.getElementsByTagName('clipPath');
        }).data(r, function (d) { return d.id; });
        textClipPath.enter().append('clipPath')
            .attr('id', function (d) { return context.idPrefix + 'clipCol' + d.id; })
            .append('rect').attr({
            y: 0,
            height: 1000
        });
        textClipPath.exit().remove();
        textClipPath.select('rect')
            .attr({
            x: 0,
            width: function (d) { return Math.max(d.getWidth() - 5, 0); }
        });
    };
    BodyRenderer.prototype.updateClipPaths = function (rankings, context) {
        var _this = this;
        var shifts = [], offset = 0;
        rankings.forEach(function (r) {
            var w = r.flatten(shifts, offset, 2, _this.options.columnPadding);
            offset += w + _this.options.slopeWidth;
        });
        this.updateClipPathsImpl(shifts.map(function (s) { return s.col; }), context);
    };
    BodyRenderer.prototype.renderRankings = function ($body, r, shifts, context, argSortPromises) {
        var _this = this;
        var dataPromises = argSortPromises.map(function (r) { return r.then(function (argsort) { return _this.data.view(argsort); }); });
        var $rankings = $body.selectAll('g.ranking').data(r, function (d) { return d.id; });
        var $rankings_enter = $rankings.enter().append('g').attr({
            'class': 'ranking'
        });
        $rankings_enter.append('g').attr('class', 'rows');
        $rankings_enter.append('g').attr('class', 'cols');
        context.animated($rankings).attr({
            transform: function (d, i) { return 'translate(' + shifts[i].shift + ',0)'; }
        });
        var $cols = $rankings.select('g.cols').selectAll('g.child').data(function (d) { return [d].concat(d.children); }, function (d) { return d.id; });
        $cols.enter().append('g').attr({
            'class': 'child'
        });
        context.animated($cols).attr({
            'data-index': function (d, i) { return i; }
        });
        context.animated($cols).attr({
            transform: function (d, i, j) {
                return 'translate(' + shifts[j].shifts[i] + ',0)';
            }
        }).each(function (d, i, j) {
            var _this = this;
            dataPromises[j].then(function (data) {
                context.renderer(d).render(d3.select(_this), d, data, context);
            });
        });
        $cols.exit().remove();
        function mouseOverRow($row, $cols, index, ranking, rankingIndex) {
            $row.classed('hover', true);
            var children = $cols.selectAll('g.child').data();
            var $value_cols = $row.select('g.values').selectAll('g.child').data(children);
            $value_cols.enter().append('g').attr({
                'class': 'child'
            });
            $value_cols.attr({
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
        }
        function mouseLeaveRow($row, $cols, index, ranking, rankingIndex) {
            $row.classed('hover', false);
            $row.select('g.values').selectAll('g.child').each(function (d, i) {
                var _this = this;
                dataPromises[rankingIndex].then(function (data) {
                    context.renderer(d).mouseLeave($cols.selectAll('g.child[data-index="' + i + '"]'), d3.select(_this), d, data[index], index, context);
                });
            }).remove();
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
        };
        Promise.all(argSortPromises).then(function (sorts) {
            var _this = this;
            var $rows = $rankings.select('g.rows').selectAll('g.row').data(function (d, i) { return sorts[i].map(function (d, i) { return ({
                d: d,
                i: i
            }); }); });
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
            });
            $rows.attr({
                'data-index': function (d) { return d.d; }
            });
            context.animated($rows).select('rect').attr({
                y: function (data_index) { return context.cellY(data_index.i); },
                height: function (data_index) { return context.rowHeight(data_index.i); },
                width: function (d, i, j) { return shifts[j].width; }
            });
            $rows.exit().remove();
        });
        $rankings.exit().remove();
    };
    BodyRenderer.prototype.mouseOver = function (dataIndex, hover) {
        if (hover === void 0) { hover = true; }
        this.mouseOverItem(dataIndex, hover);
        this.$node.selectAll('line.slope[data-index="' + dataIndex + '"').classed('hover', hover);
    };
    BodyRenderer.prototype.renderSlopeGraphs = function ($body, rankings, shifts, context, argSortPromises) {
        var _this = this;
        var slopes = rankings.slice(1).map(function (d, i) { return ({ left: rankings[i], left_i: i, right: d, right_i: i + 1 }); });
        var $slopes = $body.selectAll('g.slopegraph').data(slopes);
        $slopes.enter().append('g').attr({
            'class': 'slopegraph'
        });
        context.animated($slopes).attr({
            transform: function (d, i) { return 'translate(' + (shifts[i + 1].shift - _this.options.slopeWidth) + ',0)'; }
        });
        Promise.all(argSortPromises).then(function (argsortSorts) {
            var $lines = $slopes.selectAll('line.slope').data(function (d, i) {
                var cache = {};
                argsortSorts[d.right_i].forEach(function (data_index, pos) {
                    cache[data_index] = pos;
                });
                return argsortSorts[d.left_i].map(function (data_index, pos) { return ({
                    data_index: data_index,
                    lpos: pos,
                    rpos: cache[data_index]
                }); });
            });
            $lines.enter().append('line').attr({
                'class': 'slope',
                x2: _this.options.slopeWidth
            }).on('mouseenter', function (d) {
                _this.mouseOver(d.data_index, true);
            }).on('mouseleave', function (d) {
                _this.mouseOver(d.data_index, false);
            });
            $lines.attr({
                'data-index': function (d) { return d.data_index; }
            });
            context.animated($lines).attr({
                y1: function (d) { return context.rowHeight(d.lpos) * 0.5 + context.cellY(d.lpos); },
                y2: function (d) { return context.rowHeight(d.rpos) * 0.5 + context.cellY(d.rpos); }
            });
            $lines.exit().remove();
        });
        $slopes.exit().remove();
    };
    BodyRenderer.prototype.update = function () {
        var _this = this;
        var r = this.data.getRankings();
        var context = this.createContext(r);
        this.updateClipPaths(r, context);
        var offset = 0, shifts = r.map(function (d, i) {
            var r = offset;
            offset += _this.options.slopeWidth;
            var o2 = 0, shift2 = [d].concat(d.children).map(function (o) {
                var r = o2;
                o2 += o.getWidth() + _this.options.columnPadding;
                if (o instanceof model.StackColumn && !o.collapsed) {
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
            width: offset
        });
        var $body = this.$node.select('g.body');
        if ($body.empty()) {
            $body = this.$node.append('g').classed('body', true);
        }
        var argsortPromises = r.map(function (ranking) { return _this.argsortGetter(ranking); });
        this.renderRankings($body, r, shifts, context, argsortPromises);
        this.renderSlopeGraphs($body, r, shifts, context, argsortPromises);
    };
    return BodyRenderer;
})();
exports.BodyRenderer = BodyRenderer;
var LineUpRenderer = (function () {
    function LineUpRenderer(root, data, columns, argsortGetter, options) {
        if (options === void 0) { options = {}; }
        this.body = null;
        this.header = null;
        this.pool = null;
        this.options = {
            pool: true
        };
        utils.merge(this.options, options);
        this.header = new HeaderRenderer(data, root, options);
        this.body = new BodyRenderer(data, root, argsortGetter, options);
        if (this.options.pool) {
            this.pool = new PoolRenderer(data, columns, root, options);
        }
    }
    LineUpRenderer.prototype.update = function () {
        this.header.update();
        this.body.update();
        if (this.pool) {
            this.pool.update();
        }
    };
    return LineUpRenderer;
})();
exports.LineUpRenderer = LineUpRenderer;

},{"./model":3,"./renderer":5,"./ui_dialogs":8,"./utils":9,"d3":"d3"}],8:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 24.08.2015.
 */
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
function openRenameDialog(column, $header) {
    var pos = utils.offset($header.node());
    var popup = d3.select('body').append('div')
        .attr({
        'class': 'lu-popup2'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px',
        width: '200px'
    }).html(dialogForm('Rename Column', '<input type="text" size="20" value="' + column.label + '" required="required"><br>'));
    popup.select('.ok').on('click', function () {
        var newValue = popup.select('input').property('value');
        column.setLabel(newValue);
        popup.remove();
    });
    popup.select('.cancel').on('click', function () {
        popup.remove();
    });
}
exports.openRenameDialog = openRenameDialog;
function openEditWeightsDialog(column, $header) {
    var weights = column.weights, children = column.children.map(function (d, i) { return ({ col: d, weight: weights[i] * 100 }); });
    var scale = d3.scale.linear().domain([0, 100]).range([0, 120]);
    var pos = utils.offset($header.node());
    var $popup = d3.select('body').append('div')
        .attr({
        'class': 'lu-popup2'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
    })
        .html(dialogForm('Edit Weights', '<table></table>'));
    var $rows = $popup.select('table').selectAll('tr').data(children);
    var $rows_enter = $rows.enter().append('tr');
    $rows_enter.append('td')
        .append('input').attr({
        type: 'number',
        value: function (d) { return d.weight; },
        size: 5
    }).on('input', function (d) {
        d.weight = +this.value;
        redraw();
    });
    $rows_enter.append('td').append('div')
        .attr('class', 'bar')
        .style('background-color', function (d) { return d.col.color; });
    $rows_enter.append('td').text(function (d) { return d.col.label; });
    function redraw() {
        $rows.select('.bar').transition().style({
            width: function (d) {
                return scale(d.weight) + 'px';
            }
        });
    }
    redraw();
    $popup.select('.cancel').on('click', function () {
        column.setWeights(weights);
        $popup.remove();
    });
    $popup.select('.ok').on('click', function () {
        column.setWeights(children.map(function (d) { return d.weight; }));
        $popup.remove();
    });
}
exports.openEditWeightsDialog = openEditWeightsDialog;
function openCategoricalFilter(column, $header) {
    var pos = utils.offset($header.node()), bak = column.getFilter() || [];
    var popup = d3.select('body').append('div')
        .attr({
        'class': 'lu-popup'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
    })
        .html(dialogForm('Edit Filter', '<div class="selectionTable"><table><thead><th></th><th>Category</th></thead><tbody></tbody></table></div>'));
    popup.select('.selectionTable').style({
        width: (400 - 10) + 'px',
        height: (300 - 40) + 'px'
    });
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
        $header.select('i.fa-filter').classed('filtered', (filter && filter.length > 0 && filter.length < column.categories.length));
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
function openStringFilter(column, $header) {
    var pos = utils.offset($header.node()), bak = column.getFilter() || '';
    var $popup = d3.select('body').append('div')
        .attr({
        'class': 'lu-popup2'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
    })
        .html(dialogForm('Filter', '<input type="text" placeholder="containing..." autofocus="true" size="18" value="' + bak + '"><br>'));
    function updateData(filter) {
        $header.select('i.fa-filter').classed('filtered', (filter && filter.length > 0));
        column.setFilter(filter);
    }
    $popup.select('.cancel').on('click', function () {
        $popup.select('input').property('value', bak);
        updateData(bak);
        $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
        $popup.select('input').property('value', '');
        updateData(null);
    });
    $popup.select('.ok').on('click', function () {
        updateData($popup.select('input').property('value'));
        $popup.remove();
    });
}
function openMappingEditor(column, $header, data) {
    var pos = utils.offset($header.node()), bak = column.getMapping(), original = column.getOriginalMapping();
    var act = d3.scale.linear().domain(bak.domain).range(bak.range);
    var popup = d3.select('body').append('div')
        .attr({
        'class': 'lu-popup'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px',
        width: '420px',
        height: '470px'
    })
        .html(dialogForm('Change Mapping', '<div class="mappingArea"></div>' +
        '<label><input type="checkbox" id="filterIt" value="filterIt">Filter Outliers</label><br>'));
    var $filterIt = popup.select('input').on('change', function () {
        applyMapping(act);
    });
    $filterIt.property('checked', column.isFiltered());
    function applyMapping(newscale) {
        act = newscale;
        $header.select('i.fa-filter').classed('filtered', !isSame(act.range(), original.range) || !isSame(act.domain(), original.domain));
        column.setMapping(act.domain(), act.range());
        var val = $filterIt.property('checked');
        if (val) {
            column.setFilter(newscale.domain()[0], newscale.domain()[1]);
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
    var editor = mappingeditor.open(d3.scale.linear().domain(bak.domain).range(bak.range), original.domain, data_sample, editorOptions);
    popup.select('.mappingArea').call(editor);
    function isSame(a, b) {
        return a[0] === b[0] && a[1] === b[1];
    }
    popup.select('.ok').on('click', function () {
        applyMapping(act);
        popup.remove();
    });
    popup.select('.cancel').on('click', function () {
        column.setMapping(bak.domain, bak.range);
        $header.classed('filtered', !isSame(bak.range, original.range) || !isSame(bak.domain, original.domain));
        popup.remove();
    });
    popup.select('.reset').on('click', function () {
        bak = original;
        act = d3.scale.linear().domain(bak.domain).range(bak.range);
        applyMapping(act);
        editor = mappingeditor.open(d3.scale.linear().domain(bak.domain).range(bak.range), original.domain, data_sample, editorOptions);
        popup.selectAll('.mappingArea *').remove();
        popup.select('.mappingArea').call(editor);
    });
}
function openCategoricalMappingEditor(column, $header) {
    var range = column.getScale().range, colors = column.categoryColors, children = column.categories.map(function (d, i) { return ({ cat: d, range: range[i] * 100, color: colors[i] }); });
    var scale = d3.scale.linear().domain([0, 100]).range([0, 120]);
    var pos = utils.offset($header.node());
    var $popup = d3.select('body').append('div')
        .attr({
        'class': 'lu-popup2'
    }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
    })
        .html(dialogForm('Edit Categorical Mapping', '<table></table>'));
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
        column.setRange(range);
        $popup.remove();
    });
    $popup.select('.ok').on('click', function () {
        column.setRange(children.map(function (d) { return d.range / 100; }));
        $popup.remove();
    });
}
function filterDialogs() {
    return {
        string: openStringFilter,
        categorical: openCategoricalFilter,
        number: openMappingEditor,
        ordinal: openCategoricalMappingEditor
    };
}
exports.filterDialogs = filterDialogs;

},{"./mappingeditor":2,"./utils":9}],9:[function(require,module,exports){
/**
 * Created by Samuel Gratzl on 14.08.2015.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
///<reference path='../typings/tsd.d.ts' />
var d3 = require('d3');
function delayedCall(callback, thisCallback, timeToDelay) {
    if (thisCallback === void 0) { thisCallback = this; }
    if (timeToDelay === void 0) { timeToDelay = 100; }
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
function forwardEvent(to, event) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        args.unshift(event);
        to.fire.apply(to, args);
    };
}
exports.forwardEvent = forwardEvent;
var AEventDispatcher = (function () {
    function AEventDispatcher() {
        this.listeners = d3.dispatch.apply(d3, this.createEventList());
    }
    AEventDispatcher.prototype.on = function (type, listener) {
        if (arguments.length > 1) {
            this.listeners.on(type, listener);
            return this;
        }
        return this.listeners.on(type);
    };
    AEventDispatcher.prototype.createEventList = function () {
        return [];
    };
    AEventDispatcher.prototype.fire = function (type) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.listeners[type].apply(this.listeners, args);
    };
    return AEventDispatcher;
})();
exports.AEventDispatcher = AEventDispatcher;
var TYPE_OBJECT = '[object Object]';
var TYPE_ARRAY = '[object Array]';
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
var ContentScroller = (function (_super) {
    __extends(ContentScroller, _super);
    function ContentScroller(container, content, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        _super.call(this);
        this.container = container;
        this.content = content;
        this.options = {
            topShift: 0,
            backupRows: 5,
            rowHeight: 10
        };
        this.prevScrollTop = 0;
        this.shift = 0;
        merge(this.options, options);
        d3.select(container).on('scroll.scroller', function () { return _this.onScroll(); });
        this.prevScrollTop = container.scrollTop;
        this.shift = offset(content).top - offset(container).top + this.options.topShift;
    }
    ContentScroller.prototype.createEventList = function () {
        return _super.prototype.createEventList.call(this).concat(['scroll', 'redraw']);
    };
    ContentScroller.prototype.select = function (start, length, row2y) {
        var top = this.container.scrollTop - this.shift, bottom = top + this.container.clientHeight, i = 0, j;
        if (top > 0) {
            i = Math.round(top / this.options.rowHeight);
            while (i >= start && row2y(i + 1) > top) {
                i--;
            }
            i -= this.options.backupRows;
        }
        {
            j = Math.round(bottom / this.options.rowHeight);
            while (j <= length && row2y(j - 1) < bottom) {
                j++;
            }
            j += this.options.backupRows;
        }
        return {
            from: Math.max(i, start),
            to: Math.min(j, length)
        };
    };
    ContentScroller.prototype.onScroll = function () {
        var top = this.container.scrollTop;
        var left = this.container.scrollLeft;
        this.fire('scroll', top, left);
        if (Math.abs(this.prevScrollTop - top) >= this.options.rowHeight * this.options.backupRows) {
            this.prevScrollTop = top;
            this.fire('redraw');
        }
    };
    ContentScroller.prototype.destroy = function () {
        d3.select(this.container).on('scroll.scroller', null);
    };
    return ContentScroller;
})(AEventDispatcher);
exports.ContentScroller = ContentScroller;
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
function copyDnD(e) {
    var dT = e.dataTransfer;
    return (e.ctrlKey && dT.effectAllowed.match(/copy/gi)) || (!dT.effectAllowed.match(/move/gi));
}
exports.copyDnD = copyDnD;
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
function dropAble(mimeTypes, onDrop) {
    return function ($node) {
        $node.on('dragenter', function () {
            var e = d3.event;
            if (hasDnDType(e, mimeTypes)) {
                return false;
            }
            d3.select(this).classed('drag_over', true);
        }).on('dragover', function () {
            var e = d3.event;
            if (hasDnDType(e, mimeTypes)) {
                e.preventDefault();
                updateDropEffect(e);
                return false;
            }
        }).on('dragleave', function () {
            d3.select(this).classed('drag_over', false);
        }).on('drop', function (d) {
            var e = d3.event;
            e.preventDefault();
            if (hasDnDType(e, mimeTypes)) {
                var data = {};
                mimeTypes.forEach(function (mime) {
                    var value = e.dataTransfer.getData(mime);
                    if (value !== '') {
                        data[mime] = value;
                    }
                });
                return onDrop(data, d, e.dataTransfer.dropEffect.match(/.*copy.*/i) != null);
            }
        });
    };
}
exports.dropAble = dropAble;

},{"d3":"d3"}]},{},[1,2,3,4,5,6,7,8,9]);
