/**
 * Created by Samuel Gratzl on 14.08.2015.
 */


///<reference path='../typings/tsd.d.ts' />
import d3 = require('d3');
import utils = require('./utils');
import model = require('./model');
import renderer = require('./renderer');
import provider = require('./provider');
import dialogs = require('./ui_dialogs');

class PoolEntry {
  used:number = 0;

  constructor(public desc:model.IColumnDesc) {

  }
}

export class PoolRenderer {
  private options = {
    layout: 'vertical',
    elemWidth: 100,
    elemHeight: 40,
    width: 100,
    height: 500,
    additionalDesc: [],
    hideUsed: true,
    addAtEndOnClick: false
  };

  private $node:d3.Selection<any>;
  private entries:PoolEntry[];

  constructor(private data:provider.DataProvider, parent:Element, options:any = {}) {
    utils.merge(this.options, options);

    this.$node = d3.select(parent).append('div').classed('lu-pool', true);

    this.changeDataStorage(data);
  }

  changeDataStorage(data:provider.DataProvider) {
    if (this.data) {
      this.data.on(['addColumn.pool', 'removeColumn.pool', 'addRanking.pool', 'removeRanking.pool', 'addDesc.pool'], null);
    }
    this.data = data;
    this.entries = data.getColumns().concat(this.options.additionalDesc).map((d) => new PoolEntry(d));
    data.on(['addDesc.pool'], (desc) => {
      this.entries.push(new PoolEntry(desc));
      this.update();
    });
    if (this.options.hideUsed) {
      var that = this;
      data.on(['addColumn.pool', 'removeColumn.pool'], function (col) {
        var desc = col.desc, change = this.type === 'addColumn' ? 1 : -1;
        that.entries.some((entry) => {
          if (entry.desc !== desc) {
            return false;
          }
          entry.used += change;
          return true;
        });
        that.update();
      });
      data.on(['addRanking.pool', 'removeRanking.pool'], function (ranking) {
        var descs = ranking.flatColumns.map((d) => d.desc), change = this.type === 'addRanking' ? 1 : -1;
        that.entries.some((entry) => {
          if (descs.indexOf(entry.desc) < 0) {
            return false;
          }
          entry.used += change;
          return true;
        });
        that.update();
      });
      data.getRankings().forEach((ranking) => {
        var descs = ranking.flatColumns.map((d) => d.desc), change = +1;
        that.entries.some((entry) => {
          if (descs.indexOf(entry.desc) < 0) {
            return false;
          }
          entry.used += change;
        });
      });
    }
  }

  remove() {
    this.$node.remove();
    if (this.data) {
      this.data.on(['addColumn.pool', 'removeColumn.pool', 'addRanking.pool', 'removeRanking.pool', 'addDesc.pool'], null);
    }
  }

  update() {
    var data = this.data;
    var descToShow = this.entries.filter((e) => e.used === 0).map((d) => d.desc);
    var $headers = this.$node.selectAll('div.header').data(descToShow);
    var $headers_enter = $headers.enter().append('div').attr({
      'class': 'header',
      'draggable': true
    }).on('dragstart', (d) => {
      var e = <DragEvent>(<any>d3.event);
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
      $headers_enter.on('click', (d) => {
        this.data.push(this.data.getLastRanking(), d);
      });
    }
    $headers_enter.append('span').classed('label', true).text((d) => d.label);
    $headers.attr('class', (d) => 'header ' + ((<any>d).cssClass || ''));
    $headers.style({
      'transform': (d, i) => {
        var pos = this.layout(i);
        return 'translate(' + pos.x + 'px,' + pos.y + 'px)';
      },
      'background-color': (d) => {
        const s = (<any>d);
        return s.cssClass ? null : s.color || model.Column.DEFAULT_COLOR;
      }
    });
    $headers.attr({
      title: (d) => d.label
    });
    $headers.select('span').text((d) => d.label);
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
  }

  private layout(i:number) {
    switch (this.options.layout) {
      case 'horizontal':
        return {x: i * this.options.elemWidth, y: 0};
      case 'grid':
        var perRow = d3.round(this.options.width / this.options.elemWidth, 0);
        return {x: (i % perRow) * this.options.elemWidth, y: Math.floor(i / perRow) * this.options.elemHeight};
      //case 'vertical':
      default:
        return {x: 0, y: i * this.options.elemHeight};
    }
  }
}


export class HeaderRenderer {
  private options = {
    slopeWidth: 150,
    columnPadding: 5,
    headerHeight: 20,
    manipulative: true,
    histograms: false,

    filterDialogs: dialogs.filterDialogs(),
    searchAble: (col:model.Column) => col instanceof model.StringColumn,
    sortOnLabel: true
  };

