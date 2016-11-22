/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as d3 from 'd3';
import {forEach} from '../utils';
import Column, {IStatistics} from '../model/Column';
import {matchColumns, IDOMCellRenderer, ICellRendererFactory} from '../renderer';
import DataProvider from '../provider/ADataProvider';
import {IDOMRenderContext} from '../renderer';
import ABodyRenderer, {
  ISlicer,
  IRankingColumnData,
  IRankingData,
  IBodyRenderContext,
  ERenderReason
} from './ABodyRenderer';

export interface IDOMMapping {
  root: string;
  g: string;

  setSize(n: HTMLElement, width: number, height: number);

  translate(n: SVGElement | HTMLElement, x: number, y: number);
  transform<T>(sel: d3.Selection<T>, callback: (d: T, i: number) => [number,number]);
  creator(col: Column, renderers: {[key: string]: ICellRendererFactory}, context: IDOMRenderContext): IDOMCellRenderer<SVGElement | HTMLElement>;

  bg: string;
  updateBG(sel: d3.Selection<any>, callback: (d: any, i: number, j: number) => [number, number]);

  meanLine: string;
  updateMeanLine($mean: d3.Selection<any>, x: number, height: number);

  slopes: string;
  updateSlopes($slopes: d3.Selection<any>, width: number, height: number, callback: (d, i) => number);
}

abstract class ABodyDOMRenderer extends ABodyRenderer {

  protected currentFreezeLeft = 0;

  constructor(data: DataProvider, parent: Element, slicer: ISlicer, private domMapping: IDOMMapping, options = {}) {
    super(data, parent, slicer, domMapping.root, options);
  }

  protected animated<T>($rows: d3.Selection<T>): d3.Selection<T> {
    if (this.options.animationDuration > 0 && this.options.animation) {
      return <any>$rows.transition().duration(this.options.animationDuration);
    }
    return $rows;
  }

  renderRankings($body: d3.Selection<any>, data: IRankingData[], context: IBodyRenderContext&IDOMRenderContext, height: number): Promise<void> {
    const that = this;
    const domMapping = this.domMapping;
    const g = this.domMapping.g;

    const $rankings = $body.selectAll(g + '.ranking').data(data, (d) => d.id);
    const $rankings_enter = $rankings.enter().append(g)
      .attr('class', 'ranking')
      .call(domMapping.transform, (d) => [d.shift, 0]);
    $rankings_enter.append(g).attr('class', 'rows');
    $rankings_enter.append(g).attr('class', 'meanlines').attr('clip-path', `url(#c${this.options.idPrefix}Freeze)`);

    //animated shift
    this.animated($rankings).call(domMapping.transform, (d, i) => [d.shift, 0]);


    const toWait: Promise<any>[] = [];
    {
      let $rows = $rankings.select(g + '.rows').selectAll(g + '.row').data((d) => d.order, String);
      let $rows_enter = $rows.enter().append(g).attr('class', 'row');
      $rows_enter.call(domMapping.transform, (d, i) => [0, context.cellPrevY(i)]);

      $rows_enter.append(domMapping.bg).attr('class', 'bg');
      $rows_enter
        .on('mouseenter', (d) => this.mouseOver(d, true))
        .on('mouseleave', (d) => this.mouseOver(d, false))
        .on('click', (d) => this.select(d, (<MouseEvent>d3.event).ctrlKey));

      //create templates
      const createTemplates = (node: HTMLElement|SVGGElement, columns: IRankingColumnData[]) => {
        matchColumns(node, columns);
        //set transform
        columns.forEach((col, ci) => {
          const cnode: any = node.childNodes[ci];
          domMapping.translate(cnode, col.shift, 0);
        });
      };

      $rows_enter.append(g).attr('class', 'cols').attr('clip-path', `url(#c${this.options.idPrefix}Freeze)`).each(function (d, i, j) {
        createTemplates(this, data[j].columns);
      });

      $rows_enter.append(g).attr('class', 'frozen').call(this.domMapping.transform, () => [this.currentFreezeLeft, 0]).each(function (d, i, j) {
        createTemplates(this, data[j].frozen);
      });

      $rows
        .attr('class', (d, i) => 'row ' + (i % 2 === 0 ? 'even' : ''))
        .attr('data-data-index', (d) => d)
        .classed('selected', (d) => this.data.isSelected(d));
      //.classed('highlighted', (d) => this.data.isHighlighted(d.d));

      //animated reordering
      this.animated($rows).call(domMapping.transform, (d, i) => [0, context.cellY(i)]);

      //update background helper
      $rows.select(domMapping.bg).attr('class', 'bg')
        .call(domMapping.updateBG, (d, i, j) => [data[j].width, context.rowHeight(i)]);

      const updateColumns = (node: SVGGElement | HTMLElement, r: IRankingData, i: number, columns: IRankingColumnData[]) => {
        //update nodes and create templates
        return r.data[i].then((row) => {
          matchColumns(node, columns);
          columns.forEach((col, ci) => {
            const cnode: any = node.childNodes[ci];
            domMapping.translate(cnode, col.shift, 0);
            col.renderer.update(cnode, row, i);
          });
        });
      };
      //update columns

      $rows.select(g + '.cols').each(function (d, i, j) {
        toWait.push(updateColumns(this, data[j], i, data[j].columns));
      });
      //order for frozen in html + set the size in html to have a proper background instead of a clip-path
      const maxFrozen = data.length === 0 || data[0].frozen.length === 0 ? 0 : d3.max(data[0].frozen, (f) => f.shift + f.column.getWidth());
      $rows.select(g + '.frozen').each(function (d, i, j) {
        domMapping.setSize(this, maxFrozen, that.options.rowHeight);
        toWait.push(updateColumns(this, data[j], i, data[j].frozen));
      });
      $rows.exit().remove();
    }

    {
      let $meanlines = $rankings.select(g + '.meanlines').selectAll(domMapping.meanLine + '.meanline').data((d) => d.columns.filter((c) => this.showMeanLine(c.column)));
      $meanlines.enter().append(domMapping.meanLine).attr('class', 'meanline');
      $meanlines.each(function (d, i, j) {
        const h = that.histCache.get(d.column.id);
        const $mean = d3.select(this);
        if (!h) {
          return;
        }
        h.then((stats: IStatistics) => {
          const x_pos = d.shift + d.column.getWidth() * stats.mean;
          domMapping.updateMeanLine($mean, isNaN(x_pos) ? 0 : x_pos, height);
        });
      });
      $meanlines.exit().remove();
    }

    $rankings.exit().remove();

    return Promise.all(toWait);
  }

