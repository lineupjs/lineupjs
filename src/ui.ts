/**
 * Created by Samuel Gratzl on 14.08.2015.
 */


///<reference path='../typings/tsd.d.ts' />
import d3 = require('d3');
import utils = require('./utils');
import model = require('./model');
import renderer = require('./renderer');
import provider = require('./provider');

export class PoolRenderer {
  private options = {
    layout: 'vertical',
    elemWidth: 100,
    elemHeight: 40,
    width: 100,
    height: 500,
    hideUsed: true
  };

  private $node:d3.Selection<any>;

  constructor(private data: provider.DataProvider, private columns:provider.IColumnDesc[], parent:Element, options:any = {}) {
    utils.merge(this.options, options);

    this.$node = d3.select(parent).append('div').classed('lu-pool',true);

    this.update();

    /*if (this.options.hideUsed) {
     data.on('addColumn.pool', (_, col:any) => {
     var desc:provider.IColumnDesc = col.desc;
     });
     } else {

     }*/
  }

  update() {
    var data = this.data;
    var $headers = this.$node.selectAll('div.header').data(this.columns, (d) => d.label);
    var $headers_enter = $headers.enter().append('div').attr({
      'class': 'header',
      'draggable': true
    }).on('dragstart', (d) => {
      var e = <DragEvent>(<any>d3.event);
      e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
      e.dataTransfer.setData('text/plain', d.label);
      e.dataTransfer.setData('application/caleydo-lineup-column', JSON.stringify(data.toDescRef(d)));
    }).style({
      'background-color': (d) => (<any>d).color,
      width: this.options.elemWidth+'px',
      height: this.options.elemHeight+'px'
    });
    $headers_enter.append('span').classed('label',true).text((d) => d.label);
    $headers.style('transform', (d, i) => {
      var pos = this.layout(i);
      return 'translate(' + pos.x + 'px,' + pos.y + 'px)';
    });
    $headers.select('span');
    $headers.exit().remove();
  }

  private layout(i:number) {
    switch (this.options.layout) {
      case 'horizontal':
        return {x: i * this.options.elemWidth, y: 0};
      case 'grid':
        var perRow = d3.round(this.options.width / this.options.elemWidth, 0);
        return {x: (i % perRow) * this.options.elemWidth, y: d3.round(i / perRow, 0) * this.options.elemHeight};
      case 'vertical':
      default:
        return {x: 0, y: i * this.options.elemHeight};
    }
  }
}


export class HeaderRenderer {
  private options = {
    slopeWidth: 200,
    columnPadding : 5,
    headerHeight: 20
  };

  private $node:d3.Selection<any>;

  private dragHandler = d3.behavior.drag<model.Column>()
    //.origin((d) => d)
    .on('dragstart', function () {
      (<any>d3.event).sourceEvent.stopPropagation();
      d3.select(this).classed('dragging', true);
    })
    .on('drag', function (d) {
      //the new width
      var newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
      d.setWidth(newValue);
      (<any>d3.event).sourceEvent.stopPropagation();
    })
    .on('dragend', function () {
      d3.select(this).classed('dragging', false);
      (<any>d3.event).sourceEvent.stopPropagation();
    });


  constructor(private data:provider.DataProvider,parent:Element, options:any = {}) {
    utils.merge(this.options, options);

    this.$node = d3.select(parent).append('div').classed('lu-header',true);

    data.on('dirty.header', this.update.bind(this));
    this.update();
  }

  update() {

    var rankings = this.data.getRankings();
    var shifts =[], offset = 0;
    rankings.forEach((ranking) => {
      offset += ranking.flatten(shifts, offset, 1, this.options.columnPadding) + this.options.slopeWidth;
    });
    //real width
    offset -= this.options.slopeWidth;

    var columns = shifts.map((d) => d.col);
    if (columns.some((c) => c instanceof model.StackColumn && !c.collapsed)) {
      //we have a second level
      this.$node.style('height', this.options.headerHeight*2 + 'px');
    } else {
      this.$node.style('height', this.options.headerHeight + 'px');
    }
    this.renderColumns(columns, shifts);
  }