  $node:d3.Selection<any>;

  private histCache = d3.map<Promise<any>>();

  private dragHandler = d3.behavior.drag<model.Column>()
    //.origin((d) => d)
    .on('dragstart', function () {
      d3.select(this).classed('dragging', true);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    })
    .on('drag', function (d) {
      //the new width
      var newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
      d.setWidth(newValue);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    })
    .on('dragend', function () {
      d3.select(this).classed('dragging', false);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    });

  private dropHandler = utils.dropAble(['application/caleydo-lineup-column-ref', 'application/caleydo-lineup-column'], (data, d:model.Column, copy) => {
    var col:model.Column = null;
    if ('application/caleydo-lineup-column-ref' in data) {
      var id = data['application/caleydo-lineup-column-ref'];
      col = this.data.find(id);
      if (copy) {
        col = this.data.clone(col);
      } else {
        col.removeMe();
      }
    } else {
      var desc = JSON.parse(data['application/caleydo-lineup-column']);
      col = this.data.create(this.data.fromDescRef(desc));
    }
    if (d instanceof model.Column) {
      return d.insertAfterMe(col);
    } else {
      var r = this.data.getLastRanking();
      return r.push(col) !== null;
    }
  });


  constructor(private data:provider.DataProvider, parent:Element, options:any = {}) {
    utils.merge(this.options, options);

    this.$node = d3.select(parent).append('div').classed('lu-header', true);
    this.$node.append('div').classed('drop', true).call(this.dropHandler);

    this.changeDataStorage(data);
  }

  changeDataStorage(data:provider.DataProvider) {
    if (this.data) {
      this.data.on(['dirtyHeader.headerRenderer', 'orderChanged.headerRenderer', 'selectionChanged.headerRenderer'], null);
    }
    this.data = data;
    data.on('dirtyHeader.headerRenderer', utils.delayedCall(this.update.bind(this), 1));
    if (this.options.histograms) {
      data.on('orderChanged.headerRenderer', this.updateHist.bind(this));
      data.on('selectionChanged.headerRenderer', utils.delayedCall(this.drawSelection.bind(this), 1));

    }
  }

  private updateHist() {
    var rankings = this.data.getRankings();
    rankings.forEach((ranking) => {
      const order = ranking.getOrder();
      const cols = ranking.flatColumns;
      const histo = order == null ? null : this.data.stats(order);
      cols.filter((d) => d instanceof model.NumberColumn).forEach((col:any) => {
        this.histCache.set(col.id,histo === null ? null : histo.stats(col));
      });
      cols.filter(model.isCategoricalColumn).forEach((col:any) => {
        this.histCache.set(col.id,histo === null ? null : histo.hist(col));
      });
    });
    this.update();
  }

  /**
   * update the selection in the histograms
   */
  drawSelection() {
    if (!this.options.histograms) {
      return;
    }
    //highlight the bins in the histograms
    const node = <HTMLElement>this.$node.node();

    [].slice.call(node.querySelectorAll('div.bar')).forEach((d) => d.classList.remove('selected'));
    var indices = this.data.getSelection();
    if (indices.length <= 0) {
      return;
    }
    this.data.view(indices).then((data) => {
      //get the data

      var rankings = this.data.getRankings();

      rankings.forEach((ranking) => {
        const cols = ranking.flatColumns;
        //find all number histograms
        cols.filter((d) => d instanceof model.NumberColumn).forEach((col:model.NumberColumn) => {
          const bars = [].slice.call(node.querySelectorAll(`div.header[data-id="${col.id}"] div.bar`));
          data.forEach((d) => {
            const v = col.getValue(d);
            //choose the right bin
            for (let i = 1 ; i < bars.length; ++i) {
              let bar = bars[i];
              if (bar.dataset.x > v) { //previous bin
                bars[i-1].classList.add('selected');
                break;
              } else if (i === bars.length - 1) { //last bin
                bar.classList.add('selected');
                break;
              }
            }
          });
        });
        cols.filter(model.isCategoricalColumn).forEach((col:model.CategoricalColumn) => {
          const header = node.querySelector(`div.header[data-id="${col.id}"]`);
          data.forEach((d) => {
            const cats = col.getCategories(d);
            (cats || []).forEach((cat) => {
              header.querySelector(`div.bar[data-cat="${cat}"]`).classList.add('selected');
            });
          });
        });
      });
    });
  }

