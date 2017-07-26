/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as d3 from 'd3';
import {attr, forEach, matchColumns} from '../utils';
import {IStatistics} from '../model/Column';
import DataProvider, {IDataRow} from '../provider/ADataProvider';
import {IDOMRenderContext} from '../renderer/RendererContexts';
import {createDOM} from '../renderer';
import ABodyRenderer, {
  ISlicer,
  IRankingColumnData,
  IRankingData,
  IBodyRenderContext,
  ERenderReason
} from './ABodyRenderer';

export default class DOMBodyRenderer extends ABodyRenderer {

  protected currentFreezeLeft = 0;

  constructor(data: DataProvider, parent: Element, slicer: ISlicer, options = {}) {
    super(data, parent, slicer, 'div', options);
  }

  protected animated<T>($rows: d3.Selection<T>): d3.Selection<T> {
    if (this.options.animationDuration > 0 && this.options.animation) {
      return <any>$rows.transition().duration(this.options.animationDuration);
    }
    return $rows;
  }

  private renderRankings($body: d3.Selection<any>, data: IRankingData[], context: IBodyRenderContext & IDOMRenderContext, height: number): Promise<any> {
    const that = this;

    const $rankings = $body.selectAll('div.ranking').data(data, (d) => d.id);
    const $rankingsEnter = $rankings.enter().append('div')
      .attr('class', 'ranking')
      .style('left', (d) => `${d.shift}px`);
    $rankingsEnter.append('div').attr('class', 'rows');
    $rankingsEnter.append('div').attr('class', 'meanlines');

    //animated shift
    this.animated($rankings)
      .style('left', (d) => `${d.shift}px`);


    const toWait: (Promise<any>|void)[] = [];
    {
      const $rows = $rankings.select('div.rows').selectAll('div.row').data((d) => d.order, String);
      const $rowsEnter = $rows.enter().append('div').attr('class', 'row');
      $rowsEnter.style('top', (d, i) => `${context.cellPrevY(i)}px`);

      $rowsEnter
        .on('mouseenter', (d) => this.mouseOver(d, true))
        .on('mouseleave', (d) => this.mouseOver(d, false))
        .on('click', (d) => this.select(d, (<MouseEvent>d3.event).ctrlKey));

      //create templates
      const createTemplates = (node: HTMLElement | SVGGElement, columns: IRankingColumnData[]) => {
        matchColumns(node, columns);
      };


      $rowsEnter.append('div').attr('class', 'frozen').style('transform', `translate${this.currentFreezeLeft}px,0)`).each(function (d, i, j) {
        createTemplates(this, data[j].frozen);
      });
      $rowsEnter.append('div').attr('class', 'cols').each(function (d, i, j) {
        createTemplates(this, data[j].columns);
      });

      $rows.each(function (this: HTMLElement | SVGGElement, d: number, i: number) {
        const selected = that.data.isSelected(d);
        attr(this, {
          'class': `row${i % 2 === 0 ? ' even' : ''}${selected ? ' selected' : ''}`,
          'data-data-index': d
        });
      });

      //animated reordering
      this.animated($rows).style('top', (d, i) => `${context.cellY(i)}px`);

      const updateColumns = (node: SVGGElement | HTMLElement, r: IRankingData, i: number, columns: IRankingColumnData[]) => {
        //update nodes and create templates
        const updateRow = (row: IDataRow) => {
          matchColumns(node, columns);
          columns.forEach((col, ci) => {
            const cnode: any = node.childNodes[ci];
            // use the shift if possible since it considers more cornercases
            cnode.style.width = `${ci < columns.length - 2 ? (columns[ci + 1].shift - col.shift) : col.column.getActualWidth()}px`;
            col.renderer.update(cnode, row, i);
          });
        };
        const d = r.data[i];
        if (d instanceof Promise) {
          return d.then(updateRow);
        }
        return updateRow(d);
      };
      //update columns

      //order for frozen in html + set the size in html to have a proper background instead of a clip-path
      const maxFrozen = data.length === 0 || data[0].frozen.length === 0 ? 0 : (d3.max(data[0].frozen, (f) => f.shift + f.column.getWidth()) + that.options.columnPadding);

      $rows.select('div.frozen').each(function (d, i, j) {
        this.style.width = `${maxFrozen}px`;
        toWait.push(updateColumns(this, data[j], i, data[j].frozen));
      });
      $rows.select('div.cols').each(function (d, i, j) {
        this.style.marginLeft = `${maxFrozen}px`;
        toWait.push(updateColumns(this, data[j], i, data[j].columns));
      });
      $rows.exit().remove();
    }

    {
      const $meanlines = $rankings.select('div.meanlines').selectAll('div.meanline').data((d) => d.columns.filter((c) => this.showMeanLine(c.column)));
      $meanlines.enter().append('div').attr('class', 'meanline');
      $meanlines.each(function (d) {
        const h = that.histCache.get(d.column.id);
        const $mean = d3.select(this);
        if (!h) {
          return;
        }
        const render = (stats: IStatistics) => {
          const xPos = d.shift + d.column.getWidth() * stats.mean;
          $mean.style('left', `${isNaN(xPos) ? 0 : xPos}px`).style('height', `${height}px`);
        };
        if (h instanceof Promise) {
          h.then(render);
        } else {
          render(<IStatistics>h);
        }
      });
      $meanlines.exit().remove();
    }

    $rankings.exit().remove();

    return Promise.all(toWait);
  }