  private createToolbar($node: d3.Selection<model.Column>) {
    $node.append('i').attr('class', 'fa fa-times').on('click', (d) => {
      d.removeMe();
    });
  }

  private renderColumns(columns: model.Column[], shifts, $base: d3.Selection<any> = this.$node, clazz: string = 'header') {

    var provider = this.data;
    var $headers = $base.selectAll('div.'+clazz).data(columns, (d) => d.id);
    var $headers_enter = $headers.enter().append('div').attr({
      'class': clazz,
      'draggable': true,
    }).on('dragstart', (d) => {
      var e = <DragEvent>(<any>d3.event);
      e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
      e.dataTransfer.setData('text/plain', d.label);
      e.dataTransfer.setData('application/caleydo-lineup-column-ref', d.id);
      e.dataTransfer.setData('application/caleydo-lineup-column', JSON.stringify(provider.toDescRef(d.desc)));
    }).on('click', (d) => {
      d.toggleMySorting();
    }).style({
      'background-color': (d) => d.color
    });
    $headers_enter.append('i').attr('class', 'fa fa sort_indicator');
    $headers_enter.append('span').classed('label',true).text((d) => d.label);
    $headers_enter.append('div').classed('handle',true)
      .call(this.dragHandler)
      .style('width',this.options.columnPadding+'px')
      .call(utils.dropAble(['application/caleydo-lineup-column-ref','application/caleydo-lineup-column'], (data, d: model.Column, copy) => {
        var col: model.Column = null;
        if ('application/caleydo-lineup-column-ref' in data) {
          var id = data['application/caleydo-lineup-column-ref'];
          col = provider.find(id);
          if (copy) {
            col = provider.clone(col);
          } else {
            col.removeMe();
          }
        } else {
          var desc = JSON.parse(data['application/caleydo-lineup-column']);
          col = provider.create(provider.fromDescRef(desc));
        }
        return d.insertAfterMe(col);
      }));
    $headers_enter.append('div').classed('toolbar', true).call(this.createToolbar.bind(this));

    $headers.style({
      width: (d, i) => (shifts[i].width+this.options.columnPadding)+'px',
      left: (d, i) => shifts[i].offset+'px'
    });
    $headers.select('i.sort_indicator').attr('class', (d) => {
      var r = d.findMyRanker();
      if (r && r.sortCriteria().col === d) {
        return 'sort_indicator fa fa-sort-'+(r.sortCriteria().asc ? 'asc' : 'desc');
      }
      return 'sort_indicator fa'
    });

    var that = this;
    $headers.filter((d) => d instanceof model.StackColumn && !d.collapsed).each(function (col : model.StackColumn) {
      var s_shifts = [];
      col.flatten(s_shifts, 0, 1, that.options.columnPadding);

      var s_columns = s_shifts.map((d) => d.col);
      that.renderColumns(s_columns, s_shifts, d3.select(this), clazz+'_i');
    });

    $headers.exit().remove();
  }
}


export class BodyRenderer {
  private mouseOverItem:(dataIndex:number, hover:boolean) => void;
  private options = {
    rowHeight: 20,
    rowSep: 1,
    idPrefix: '',
    slopeWidth: 200,
    columnPadding : 5,
    showStacked: true,
    animated: 0, //200

    renderers: renderer.renderers()

  };

  private $node: d3.Selection<any>;

  constructor(private data:provider.DataProvider, parent: Element, private argsortGetter:(ranking:model.RankColumn) => number[], options = {}) {
    //merge options
    utils.merge(this.options, options);

    this.$node = d3.select(parent).append('svg').classed('lu-body',true);

    data.on('dirty.body', this.update.bind(this));
    //data.on('removeColumn.body', this.update.bind(this));
  }