  update() {
    var rankings = this.data.getRankings();

    var shifts = [], offset = 0;
    rankings.forEach((ranking) => {
      offset += ranking.flatten(shifts, offset, 1, this.options.columnPadding) + this.options.slopeWidth;
    });
    //real width
    offset -= this.options.slopeWidth;

    var columns = shifts.map((d) => d.col);

    function countStacked(c:model.Column):number {
      if (c instanceof model.StackColumn && !(<model.StackColumn>c).collapsed && !c.compressed) {
        return 1 + Math.max.apply(Math, (<model.StackColumn>c).children.map(countStacked));
      }
      return 1;
    }

    var levels = Math.max.apply(Math, columns.map(countStacked));
    this.$node.style('height', this.options.headerHeight * levels + 'px');

    //update all if needed
    if (this.options.histograms && this.histCache.empty() && rankings.length > 0) {
      this.updateHist();
    }

    this.renderColumns(columns, shifts);
  }

  private createToolbar($node:d3.Selection<model.Column>) {
    var filterDialogs = this.options.filterDialogs,
      provider = this.data;
    var $regular = $node.filter(d=> !(d instanceof model.RankColumn)),
      $stacked = $node.filter(d=> d instanceof model.StackColumn);

    //edit weights
    $stacked.append('i').attr('class', 'fa fa-tasks').attr('title', 'Edit Weights').on('click', function (d) {
      dialogs.openEditWeightsDialog(<model.StackColumn>d, d3.select(this.parentNode.parentNode));
      d3.event.stopPropagation();
    });
    //rename
    $regular.append('i').attr('class', 'fa fa-pencil-square-o').attr('title', 'Rename').on('click', function (d) {
      dialogs.openRenameDialog(d, d3.select(this.parentNode.parentNode));
      d3.event.stopPropagation();
    });
    //clone
    $regular.append('i').attr('class', 'fa fa-code-fork').attr('title', 'Generate Snapshot').on('click', function (d) {
      var r = provider.pushRanking();
      r.push(provider.clone(d));
      d3.event.stopPropagation();
    });
    //filter
    $node.filter((d) => filterDialogs.hasOwnProperty(d.desc.type)).append('i').attr('class', 'fa fa-filter').attr('title', 'Filter').on('click', function (d) {
      filterDialogs[d.desc.type](d, d3.select(this.parentNode.parentNode), provider);
      d3.event.stopPropagation();
    });
    //search
    $node.filter((d) => this.options.searchAble(d)).append('i').attr('class', 'fa fa-search').attr('title', 'Search').on('click', function (d) {
      dialogs.openSearchDialog(d, d3.select(this.parentNode.parentNode), provider);
      d3.event.stopPropagation();
    });
    //collapse
    $regular.append('i')
      .attr('class', 'fa')
      .classed('fa-toggle-left', (d:model.Column) => !d.compressed)
      .classed('fa-toggle-right', (d:model.Column) => d.compressed)
      .attr('title', '(Un)Collapse')
      .on('click', function (d:model.Column) {
        d.compressed = !d.compressed;
        d3.select(this)
          .classed('fa-toggle-left', !d.compressed)
          .classed('fa-toggle-right', d.compressed);
        d3.event.stopPropagation();
      });
    //compress
    $stacked.append('i')
      .attr('class', 'fa')
      .classed('fa-compress', (d:model.StackColumn) => !d.collapsed)
      .classed('fa-expand', (d:model.StackColumn) => d.collapsed)
      .attr('title', 'Compress/Expand')
      .on('click', function (d:model.StackColumn) {
        d.collapsed = !d.collapsed;
        d3.select(this)
          .classed('fa-compress', !d.collapsed)
          .classed('fa-expand', d.collapsed);
        d3.event.stopPropagation();
      });
    //remove
    $node.append('i').attr('class', 'fa fa-times').attr('title', 'Hide').on('click', (d) => {
      if (d instanceof model.RankColumn) {
        provider.removeRanking(<model.RankColumn>d);
        if (provider.getRankings().length === 0) { //create at least one
          provider.pushRanking();
        }
      } else {
        d.removeMe();
      }
      d3.event.stopPropagation();
    });
  }