  select(dataIndex: number, additional = false) {
    const selected = super.select(dataIndex, additional);
    this.$node.selectAll(`[data-data-index="${dataIndex}"]`).classed('selected', selected);
    return selected;
  }

  drawSelection() {
    const indices = this.data.getSelection();

    forEach(this.node, '.selected', (d) => d.classList.remove('selected'));
    if (indices.length === 0) {
      return;
    }
    const q = indices.map((d) => `[data-data-index='${d}']`).join(',');
    forEach(this.node, q, (d) => d.classList.add('selected'));
  }

  mouseOver(dataIndex: number, hover = true) {
    super.mouseOver(dataIndex, hover);

    function setClass(item: Element) {
      item.classList.add('hover');
    }

    forEach(this.node, '.hover', (d) => d.classList.remove('hover'));
    if (hover) {
      forEach(this.node, `[data-data-index='${dataIndex}']`, setClass);
    }
  }

  renderSlopeGraphs($parent: d3.Selection<any>, data: IRankingData[], context: IBodyRenderContext & IDOMRenderContext, height: number) {
    const slopes = data.slice(1).map((d, i) => ({left: data[i].order, left_i: i, right: d.order, right_i: i + 1}));

    const $slopes = $parent.selectAll('svg.slopegraph').data(slopes);
    $slopes.enter().append('svg').attr('class', 'slopegraph');
    $slopes.attr('width', this.options.slopeWidth)
      .attr('height', height)
      .style('left', (d, i) => `${data[i + 1].shift - this.options.slopeWidth}px`);

    const $lines = $slopes.selectAll('line.slope').data((d) => {
      const cache = new Map<number, number>();
      d.right.forEach((dataIndex, pos) => cache.set(dataIndex, pos));
      return d.left.map((dataIndex, pos) => ({
        dataIndex,
        lpos: pos,
        rpos: cache.get(dataIndex)
      })).filter((d) => d.rpos != null);
    });
    $lines.enter().append('line').attr({
      'class': 'slope',
      x2: this.options.slopeWidth
    }).on('mouseenter', (d) => this.mouseOver(d.dataIndex, true))
      .on('mouseleave', (d) => this.mouseOver(d.dataIndex, false));
    $lines.attr('data-data-index', (d) => d.dataIndex);
    $lines.attr({
      y1: (d: any) => context.rowHeight(d.lpos) * 0.5 + context.cellY(d.lpos),
      y2: (d: any) => context.rowHeight(d.rpos) * 0.5 + context.cellY(d.rpos)
    });
    $lines.exit().remove();

    $slopes.exit().remove();
  }

  updateFreeze(left: number) {
    forEach(this.node, 'div.row .frozen', (row: HTMLElement) => {
      row.style.transform = `translate(${left}px,${0}px)`;
    });
    this.currentFreezeLeft = left;
  }

  protected createContextImpl(indexShift: number): IBodyRenderContext {
    return this.createContext(indexShift, createDOM);
  }

  protected updateImpl(data: IRankingData[], context: IBodyRenderContext, width: number, height: number, reason: ERenderReason) {
    // - ... added one to often
    this.node.style.width = `${Math.max(0, width)}px`;
    this.node.style.height = `${Math.max(0, height)}px`;

    let $body = this.$node.select('div.body');
    if ($body.empty()) {
      $body = this.$node.append('div').classed('body', true);
    }

    this.renderSlopeGraphs($body, data, context, height);
    return this.renderRankings($body, data, context, height);
  }
}