  createContext(rankings:model.RankColumn[]):renderer.IRenderContext {
    var data = this.data,
      options = this.options;
    return {
      rowKey: this.data.rowKey,
      cellY(index:number) {
        return index * (options.rowHeight+options.rowSep);
      },
      cellX(index:number) {
        return 0;
      },
      rowHeight(index:number) {
        return options.rowHeight;
      },
      renderer(col:model.Column) {
        if (col instanceof model.StackColumn && col.collapsed) {
          return options.renderers.number;
        }
        var l = options.renderers[col.desc.type];
        return l || renderer.defaultRenderer();
      },
      showStacked(col:model.StackColumn) {
        return options.showStacked;
      },
      idPrefix: options.idPrefix,

      animated: ($sel: d3.Selection<any>) => options.animated > 0 ? $sel.transition().duration(options.animated) : $sel
    }
  }

  updateClipPathsImpl(r:model.Column[],context:renderer.IRenderContext) {
    var $base = this.$node.select('defs.body');
    if ($base.empty()) {
      $base = this.$node.append('defs').classed('body',true);
    }

    //generate clip paths for the text columns to avoid text overflow
    //see http://stackoverflow.com/questions/11742812/cannot-select-svg-foreignobject-element-in-d3
    //there is a bug in webkit which present camelCase selectors
    var textClipPath = $base.selectAll(function () {
      return this.getElementsByTagName('clipPath');
    }).data(r, (d) => d.id);
    textClipPath.enter().append('clipPath')
      .attr('id', (d) => context.idPrefix+'clipCol'+d.id)
      .append('rect').attr({
        y: 0,
        height: 1000
      });
    textClipPath.exit().remove();
    textClipPath.select('rect')
      .attr({
        x: 0, //(d,i) => offsets[i],
        width: (d) => Math.max(d.getWidth() - 5, 0)
      });
  }

  updateClipPaths(rankings:model.RankColumn[], context:renderer.IRenderContext) {
    var shifts = [], offset = 0;
    rankings.forEach((r) => {
      var w = r.flatten(shifts, offset, 2, this.options.columnPadding);
      offset += w + this.options.slopeWidth;
    });
    this.updateClipPathsImpl(shifts.map(s => s.col), context);
  }

