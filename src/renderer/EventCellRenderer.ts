import type { ISequence } from 'src/internal';
import {
  ERenderMode,
  type ICellRendererFactory,
  type IGroupCellRenderer,
  type IRenderContext,
  type ISummaryRenderer,
} from './interfaces';
import { EventColumn, type IDataRow, type IKeyValue, type IOrderedGroup, type ITooltipRow } from '../model';
import { scaleLinear, scaleSequential, type ScaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';
import { bin, max } from 'd3-array';
import { format } from 'd3-format';
import { interpolateRgbBasis } from 'd3-interpolate';
import { zoom, type D3ZoomEvent, zoomIdentity, ZoomTransform } from 'd3-zoom';
import { axisTop } from 'd3-axis';

import { cssClass } from '../styles';

export default class EventCellRenderer implements ICellRendererFactory {
  readonly title: string = 'EventCellRenderer';
  readonly group: string = 'advanced';

  //Layout constants
  private static readonly CIRCLE_RADIUS = 4;
  private static readonly OVERVIEW_RECT_SIZE = 4;
  private static readonly BOXPLOT_OPACITY = 0.7;
  private static readonly SUMMARY_HEIGHT = 20;

  canRender(col: any, mode: ERenderMode): boolean {
    if (col instanceof EventColumn) {
      return mode === ERenderMode.CELL || mode === ERenderMode.GROUP || mode === ERenderMode.SUMMARY;
    }
    return false;
  }

  create(col: EventColumn, context: IRenderContext): any {
    if (col.getAdaptAxisToFilters()) {
      context.tasks
        .groupRows(
          col,
          { color: 'black', name: 'eventGrouping', order: col.findMyRanker().getOrder() },
          'minMax',
          (rows) => {
            const eventData = rows.map((r) => col.getMap(r));
            const rowIndices = eventData['it'];
            return col.computeMinMax(eventData, rowIndices);
          }
        )
        .then((data) => {
          if (typeof data === 'symbol') {
            return;
          }
          col.setScaleDimensions(data[0], data[1]);
        });
    }

    return {
      template: `<div class="svg-container" >
                    <svg class="svg-content">
                    </svg>
                </div>`,
      update: (n: HTMLDivElement, dataRow: IDataRow) => {
        const div = select(n);
        const svg = div.select('svg') as Selection<SVGSVGElement, unknown, null, undefined>;
        const eventData = col.getMap(dataRow);
        this.addTooltipListeners(context, col, n, dataRow);
        const X = col.getXScale();
        this.updateBoxPlot(svg, eventData, X, col);
        if (col.getDisplayZeroLine()) {
          svg
            .selectAll('.zeroLine')
            .join((enter) => enter.append('line').attr('class', 'zeroLine'))
            .attr('x1', X(0))
            .attr('x2', X(0))
            .attr('y1', '0%')
            .attr('y2', '100%')
            .attr('stroke', 'lightgrey')
            .attr('stroke-width', '1px');
        }
        svg
          .selectAll('.eventCircle')
          .data(col.getEventValues(eventData))
          .join((enter) => enter.append('circle').attr('class', 'eventCircle'))
          .attr('cx', (x) => X(x.value))
          .attr('cy', '50%')
          .attr('r', EventCellRenderer.CIRCLE_RADIUS)
          .attr('fill', (x) => col.getCategoryColor(x.key));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        const eventData = col.getMap(d);
        const X = col.getXScale();
        for (const eventKey of col.getDisplayEventList(true)) {
          eventData
            .filter((x) => x.key === eventKey)
            .forEach((event) => {
              ctx.fillStyle = col.getCategoryColor(event.key);
              const eventVal = col.getEventValue(eventData, event.key);
              const xVal = X(eventVal) - EventCellRenderer.OVERVIEW_RECT_SIZE / 2;
              if (xVal < 0) return;
              ctx.fillRect(xVal, 0, EventCellRenderer.OVERVIEW_RECT_SIZE, EventCellRenderer.OVERVIEW_RECT_SIZE);
            });
        }
      },
    };
  }

  private addTooltipListeners(context: IRenderContext, col: EventColumn, n: HTMLDivElement, dataRow: IDataRow) {
    const showTooltip = () => {
      const tooltipList = col.getTooltipContent(dataRow);

      if (tooltipList === null) return;
      context.tooltipManager.updateTooltipContent(this.createTooltipTable(tooltipList));
      context.tooltipManager.showTooltip(n);
    };
    const hideTooltip = () => {
      context.tooltipManager.hideTooltip();
    };

    for (const event of ['mouseenter']) {
      n.addEventListener(event, showTooltip);
    }
    for (const event of ['mouseleave', 'blur']) {
      n.addEventListener(event, hideTooltip);
    }
  }

  private updateBoxPlot(
    svg: Selection<SVGElement, unknown, null, undefined>,
    eventData: IKeyValue<number>[],
    X: ScaleLinear<number, number, never>,
    col: EventColumn
  ) {
    const showBoxplot = col.getShowBoxplot();
    const data = showBoxplot ? col.getBoxplotData(eventData) : null;

    if (showBoxplot && (!data || isNaN(data.median))) return;
    const yCenter = 50;
    const boxHeight = 50;

    // vertical lines
    svg
      .selectAll('.mainLines')
      .data(
        showBoxplot
          ? [
              [data.min, data.q1],
              [data.q3, data.max],
            ]
          : []
      )
      .join((enter) => enter.append('line').attr('class', 'mainLines'))
      .attr('y1', yCenter + '%')
      .attr('y2', yCenter + '%')
      .attr('x1', (d) => X(d[0]))
      .attr('x2', (d) => X(d[1]))
      .attr('stroke', 'black');

    // box
    svg
      .selectAll('.boxplotBox')
      .data(showBoxplot ? [data] : [])
      .join((enter) => enter.append('rect').attr('class', 'boxplotBox'))
      .attr('y', yCenter - boxHeight / 2 + '%')
      .attr('x', (d) => X(d.q1))
      .attr('width', (d) => X(d.q3) - X(d.q1))
      .attr('height', boxHeight + '%')
      .attr('stroke', 'black')
      .style('fill', col.getCategoryColor(EventColumn.BOXPLOT_COLOR_NAME))
      .style('opacity', EventCellRenderer.BOXPLOT_OPACITY);
    // horizontal lines
    svg
      .selectAll('.boxPlotVerticalLines')
      .data(showBoxplot ? [data.min, data.median, data.max] : [])
      .join((enter) => enter.append('line').attr('class', 'boxPlotVerticalLines'))
      .attr('y1', yCenter - boxHeight / 2 + '%')
      .attr('y2', yCenter + boxHeight / 2 + '%')
      .attr('x1', (d) => X(d))
      .attr('x2', (d) => X(d))
      .attr('stroke', 'black');
  }

  createGroup(col: EventColumn, context: IRenderContext): IGroupCellRenderer {
    return {
      template: `<div class="svg-container">
                    <svg class="svg-content">
                    </svg>
                </div>`,
      update: (n: HTMLDivElement, group: IOrderedGroup) => {
        const keyList = col.getDisplayEventList();
        this.drawHeatmap(context, col, group, keyList, n);
      },
    };
  }

  private drawHeatmap(
    context: IRenderContext,
    col: EventColumn,
    group: IOrderedGroup,
    keyList: string[],
    n: HTMLDivElement,
    isSummary = false
  ) {
    context.tasks
      .groupRows(col, group, 'identity', (rows) =>
        this.groupByKey(
          rows.map((r) => col.getMap(r)),
          keyList,
          col
        )
      )
      .then((data) => {
        if (typeof data === 'symbol') {
          return;
        }
        const Y = scaleLinear().domain([0, keyList.length]).range([0, 100]);
        const div = select(n);
        const svg = div.select('svg') as Selection<SVGSVGElement, unknown, null, undefined>;
        let formatter = format('.5f');
        let X = col.getXScale();
        const range = X.domain();
        if (typeof range[0] === 'undefined' || typeof range[1] === 'undefined' || range[0] > range[1]) return;
        if (isSummary) {
          X = X.copy().range([0.01, 0.99]);
          formatter = format('.5%');
        }
        const heatmapContentG = svg
          .selectAll('.heatmapContentG')
          .data(['heatmapContentG'])
          .join((enter) => enter.append('g').attr('class', (d) => d));

        const binning = bin().domain([range[0], range[1]]).thresholds(col.getHeatmapBinCount());
        for (let i = 0; i < keyList.length; i++) {
          const currentKey = keyList[i];
          const filtered = data.filter((x) => x.key === currentKey);
          if (filtered.length === 0) continue;
          const values = filtered[0].values;
          const binnedData = binning(values);
          if (binnedData.length < 2) continue;
          const color = col.getCategoryColor(currentKey);
          const maxVal = max(binnedData, (d) => d.length);
          const colorScale = scaleSequential()
            .domain([0, maxVal])
            .interpolator(interpolateRgbBasis(['white', color]));
          if (maxVal === 0) colorScale.interpolator(interpolateRgbBasis(['white', 'white']));
          heatmapContentG
            .selectAll('.heatmapRect' + i)
            .data(binnedData.filter((d) => X(d.x1) > 0))
            .join((enter) => enter.append('rect').attr('class', 'heatmapRect' + i))
            .attr('x', (d) => {
              return isSummary ? formatter(X(d.x0)) : X(d.x0);
            })
            .attr('y', Y(i) + 1 + '%')
            .attr('width', (d) => formatter(X(d.x1) - X(d.x0)))
            .attr('height', Y(i + 1) - Y(i) - 2 + '%')
            .attr('fill', (d) => colorScale(d.length))
            .attr('stroke', (d) => colorScale(d.length))
            .attr('title', (d) => `[${d.x0};${d.x1}]: ${d.length}`)
            .append('title')
            .text((d) => `[${d.x0}; ${d.x1}]: ${d.length}`);

          svg
            .selectAll('.heatmapRectOutline' + i)
            .data([{ first: binnedData[0], last: binnedData[binnedData.length - 1] }])
            .join((enter) => enter.append('rect').attr('class', 'heatmapRectOutline' + i))
            .attr('x', (d) => formatter(X(d.first.x0)))
            .attr('y', Y(i) + 1 + '%')
            .attr('width', (d) => formatter(X(d.last.x1) - X(d.first.x0)))
            .attr('height', Y(i + 1) - Y(i) - 2 + '%')
            .attr('stroke', color)
            .attr('fill', 'none')
            .attr('stroke-width', isSummary ? '1%' : 1);
        }
      });
  }

  groupByKey(arr: ISequence<IKeyValue<number>[]>, keyList: string[], col: EventColumn) {
    const m = new Map<string, number[]>();
    arr.forEach((a) =>
      col.getEventValues(a, false, keyList).forEach((d) => {
        if (d.value === undefined) return;
        if (!m.has(d.key)) {
          m.set(d.key, [d.value]);
        } else {
          m.get(d.key).push(d.value);
        }
      })
    );
    return Array.from(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, values]) => ({ key, values }));
  }

  createSummary(col: EventColumn, context: IRenderContext, interactive: boolean): ISummaryRenderer {
    return {
      template: `<div class="svg-container">
                    <svg class="svg-content">
                    </svg>
                </div>`,
      update: (n: HTMLDivElement) => {
        const div = select(n);
        const svg = div.select('svg') as Selection<SVGSVGElement, unknown, null, undefined>;
        svg.selectAll('*').remove();

        if (interactive) {
          const order = col.findMyRanker().getOrder();
          const group = { color: 'black', name: 'mygroup', order };
          const keyList = col.getDisplayEventList();
          this.drawHeatmap(context, col, group, keyList, n, true);
          return;
        }

        const g = svg
          .selectAll('.xAxisG')
          .data(['xAxisG'])
          .join((enter) => enter.append('g').attr('class', (d) => d))
          .attr('transform', 'translate(0,' + EventCellRenderer.SUMMARY_HEIGHT + ')') as Selection<
          SVGGElement,
          unknown,
          null,
          undefined
        >;

        const zoomElement = zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.001, 1000])
          .extent([
            [0, 0],
            [col.getWidth(), EventCellRenderer.SUMMARY_HEIGHT],
          ])
          .on('zoom', (event: D3ZoomEvent<Element, unknown>) => {
            const transform: ZoomTransform = event.transform;
            const xScale = col.getXScale(false);
            g.call(
              axisTop(transform.rescaleX(xScale)).ticks(EventCellRenderer.getTickNumberForXAxis(context.colWidth(col)))
            );
            if (!event.sourceEvent) return;
            if (event.sourceEvent && event.sourceEvent.constructor.name === 'MouseEvent') {
              return;
            }
          })
          .on('end', (event: D3ZoomEvent<Element, unknown>) => {
            const transform = event.transform;
            if (col.getScaleTransform() === transform) return;
            col.setScaleTransform(transform);
          });

        svg.call(zoomElement);
        svg.on('dblclick.zoom', () => {
          col.setScaleTransform(zoomIdentity);
        });
        svg.call(zoomElement.transform, col.getScaleTransform());
      },
    };
  }

  private static getTickNumberForXAxis(width: number) {
    if (width < 100) return 2;
    if (width < 200) return 4;
    if (width < 500) return 6;
    if (width < 800) return 8;
    return 10;
  }

  private createTooltipTable(tooltipList: ITooltipRow[]): HTMLElement {
    const node = document.createElement('div');
    const table = select(node).append('table').attr('class', cssClass('event-tooltip-table'));
    table
      .append('thead')
      .selectAll('th')
      .data(['', 'Event', 'Value', 'Date'])
      .join('th')
      .text((d) => d);
    const rows = table.append('tbody').selectAll('tr').data(tooltipList).join('tr');
    rows
      .append('td')
      .append('div')
      .style('background-color', (d) => d.color)
      .attr('class', cssClass('event-tooltip') + ' circle');
    rows
      .append('td')
      .attr('class', 'event-name')
      .text((d) => d.eventName);
    rows.append('td').text((d) => d.value);
    rows.append('td').text((d) => (d.date ? d.date.toLocaleString() : ''));
    return node;
  }
}
