import ICellRendererFactory from './ICellRendererFactory';
import CategoricalColumn from '../model/CategoricalColumn';
import Column, {ICategoricalStatistics} from '../model/Column';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer, ISVGGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, clipText} from '../utils';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import * as d3 from 'd3';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalCellRenderer implements ICellRendererFactory {
  /**
   * class to append to the text elements
   * @type {string}
   */

  constructor(private readonly textClass: string = 'cat') {
    this.textClass = textClass;
  }

  createSVG(col: CategoricalColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<g class='${this.textClass}'>
        <text clip-path='url(#cp${context.idPrefix}clipCol${col.id})'></text>
        <rect y='${padding}'></rect>
      </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        let cell: number;
        if (col.getCompressed()) {
          cell = Math.min(Column.COMPRESSED_WIDTH - padding * 2, Math.max(context.rowHeight(i) - padding * 2, 0));
        } else {
          cell = Math.min(col.getWidth() * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
        }
        attr(<SVGRectElement>n.querySelector('rect'), {
          width: cell,
          height: cell
        }, {
          fill: col.getColor(d.v, d.dataIndex)
        });
        attr(<SVGTextElement>n.querySelector('text'), {
          x: cell + padding * 2
        }).textContent = col.getCompressed() ? '' : col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createHTML(col: CategoricalColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<div class='${this.textClass}'>
        <div></div>
        <span></span>
      </div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        let cell: number;
        if (col.getCompressed()) {
          cell = Math.min(Column.COMPRESSED_WIDTH - padding * 2, Math.max(context.rowHeight(i) - padding * 2, 0));
        } else {
          cell = Math.min(col.getWidth() * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
        }
        attr(n, {}, {
          width: `${col.getCompressed() ? Column.COMPRESSED_WIDTH : col.getWidth()}px`
        });
        attr(<HTMLDivElement>n.querySelector('div'), {}, {
          width: cell + 'px',
          height: cell + 'px',
          'background-color': col.getColor(d.v, d.dataIndex)
        });
        attr(<HTMLSpanElement>n.querySelector('span'), {}).textContent = col.getCompressed() ? '' : col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: CategoricalColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      ctx.fillStyle = col.getColor(d.v, d.dataIndex);
      if (col.getCompressed()) {
        const cell = Math.min(Column.COMPRESSED_WIDTH - padding * 2, Math.max(context.rowHeight(i) - padding * 2, 0));
        ctx.fillRect(padding, padding, cell, cell);
      } else {
        const cell = Math.min(col.getWidth() * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
        ctx.fillRect(0, 0, cell, cell);
        ctx.fillStyle = context.option('style.text', 'black');
        clipText(ctx, col.getLabel(d.v, d.dataIndex), cell + 2, 0, col.getWidth() - cell - 2, context.textHints);
      }
    };
  }

  private static createHistogram(col: CategoricalColumn & Column) {
    const scale = d3.scale.ordinal().domain(col.categories).rangeBands([0, col.getWidth()]);
    return (rows: IDataRow[], height: number, maxBin?: number) => {
      const hist = new Map<string, number>();
      col.categories.forEach((cat) => hist.set(cat, 0));
      const labels = col.categoryLabels;
      const colors = col.categoryColors;
      rows.forEach((row) =>
        col.getCategories(row.v, row.dataIndex).forEach((cat) =>
          hist.set(cat, hist.get(cat) + 1)));
      const bins = col.categories.map((name, i) => ({name, label: labels[i], color: colors[i], count: hist.get(name)}));
      const yscale = d3.scale.linear().domain([0, maxBin !== undefined ? maxBin : d3.max(bins, (d) => d.count)]).range([height, 0]);
      return {bins, scale, yscale};
    };
  }

  createGroupSVG(col: CategoricalColumn & Column, context: IDOMRenderContext): ISVGGroupRenderer {
    const factory = CategoricalCellRenderer.createHistogram(col);
    const padding = context.option('rowBarPadding', 1);
    return {
      template: `<g class='histogram'></g>`,
      update: (n: SVGGElement, group: IGroup, rows: IDataRow[], hist?: ICategoricalStatistics) => {
        const height = context.groupHeight(group) - padding;
        const {bins, scale, yscale} = factory(rows, height, hist ? hist.maxBin : undefined);
        const bars = d3.select(n).selectAll('rect').data(bins);
        bars.enter().append('rect');
        bars.attr({
          x: (d) => scale(d.name) + padding,
          y: (d) => yscale(d.count) + padding,
          width: (d) => scale.rangeBand() - 2 * padding,
          height: (d) => height - yscale(d.count),
          title: (d) => `${d.label} (${d.count})`
        }).style('fill', (d) => d.color);
      }
    };
  }

  createGroupCanvas(col: CategoricalColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const factory = CategoricalCellRenderer.createHistogram(col);
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], dx: number, dy: number, hist?: ICategoricalStatistics) => {
      const height = context.groupHeight(group) - padding;
      const {bins, scale, yscale} = factory(rows, height, hist ? hist.maxBin : undefined);
      bins.forEach((d) => {
        ctx.fillStyle = d.color;
        ctx.fillRect(scale(d.name) + padding, yscale(d.count) + padding, scale.rangeBand() - 2 * padding, height - yscale(d.count));
      });
    };
  }
}