  renderRankings($body: d3.Selection<any>, r:model.RankColumn[], shifts:any[], context:renderer.IRenderContext) {
    var data = this.data;
    var dataPromises = r.map((ranking) => this.data.view(this.argsortGetter(ranking)));

    var $rankings = $body.selectAll('g.ranking').data(r, (d) => d.id);
    var $rankings_enter = $rankings.enter().append('g').attr({
      'class': 'ranking'
    });
    $rankings_enter.append('g').attr('class', 'rows');
    $rankings_enter.append('g').attr('class', 'cols');

    context.animated($rankings).attr({
      transform: (d, i) => 'translate(' + shifts[i].shift + ',0)'
    });

    var $cols = $rankings.select('g.cols').selectAll('g.child').data((d) => [<model.Column>d].concat(d.children), (d) => d.id);
    $cols.enter().append('g').attr({
      'class': 'child'
    });
    context.animated($cols).attr({
      'data-index': (d, i) => i,
    });
    context.animated($cols).attr({
      transform: (d, i, j?) => {
        return 'translate(' + shifts[j].shifts[i] + ',0)'
      }
    }).each(function (d, i, j?) {
      dataPromises[j].then((data) => {
        context.renderer(d).render(d3.select(this), d, data, context);
      })
    });
    $cols.exit().remove();

    function mouseOverRow($row:d3.Selection<number>, $cols:d3.Selection<model.RankColumn>, index:number, ranking:model.RankColumn, rankingIndex:number) {
      $row.classed('hover', true);
      var children = $cols.selectAll('g.child').data();
      var $value_cols = $row.select('g.values').selectAll('g.child').data(children);
      $value_cols.enter().append('g').attr({
        'class': 'child'
      });
      $value_cols.attr({
        transform: (d, i) => {
          return 'translate(' + shifts[rankingIndex].shifts[i] + ',0)'
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

    var $rows = $rankings.select('g.rows').selectAll('g.row').data((d) => this.argsortGetter(d).map((d, i) => ({
      d: d,
      i: i
    })));
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
    });
    $rows.attr({
      'data-index': (d) => d.d,
    });
    context.animated($rows).select('rect').attr({
      y: (data_index) => context.cellY(data_index.i),
      height: (data_index) => context.rowHeight(data_index.i),
      width: (d, i, j?) => shifts[j].width
    });
    $rows.exit().remove();

    $rankings.exit().remove();
  }

  mouseOver(dataIndex:number, hover = true) {
    this.mouseOverItem(dataIndex, hover);
    //update the slope graph
    this.$node.selectAll('line.slope[data-index="' + dataIndex + '"').classed('hover', hover);
  }

  renderSlopeGraphs($body: d3.Selection<any>, rankings:model.RankColumn[], shifts:any[], context:renderer.IRenderContext) {

    var slopes = rankings.slice(1).map((d, i) => ({left: rankings[i], right: d}));
    var $slopes = $body.selectAll('g.slopegraph').data(slopes);
    $slopes.enter().append('g').attr({
      'class': 'slopegraph'
    });
    context.animated($slopes).attr({
      transform: (d, i) => 'translate(' + (shifts[i + 1].shift - this.options.slopeWidth) + ',0)'
    });
    var $lines = $slopes.selectAll('line.slope').data((d) => {
      var cache = {};
      this.argsortGetter(d.right).forEach((data_index, pos) => {
        cache[data_index] = pos
      });
      return this.argsortGetter(d.left).map((data_index, pos) => ({
        data_index: data_index,
        lpos: pos,
        rpos: cache[data_index]
      }));
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
    context.animated($lines).attr({
      y1: (d:any) => context.rowHeight(d.lpos) * 0.5 + context.cellY(d.lpos),
      y2: (d:any) => context.rowHeight(d.rpos) * 0.5 + context.cellY(d.rpos),
    });
    $lines.exit().remove();
    $slopes.exit().remove();
  }

  /**
   * render the body
   */
  update() {
    var r = this.data.getRankings();
    var context = this.createContext(r);

    this.updateClipPaths(r, context);

    //compute offsets and shifts for individual rankings and columns inside the rankings
    var offset = 0,
      shifts = r.map((d, i) => {
        var r = offset;
        offset += this.options.slopeWidth;
        var o2 = 0,
          shift2 = [<model.Column>d].concat(d.children).map((o) => {
            var r = o2;
            o2 += o.getWidth() + this.options.columnPadding;
            if (o instanceof model.StackColumn && !o.collapsed) {
              o2 += this.options.columnPadding * (o.length -1);
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
      $body = this.$node.append('g').classed('body',true);
    }
    this.renderRankings($body, r, shifts, context);
    this.renderSlopeGraphs($body, r, shifts, context);
  }
}

export class LineUpRenderer {
  private body : BodyRenderer = null;
  private header : HeaderRenderer = null;
  private pool: PoolRenderer = null;

  private options = {
    pool: true
  };

  constructor(root: Element, data: provider.DataProvider, columns: provider.IColumnDesc[], argsortGetter:(ranking:model.RankColumn) => number[], options : any = {}) {
    utils.merge(this.options, options);
    this.header = new HeaderRenderer(data,  root, options);
    this.body = new BodyRenderer(data, root, argsortGetter, options);
    if(this.options.pool) {
      this.pool = new PoolRenderer(data, columns, root, options);
    }
  }

  update() {
    this.header.update();
    this.body.update();
    if (this.pool) {
      this.pool.update();
    }
  }
}