  updateFreeze(numColumns:number, left:number) {
    this.$node.selectAll('div.header')
      .style('z-index', (d, i) => i < numColumns ? 1 : null)
      .style('transform', (d, i) => i < numColumns ? `translate(${left}px,0)` : null);
  }

  private renderColumns(columns:model.Column[], shifts, $base:d3.Selection<any> = this.$node, clazz:string = 'header') {
    var $headers = $base.selectAll('div.' + clazz).data(columns, (d) => d.id);
    var $headers_enter = $headers.enter().append('div').attr({
      'class': clazz
    });
    var $header_enter_div = $headers_enter.append('div').classed('lu-label', true).on('click', (d) => {
        if (this.options.manipulative && !d3.event.defaultPrevented) {
          d.toggleMySorting();
        }
      })
      .on('dragstart', (d) => {
        var e = <DragEvent>(<any>d3.event);
        e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
        e.dataTransfer.setData('text/plain', d.label);
        e.dataTransfer.setData('application/caleydo-lineup-column-ref', d.id);
        var ref = JSON.stringify(this.data.toDescRef(d.desc));
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
      width: (d, i) => (shifts[i].width + this.options.columnPadding) + 'px',
      left: (d, i) => shifts[i].offset + 'px',
      'background-color': (d) => d.color
    });
    $headers.attr({
      class: (d) => clazz + ' ' + d.cssClass + ' ' + (d.compressed ? 'compressed' : ''),
      title: (d) => d.label,
      'data-id': (d) => d.id,
    });
    $headers.select('i.sort_indicator').attr('class', (d) => {
      var r = d.findMyRanker();
      if (r && r.sortCriteria().col === d) {
        return 'sort_indicator fa fa-sort-' + (r.sortCriteria().asc ? 'asc' : 'desc');
      }
      return 'sort_indicator fa';
    });
    $headers.select('span.lu-label').text((d) => d.label);

    var that = this;
    $headers.filter((d) => d instanceof model.StackColumn).each(function (col:model.StackColumn) {
      if (col.collapsed || col.compressed) {
        d3.select(this).selectAll('div.' + clazz + '_i').remove();
      } else {
        let s_shifts = [];
        col.flatten(s_shifts, 0, 1, that.options.columnPadding);

        let s_columns = s_shifts.map((d) => d.col);
        that.renderColumns(s_columns, s_shifts, d3.select(this), clazz + (clazz.substr(clazz.length - 2) !== '_i' ? '_i' : ''));
      }
    }).call(utils.dropAble(['application/caleydo-lineup-column-number-ref', 'application/caleydo-lineup-column-number'], (data, d:model.StackColumn, copy) => {
      var col:model.Column = null;
      if ('application/caleydo-lineup-column-number-ref' in data) {
        var id = data['application/caleydo-lineup-column-number-ref'];
        col = this.data.find(id);
        if (copy) {
          col = this.data.clone(col);
        } else {
          col.removeMe();
        }
      } else {
        var desc = JSON.parse(data['application/caleydo-lineup-column-number']);
        col = this.data.create(this.data.fromDescRef(desc));
      }
      return d.push(col);
    }));

    if (this.options.histograms) {

      $headers.filter((d) => model.isCategoricalColumn(d)).each(function (col:model.CategoricalColumn) {
        var $this = d3.select(this).select('div.histogram');
        var hist = that.histCache.get(col.id);
        if (hist) {
          hist.then((stats:model.ICategoricalStatistics) => {
            const $bars = $this.selectAll('div.bar').data(stats.hist);
            $bars.enter().append('div').classed('bar', true);
            const sx = d3.scale.ordinal().domain(col.categories).rangeBands([0, 100], 0.1);
            const sy = d3.scale.linear().domain([0, stats.maxBin]).range([0, 100]);
            $bars.style({
              left: (d) => sx(d.cat) + '%',
              width: (d) => sx.rangeBand() + '%',
              top: (d) => (100 - sy(d.y)) + '%',
              height: (d) => sy(d.y) + '%',
              'background-color': (d) => col.colorOf(d.cat)
            }).attr({
              title: (d) => `${d.cat}: ${d.y}`,
              'data-cat': (d) => d.cat
            });
            $bars.exit().remove();
          });
        }
      });
      $headers.filter((d) => d instanceof model.NumberColumn).each(function (col:model.Column) {
        var $this = d3.select(this).select('div.histogram');
        var hist = that.histCache.get(col.id);
        if (hist) {
          hist.then((stats:model.IStatistics) => {
            const $bars = $this.selectAll('div.bar').data(stats.hist);
            $bars.enter().append('div').classed('bar', true);
            const sx = d3.scale.ordinal().domain(d3.range(stats.hist.length).map(String)).rangeBands([0, 100], 0.1);
            const sy = d3.scale.linear().domain([0, stats.maxBin]).range([0, 100]);
            $bars.style({
              left: (d,i) => sx(String(i)) + '%',
              width: (d,i) => sx.rangeBand() + '%',
              top: (d) => (100 - sy(d.y)) + '%',
              height: (d) => sy(d.y) + '%'
            }).attr({
              title: (d,i) => `Bin ${i}: ${d.y}`,
              'data-x': (d) => d.x
            });
            $bars.exit().remove();
          });
        }
      });
    }

    $headers.exit().remove();
  }
}


export interface ISlicer {
  (start:number, length:number, row2y:(i:number) => number) : { from: number; to: number };
}

export class BodyRenderer extends utils.AEventDispatcher {
  private mouseOverItem:(dataIndex:number, hover:boolean) => void;
  private options = {
    rowHeight: 20,
    rowPadding: 1,
    rowBarPadding: 1,
    idPrefix: '',
    slopeWidth: 150,
    columnPadding: 5,
    stacked: true,
    animation: false, //200
    animationDuration: 1000,

    renderers: renderer.renderers(),

    actions: []

  };

