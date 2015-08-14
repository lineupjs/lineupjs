/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import model = require('./model');
import provider = require('./provider');
import utils = require('./utils');

export class LineUpBody {
  private mouseOverItem:(dataIndex:number, hover:boolean) => void;
  private options = {
    rowHeight: 20,
    rowSep: 1,
    idPrefix: '',
    slopeWidth: 200,
    columnPadding : 1,
    showStacked: true,
    animated: 0, //200
    headerHeight: 50
  };

  private dragHandler : d3.behavior.Drag<{ col: model.Column; offset: number }>;

  constructor(private $root:d3.Selection<any>, private data:provider.DataProvider, private argsortGetter:(ranking:model.RankColumn) => number[], options = {}) {
    //merge options
    utils.merge(this.options, options);

    this.dragHandler = this.initDragging();
  }

  private initDragging() {
    return d3.behavior.drag<{ col: model.Column; offset: number }>()
      //.origin((d) => d)
      .on('dragstart', function () {
        (<any>d3.event).sourceEvent.stopPropagation();
        d3.select(this).classed('dragging', true);
      })
      .on('drag', function (d) {
        //the new width
        var newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
        d.col.setWidth(newValue);
      })
      .on('dragend', function () {
        d3.select(this).classed('dragging', false);
      });
  }

  createContext(rankings:model.RankColumn[]):model.IRenderContext {
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
        //if a child of a stackcolumn is another stackcolumn render as bar
        if (col instanceof model.StackColumn && col.parent instanceof model.StackColumn) {
          return data.columnTypes.number.renderer;
        }
        var l = data.columnTypes[col.desc.type].renderer;

      },
      showStacked(col:model.StackColumn) {
        return options.showStacked;
      },
      idPrefix: options.idPrefix,

      animated: ($sel: d3.Selection<any>) => options.animated > 0 ? $sel.transition().duration(options.animated) : $sel
    }
  }

  updateClipPathsImpl(r:model.Column[],context:model.IRenderContext) {
    var $base = this.$root.select('defs.body');
    if ($base.empty()) {
      $base = this.$root.append('defs').classed('body',true);
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

  updateClipPaths(rankings:model.RankColumn[], context:model.IRenderContext) {
    var shifts = [], offset = 0;
    rankings.forEach((r) => {
      var w = r.flatten(shifts, offset, 2, this.options.columnPadding);
      offset += w + this.options.slopeWidth;
    });
    this.updateClipPathsImpl(shifts.map(s => s.col), context);
  }

  renderRankings($body: d3.Selection<any>, r:model.RankColumn[], shifts:any[], context:model.IRenderContext) {
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
      var $value_cols = $row.select('g.values').selectAll('g.child').data([<model.Column>ranking].concat(ranking.children));
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
    this.$root.selectAll('line.slope[data-index="' + dataIndex + '"').classed('hover', hover);
  }

  renderSlopeGraphs($body: d3.Selection<any>, rankings:model.RankColumn[], shifts:any[], context:model.IRenderContext) {

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
  render() {
    var r = this.data.getRankings();
    var context = this.createContext(r);

    this.updateClipPaths(r, context);

    this.renderHeader(r, context);

    //compute offsets and shifts for individual rankings and columns inside the rankings
    var offset = 0,
      shifts = r.map((d, i) => {
        var r = offset;
        offset += this.options.slopeWidth;
        var o2 = 0,
          shift2 = [<model.Column>d].concat(d.children).map((o) => {
            var r = o2;
            o2 += o.getWidth() + this.options.columnPadding;
            return r;
          });
        offset += o2;
        return {
          shift: r,
          shifts: shift2,
          width: o2
        };
      });

    var $body = this.$root.select('g.body');
    if ($body.empty()) {
      $body = this.$root.append('g').classed('body',true);
    }
    $body.attr('transform','translate(0,'+this.options.headerHeight+')');
    this.renderRankings($body, r, shifts, context);
    this.renderSlopeGraphs($body, r, shifts, context);
  }

  renderHeader(rankings: model.RankColumn[], context: model.IRenderContext) {
    var shifts =[], offset = 0;
    rankings.forEach((ranking) => {
      offset += ranking.flatten(shifts, offset, 2, this.options.columnPadding) + this.options.slopeWidth;
    });
    //real width
    offset -= this.options.slopeWidth;

    //check if we have any stacked
    var hasStacked = shifts.some((d) => !(d.col.parent instanceof model.RankColumn));

    var $headers = this.$root.selectAll('g.header').data(shifts, (d) => d.col.id);
    var $headers_enter = $headers.enter().append('g').attr({
      'class': 'header'
    });
    $headers_enter.append('rect').attr({
      'class': 'header_bg',
      height: this.options.headerHeight
    }).on('click', (d) => {
      d.col.toggleMySorting();
    });
    $headers_enter.append('text').classed('label',true).attr({
      y: 3
    });
    $headers_enter.append('title');
    $headers_enter.append('text').classed('sort_indicator', true).attr({
      y: 3,
      x: 2
    });
    $headers_enter.append('rect').classed('handle',true).attr({
      width: 5,
      height: this.options.headerHeight
    }).call(this.dragHandler);

    var $headers_update = context.animated($headers).attr({
      transform: (d) => 'translate(' + d.offset + ',0)'
    });
    $headers_update.select('rect.header_bg')
      .style('fill', (d) => d.col.color)
      .attr({
        width: (d) => d.col.getWidth()
      });
    $headers_update.select('text.label')
      .text((d) => d.col.label)
      .attr({
        x: (d) => d.col.getWidth()/2
      });
    $headers_update.select('title').text((d) => d.col.label);
    $headers_update.select('text.sort_indicator').text((d) => {
      var r = d.col.findMyRanker();
      if (r && r.sortCriteria().col === d.col) {
        return r.sortCriteria().asc ? '\uf0de' : '\uf0dd';
      }
      return ''
    });
    $headers_update.select('rect.handle').attr({
      x: (d) => d.col.getWidth() - 5
    });
    $headers.exit().remove();
  }
}