  select(dataIndex: number, additional = false) {
    var selected = super.select(dataIndex, additional);
    this.$node.selectAll(`[data-data-index="${dataIndex}"`).classed('selected', selected);
    return selected;
  }

  drawSelection() {
    const indices = this.data.getSelection();

    forEach(this.node, '.selected', (d) => d.classList.remove('selected'));
    if (indices.length === 0) {
      return;
    } else {
      let q = indices.map((d) => `[data-data-index="${d}"]`).join(',');
      forEach(this.node, q, (d) => d.classList.add('selected'));
    }
  }

  mouseOver(dataIndex: number, hover = true) {
    super.mouseOver(dataIndex, hover);

    function setClass(item: Element) {
      item.classList.add('hover');
    }

    forEach(this.node, '.hover', (d) => d.classList.remove('hover'));
    if (hover) {
      forEach(this.node, `[data-data-index="${dataIndex}"]`, setClass);
    }
  }

  renderSlopeGraphs($parent: d3.Selection<any>, data: IRankingData[], context: IBodyRenderContext&IDOMRenderContext, height: number) {
    const slopes = data.slice(1).map((d, i) => ({left: data[i].order, left_i: i, right: d.order, right_i: i + 1}));

    const $slopes = $parent.selectAll(this.domMapping.slopes + '.slopegraph').data(slopes);
    $slopes.enter().append(this.domMapping.slopes).attr('class', 'slopegraph');
    //$slopes.attr('transform', (d, i) => `translate(${(shifts[i + 1].shift - this.options.slopeWidth)},0)`);
    $slopes.call(this.domMapping.updateSlopes, this.options.slopeWidth, height, (d, i) => ((data[i + 1].shift - this.options.slopeWidth)));

    const $lines = $slopes.selectAll('line.slope').data((d) => {
      var cache = {};
      d.right.forEach((data_index, pos) => cache[data_index] = pos);
      return d.left.map((data_index, pos) => ({
        data_index: data_index,
        lpos: pos,
        rpos: cache[data_index]
      })).filter((d) => d.rpos != null);
    });
    $lines.enter().append('line').attr({
      'class': 'slope',
      x2: this.options.slopeWidth
    }).on('mouseenter', (d) => this.mouseOver(d.data_index, true))
      .on('mouseleave', (d) => this.mouseOver(d.data_index, false));
    $lines.attr('data-data-index', (d) => d.data_index);
    $lines.attr({
      y1: (d: any) => context.rowHeight(d.lpos) * 0.5 + context.cellY(d.lpos),
      y2: (d: any) => context.rowHeight(d.rpos) * 0.5 + context.cellY(d.rpos)
    });
    $lines.exit().remove();

    $slopes.exit().remove();
  }

  updateFreeze(left: number) {
    forEach(this.node, this.domMapping.g + '.row .frozen', (row: SVGElement | HTMLElement) => {
      this.domMapping.translate(row, left, 0);
    });
    const item = <SVGElement>this.node.querySelector(`clipPath#c${this.options.idPrefix}Freeze`);
    if (item) {
      this.domMapping.translate(item, left, 0);
    }
    this.currentFreezeLeft = left;
  }

  updateClipPaths(data: IRankingData[], context: IBodyRenderContext&IDOMRenderContext, height: number) {
    //no clip paths in HTML
  }

  protected createContextImpl(index_shift: number): IBodyRenderContext {
    return this.createContext(index_shift, this.domMapping.creator);
  }

  protected updateImpl(data: IRankingData[], context: IBodyRenderContext, width: number, height: number, reason: ERenderReason) {
    // - ... added one to often
    this.domMapping.setSize(this.node, Math.max(0, width), height);

    var $body = this.$node.select(this.domMapping.g + '.body');
    if ($body.empty()) {
      $body = this.$node.append(this.domMapping.g).classed('body', true);
    }

    this.renderSlopeGraphs($body, data, context, height);
    this.updateClipPaths(data, context, height);
    return this.renderRankings($body, data, context, height);
  }
}

export default ABodyDOMRenderer;