  private $node:d3.Selection<any>;

  constructor(private data:provider.DataProvider, parent:Element, private slicer:ISlicer, options = {}) {
    super();
    //merge options
    utils.merge(this.options, options);

    this.$node = d3.select(parent).append('svg').classed('lu-body', true);

    this.changeDataStorage(data);
  }

  createEventList() {
    return super.createEventList().concat(['hoverChanged']);
  }

  get node() {
    return <Element>this.$node.node();
  }

  setOption(key:string, value:any) {
    this.options[key] = value;
  }

  changeDataStorage(data:provider.DataProvider) {
    if (this.data) {
      this.data.on(['dirtyValues.bodyRenderer', 'selectionChanged.bodyRenderer'], null);
    }
    this.data = data;
    data.on('dirtyValues.bodyRenderer', utils.delayedCall(this.update.bind(this), 1));
    data.on('selectionChanged.bodyRenderer', utils.delayedCall(this.drawSelection.bind(this), 1));
  }

  createContext(index_shift:number):renderer.IRenderContext {
    var options = this.options;
    return {
      rowKey: this.data.rowKey,
      cellY(index:number) {
        return (index + index_shift) * (options.rowHeight);
      },
      cellPrevY(index:number) {
        return (index + index_shift) * (options.rowHeight);
      },
      cellX(index:number) {
        return 0;
      },
      rowHeight(index:number) {
        return options.rowHeight * (1 - options.rowPadding);
      },
      renderer(col:model.Column) {
        if (col.compressed && model.isNumberColumn(col)) {
          return options.renderers.heatmap;
        }
        if (col instanceof model.StackColumn && col.collapsed) {
          return options.renderers.number;
        }
        var l = options.renderers[col.desc.type];
        return l || renderer.defaultRenderer();
      },
      render(col:model.Column, $this:d3.Selection<model.Column>, data:any[], context:renderer.IRenderContext = this) {
        //if renderers change delete old stuff
        const tthis = <any>($this.node());
        const old_renderer = tthis.__renderer__;
        const act_renderer = this.renderer(col);
        if (old_renderer !== act_renderer) {
          $this.selectAll('*').remove();
          tthis.__renderer__ = act_renderer;
        }
        act_renderer.render($this, col, data, context);
      },
      showStacked(col:model.StackColumn) {
        return options.stacked;
      },
      idPrefix: options.idPrefix,

      animated: ($sel:d3.Selection<any>) => options.animation ? $sel.transition().duration(options.animationDuration) : $sel,

      option: (key:string, default_:any) => (key in options) ? options[key] : default_
    };
  }

