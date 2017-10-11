/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as d3 from 'd3';
import {attr, forEach, matchColumns} from '../utils';
import {IStatistics} from '../model/Column';
import DataProvider, {IDataRow} from '../provider/ADataProvider';
import {IDOMRenderContext} from '../renderer/RendererContexts';
import {createDOM, createDOMGroup} from '../renderer';
import ABodyRenderer, {
  IBodyRenderContext,
  IGroupedRangkingData,
  IRankingColumnData,
  IRankingData,
  ISlicer
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

  private renderRankings($body: d3.Selection<any>, data: IRankingData[], context: IBodyRenderContext & IDOMRenderContext): Promise<any> {
    const that = this;

    const $rankings = $body.selectAll('div.ranking').data(data, (d) => d.id);
    $rankings.enter().append('div')
      .attr('class', 'ranking')
      .style('left', (d) => `${d.shift}px`);

    //animated shift
    this.animated($rankings)
      .style('left', (d) => `${d.shift}px`);


    const toWait: (Promise<any> | void)[] = [];

    const $groups = $rankings.selectAll('div.group').data((d) => d.groups, (d) => d.group.name);
    const $groupsEnter = $groups.enter().append('div').attr('class', 'group');
    const $aggregateEnter = $groupsEnter.append('div').attr('class', 'aggregate').attr('data-agg', 'group');
    $aggregateEnter.append('div').attr('class', 'cols');
    $aggregateEnter.append('div').attr('class', 'frozen').style('transform', `translate${this.currentFreezeLeft}px,0)`);

    $groupsEnter.append('div').attr('class', 'rows').attr('data-agg', 'detail');
    $groupsEnter.append('div').attr('class', 'meanlines');
    $groupsEnter.style('top', (d: IGroupedRangkingData) => `${d.y}px`);

    const renderDetail = ($this: d3.Selection<IGroupedRangkingData>, ranking: IRankingData, group: IGroupedRangkingData) => {
      $this.selectAll('div.aggregate .cols > *, div.aggregate .frozen > *').remove();
      $this.select('div.aggregate').style('height', <any>null); //reset height

      const $rows = $this.select('div.rows').selectAll('div.row').data(group.order, String);
      const $rowsEnter = $rows.enter().append('div').attr('class', 'row');
      $rowsEnter.style('top', (_d, i) => `${context.cellPrevY(i)}px`);

      $rowsEnter
        .on('mouseenter', (d) => this.mouseOver(d, true))
        .on('mouseleave', (d) => this.mouseOver(d, false))
        .on('click', (d) => this.select(d, (<MouseEvent>d3.event).ctrlKey));

      //create templates
      const createTemplates = (node: HTMLElement | SVGGElement, columns: IRankingColumnData[]) => {
        matchColumns(node, columns, 'detail');
      };

      $rowsEnter.append('div').attr('class', 'frozen').style('transform', `translate${this.currentFreezeLeft}px,0)`).each(function (this: HTMLElement) {
        createTemplates(this, ranking.frozen);
      });
      $rowsEnter.append('div').attr('class', 'cols').each(function (this: HTMLElement) {
        createTemplates(this, ranking.columns);
      });

      $rows.each(function (this: HTMLElement | SVGGElement, d: number, i: number) {
        const selected = that.data.isSelected(d);
        attr(this, {
          'class': `row${i % 2 === 0 ? ' even' : ''}${selected ? ' selected' : ''}`,
          'data-data-index': d
        });
      });

      //animated reordering
      this.animated($rows)
        .style('top', (_d, i) => `${context.cellY(i)}px`)
        .style('height', `${this.options.rowHeight}px`);

      const updateColumns = (node: HTMLElement, r: IGroupedRangkingData, i: number, columns: IRankingColumnData[]) => {
        //update nodes and create templates
        const updateRow = (row: IDataRow) => {
          matchColumns(node, columns, 'detail');
          columns.forEach((col, ci) => {
            const cnode: any = node.childNodes[ci];
            // use the shift if possible since it considers more cornercases
            cnode.style.width = `${ci < columns.length - 2 ? (columns[ci + 1].shift - col.shift) : col.column.getWidth()}px`;
            col.renderer.update(cnode, row, i, group.group);
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

      $rows.select('div.cols').each(function (this: HTMLElement, _d, i) {
        this.style.marginLeft = `${maxFrozen}px`;
        toWait.push(updateColumns(this, group, i, ranking.columns));
      });
      $rows.select('div.frozen').each(function (this: HTMLElement, _d, i) {
        this.style.width = `${maxFrozen}px`;
        toWait.push(updateColumns(this, group, i, ranking.frozen));
      });
      $rows.exit().remove();

      {
        const $meanlines = $groups.select('div.meanlines').selectAll('div.meanline').data(ranking.columns.filter((c) => this.showMeanLine(c.column)));
        $meanlines.enter().append('div').attr('class', 'meanline');
        $meanlines.each(function (this: HTMLElement, d) {
          const h = that.histCache.get(d.column.id);
          const $mean = d3.select(this);
          if (!h) {
            return;
          }
          const render = (stats: IStatistics) => {
            const xPos = d.shift + d.column.getWidth() * stats.mean;
            $mean.style('left', `${isNaN(xPos) ? 0 : xPos}px`).style('height', `${group.height}px`);
          };
          if (h instanceof Promise) {
            h.then(render);
          } else {
            render(<IStatistics>h);
          }
        });
        $meanlines.exit().remove();
      }
    };

    const renderAggregate = ($this: d3.Selection<IGroupedRangkingData>, ranking: IRankingData, group: IGroupedRangkingData) => {
      $this.selectAll('div.rows > *, div.meanlines > *').remove();

      const $base = $this.select('div.aggregate').style('height', `${group.height}px`);

      const updateColumns = (node: HTMLElement, r: IGroupedRangkingData, columns: IRankingColumnData[]) => {
        matchColumns(node, columns, 'group');
        return Promise.all(r.data).then((rows) => {
          return Promise.all(columns.map((col, ci) => {
            return Promise.resolve(this.histCache.get(col.column.id)!).then((hist) => {
              const cnode: any = node.childNodes[ci];
              cnode.style.width = `${ci < columns.length - 2 ? (columns[ci + 1].shift - col.shift) : col.column.getWidth()}px`;
              col.groupRenderer.update(cnode, r.group, rows, hist);
            });
          }));
        });
      };
      //update columns

      //order for frozen in html + set the size in html to have a proper background instead of a clip-path
      const maxFrozen = data.length === 0 || data[0].frozen.length === 0 ? 0 : d3.max(data[0].frozen, (f) => f.shift + f.column.getWidth());
      $base.select('div.cols').each(function (this: HTMLElement) {
        this.style.marginLeft = `${maxFrozen}px`;
        toWait.push(updateColumns(this, group, ranking.columns));
      });
      $base.select('div.frozen').each(function (this: HTMLElement) {
        this.style.width = `${maxFrozen}px`;
        toWait.push(updateColumns(this, group, ranking.frozen));
      });
    };

    $groups.each(function (this: HTMLElement, group: IGroupedRangkingData, _j, k) {
      const f = group.aggregate ? renderAggregate : renderDetail;
      f(d3.select(this), data[k], group);
    });

    //animated reordering
    this.animated($groups).style('top', (d) => `${d.y}px`);
    $groups.exit().remove();

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
    const slopes = data.slice(1).map((d, i) => ({
      left: data[i].groups[0].order,
      left_i: i,
      right: d.groups[0].order,
      right_i: i + 1
    }));

    const $slopes = $parent.selectAll('svg.slopegraph').data(slopes);
    $slopes.enter().append('svg').attr('class', 'slopegraph');
    $slopes.attr('width', this.options.slopeWidth)
      .attr('height', height)
      .style('left', (_d, i) => `${data[i + 1].shift - this.options.slopeWidth}px`);

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
    const pos = (index: number) => {
      const act = context.cellY(index);
      const next = context.cellY(index + 1);
      return act + (next - act) * 0.5;
    };
    $lines.attr({
      y1: (d: any) => pos(d.lpos),
      y2: (d: any) => pos(d.rpos)
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

  protected createContextImpl(indexShift: number, totalNumberOfRows: number): IBodyRenderContext {
    return this.createContext(indexShift, totalNumberOfRows, createDOM, createDOMGroup);
  }

  protected updateImpl(data: IRankingData[], context: IBodyRenderContext, width: number, height: number) {
    // - ... added one to often
    this.node.style.width = `${Math.max(0, width)}px`;
    this.node.style.height = `${Math.max(0, height)}px`;

    let $body = this.$node.select('div.body');
    if ($body.empty()) {
      $body = this.$node.append('div').classed('body', true);
    }

    this.renderSlopeGraphs($body, data, context, height);
    return this.renderRankings($body, data, context);
  }
}