  updateClipPathsImpl(r:model.Column[], context:renderer.IRenderContext, height:number) {
    var $base = this.$node.select('defs.body');
    if ($base.empty()) {
      $base = this.$node.append('defs').classed('body', true);
    }

    //generate clip paths for the text columns to avoid text overflow
    //see http://stackoverflow.com/questions/L742812/cannot-select-svg-foreignobject-element-in-d3
    //there is a bug in webkit which present camelCase selectors
    var textClipPath = $base.selectAll(function () {
      return this.getElementsByTagName('clipPath');
    }).data(r, (d) => d.id);
    textClipPath.enter().append('clipPath')
      .attr('id', (d) => context.idPrefix + 'clipCol' + d.id)
      .append('rect').attr({
      y: 0
    });
    textClipPath.exit().remove();
    textClipPath.select('rect')
      .attr({
        x: 0, //(d,i) => offsets[i],
        width: (d) => Math.max(d.getWidth() - 5, 0),
        height: height
      });
  }

  updateClipPaths(rankings:model.RankColumn[], context:renderer.IRenderContext, height:number) {
    var shifts = [], offset = 0;
    rankings.forEach((r) => {
      var w = r.flatten(shifts, offset, 2, this.options.columnPadding);
      offset += w + this.options.slopeWidth;
    });
    this.updateClipPathsImpl(shifts.map(s => s.col), context, height);

    var $elem = this.$node.select('clipPath#c' + context.idPrefix + 'Freeze');
    if ($elem.empty()) {
      $elem = this.$node.append('clipPath').attr('id', 'c' + context.idPrefix + 'Freeze').append('rect').attr({
        y: 0,
        width: 20000
      });
    }
    $elem.select('rect').attr({
      height: height
    });
  }

  renderRankings($body:d3.Selection<any>, rankings:model.RankColumn[], orders:number[][], shifts:any[], context:renderer.IRenderContext) {
    var dataPromises = orders.map((r) => this.data.view(r));

    var $rankings = $body.selectAll('g.ranking').data(rankings, (d) => d.id);
    var $rankings_enter = $rankings.enter().append('g').attr({
      'class': 'ranking',
      transform: (d, i) => 'translate(' + shifts[i].shift + ',0)'
    });
    $rankings_enter.append('g').attr('class', 'rows');
    $rankings_enter.append('g').attr('class', 'cols');

    context.animated($rankings).attr({
      transform: (d, i) => 'translate(' + shifts[i].shift + ',0)'
    });

    var $cols = $rankings.select('g.cols').selectAll('g.uchild').data((d) => [<model.Column>d].concat(d.children), (d) => d.id);
    $cols.enter().append('g').attr('class', 'uchild')
      .append('g').attr({
      'class': 'child',
      transform: (d, i, j?) => 'translate(' + shifts[j].shifts[i] + ',0)'
    });
    $cols.exit().remove();
    $cols = $cols.select('g.child');
    $cols.attr({
      'data-index': (d, i) => i
    });
    context.animated($cols).attr({
      transform: (d, i, j?) => {
        return 'translate(' + shifts[j].shifts[i] + ',0)';
      }
    }).each(function (d, i, j?) {
      dataPromises[j].then((data) => {
        context.render(d, d3.select(this), data, context);
      });
    });

    function mouseOverRow($row:d3.Selection<number>, $cols:d3.Selection<model.RankColumn>, index:number, ranking:model.RankColumn, rankingIndex:number) {
      $row.classed('hover', true);
      var $value_cols = $row.select('g.values').selectAll('g.child').data([<model.Column>ranking].concat(ranking.children), (d) => d.id);
      $value_cols.enter().append('g').attr({
        'class': 'child'
      });
      $value_cols.attr({
        transform: (d, i) => {
          return 'translate(' + shifts[rankingIndex].shifts[i] + ',0)';
        }
      }).each(function (d:model.Column, i) {
        dataPromises[rankingIndex].then((data) => {
          context.renderer(d).mouseEnter($cols.selectAll('g.child[data-index="' + i + '"]'), d3.select(this), d, data[index], index, context);
        });
      });
      $value_cols.exit().remove();
      //data.mouseOver(d, i);
    }

    function mouseLeaveRow($row:d3.Selection<number>, $cols:d3.Selection<model.RankColumn>, index:number, ranking:model.RankColumn, rankingIndex:number) {
      $row.classed('hover', false);
      $row.select('g.values').selectAll('g.child').each(function (d:model.Column, i) {
        dataPromises[rankingIndex].then((data) => {
          context.renderer(d).mouseLeave($cols.selectAll('g.child[data-index="' + i + '"]'), d3.select(this), d, data[index], index, context);
        });
      }).remove();
      //data.mouseLeave(d, i);
    }

    this.mouseOverItem = function (data_index:number, hover = true) {
      $rankings.each(function (ranking, rankingIndex) {
        var $ranking = d3.select(this);
        var $row = $ranking.selectAll('g.row[data-index="' + data_index + '"]');
        var $cols = $ranking.select('g.cols');
        if (!$row.empty()) {
          var index = $row.datum().i;
          if (hover) {
            mouseOverRow($row, $cols, index, ranking, rankingIndex);
          } else {
            mouseLeaveRow($row, $cols, index, ranking, rankingIndex);
          }
        }
      });
    };
    var $rows = $rankings.select('g.rows').selectAll('g.row').data((d, i) => orders[i].map((d, i) => ({d: d, i: i})));
    var $rows_enter = $rows.enter().append('g').attr({
      'class': 'row'
    });
    $rows_enter.append('rect').attr({
      'class': 'bg'
    });
    $rows_enter.append('g').attr({'class': 'values'});
    $rows_enter.on('mouseenter', (data_index) => {
      this.mouseOver(data_index.d, true);
    }).on('mouseleave', (data_index) => {
      this.mouseOver(data_index.d, false);
    }).on('click', (data_index) => {
      this.select(data_index.d, d3.event.ctrlKey);
    });
    $rows.attr({
      'data-index': (d) => d.d
    }).classed('selected', (d) => this.data.isSelected(d.d));
    $rows.select('rect').attr({
      y: (d) => context.cellY(d.i),
      height: (d) => context.rowHeight(d.i),
      width: (d, i, j?) => shifts[j].width,
      'class': (d, i) => 'bg ' + (i % 2 === 0 ? 'even' : 'odd')
    });
    $rows.exit().remove();

    $rankings.exit().remove();
  }

  select(dataIndex:number, additional = false) {
    var selected = this.data.toggleSelection(dataIndex, additional);
    this.$node.selectAll('g.row[data-index="' + dataIndex + '"], line.slope[data-index="' + dataIndex + '"]').classed('selected', selected);
  }

  drawSelection() {
    var indices = this.data.getSelection();
    if (indices.length === 0) {
      this.$node.selectAll('g.row.selected, line.slope.selected').classed('selected', false);
    } else {
      var s = d3.set(indices);
      this.$node.selectAll('g.row').classed('selected', (d) => s.has(String(d.d)));
      this.$node.selectAll('line.slope').classed('selected', (d) => s.has(String(d.data_index)));
    }
  }

  mouseOver(dataIndex:number, hover = true) {
    this.fire('hoverChanged', hover ? dataIndex : -1);
    this.mouseOverItem(dataIndex, hover);
    //update the slope graph
    this.$node.selectAll('line.slope[data-index="' + dataIndex + '"]').classed('hover', hover);
  }

  renderSlopeGraphs($body:d3.Selection<any>, rankings:model.RankColumn[], orders:number[][], shifts:any[], context:renderer.IRenderContext) {
    var slopes = orders.slice(1).map((d, i) => ({left: orders[i], left_i: i, right: d, right_i: i + 1}));
    var $slopes = $body.selectAll('g.slopegraph').data(slopes);
    $slopes.enter().append('g').attr({
      'class': 'slopegraph'
    });
    $slopes.attr({
      transform: (d, i) => 'translate(' + (shifts[i + 1].shift - this.options.slopeWidth) + ',0)'
    });
    var $lines = $slopes.selectAll('line.slope').data((d, i) => {
      var cache = {};
      d.right.forEach((data_index, pos) => {
        cache[data_index] = pos;
      });
      return d.left.map((data_index, pos) => ({
        data_index: data_index,
        lpos: pos,
        rpos: cache[data_index]
      })).filter((d) => d.rpos != null);
    });
    $lines.enter().append('line').attr({
      'class': 'slope',
      x2: this.options.slopeWidth
    }).on('mouseenter', (d) => {
      this.mouseOver(d.data_index, true);
    }).on('mouseleave', (d) => {
      this.mouseOver(d.data_index, false);
    });
    $lines.attr({
      'data-index': (d) => d.data_index
    });
    $lines.attr({
      y1: (d:any) => {
        return context.rowHeight(d.lpos) * 0.5 + context.cellY(d.lpos);
      },
      y2: (d:any) => {
        return context.rowHeight(d.rpos) * 0.5 + context.cellY(d.rpos);
      }
    });
    $lines.exit().remove();

    $slopes.exit().remove();
  }

  updateFreeze(numColumns:number, left:number) {
    var $n = this.$node.select('#c' + this.options.idPrefix + 'Freeze').select('rect');
    var x = d3.transform(this.$node.select(`g.child[data-index="${numColumns}"]`).attr('transform') || '').translate[0];
    $n.attr('x', left + x);
    this.$node.selectAll('g.uchild').attr({
      'clip-path': (d, i) => i < numColumns ? null : 'url(#c' + this.options.idPrefix + 'Freeze)',
      'transform': (d, i) => i < numColumns ? 'translate(' + left + ',0)' : null
    });
  }

  /**
   * render the body
   */
  update() {
    var rankings = this.data.getRankings();
    var maxElems = d3.max(rankings, (d) => d.getOrder().length) || 0;
    var height = this.options.rowHeight * maxElems;
    var visibleRange = this.slicer(0, maxElems, (i) => i * this.options.rowHeight);
    var orderSlicer = (order:number[]) => {
      if (visibleRange.from === 0 && order.length <= visibleRange.to) {
        return order;
      }
      return order.slice(visibleRange.from, Math.min(order.length, visibleRange.to));
    };
    var orders = rankings.map((r) => orderSlicer(r.getOrder()));
    var context = this.createContext(visibleRange.from);


    //compute offsets and shifts for individual rankings and columns inside the rankings
    var offset = 0,
      shifts = rankings.map((d, i) => {
        var r = offset;
        offset += this.options.slopeWidth;
        var o2 = 0,
          shift2 = [<model.Column>d].concat(d.children).map((o) => {
            var r = o2;
            o2 += (o.compressed ? model.Column.COMPRESSED_WIDTH : o.getWidth()) + this.options.columnPadding;
            if (o instanceof model.StackColumn && !o.collapsed && !o.compressed) {
              o2 += this.options.columnPadding * (o.length - 1);
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
    this.updateClipPaths(rankings, context, height);


    var $body = this.$node.select('g.body');
    if ($body.empty()) {
      $body = this.$node.append('g').classed('body', true);
    }

    this.renderRankings($body, rankings, orders, shifts, context);
    this.renderSlopeGraphs($body, rankings, orders, shifts, context);
  }
}
