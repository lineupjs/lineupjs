import type { ISequence } from 'src/internal';
import {
  ERenderMode,
  type ICellRendererFactory,
  type IGroupCellRenderer,
  type IRenderContext,
  type ISummaryRenderer,
} from './interfaces';
import { EventColumn, EEventBoxplotDataKeys, type IDataRow, type IKeyValue, type IOrderedGroup } from '../model';
import { scaleLinear, scaleSequential, type ScaleLinear } from 'd3-scale';
import { select, type Selection } from 'd3-selection';
import { bin, max } from 'd3-array';
import { format } from 'd3-format';
import { interpolateRgbBasis } from 'd3-interpolate';
import { zoom, type D3ZoomEvent, ZoomTransform, zoomIdentity } from 'd3-zoom';
import { axisTop } from 'd3-axis';
import { createPopper } from '@popperjs/core';

export default class EventCellRenderer implements ICellRendererFactory {
  readonly title: string = 'EventCellRenderer';
  readonly group: string = 'advanced';

  //Layout constants
  private static readonly EVENT_COLUMN_WIDTH = 500;
  private static readonly MARGIN_LEFT = 5;
  private static readonly MARGIN_RIGHT = 5;
  private static readonly CIRCLE_RADIUS = 4;
  private static readonly OVERVIEW_RECT_SIZE = 4;
  private static readonly BOXPLOT_OPACITY = 0.7;
  private static readonly SUMMARY_HEIGHT = 20;
  X: ScaleLinear<number, number>;
  Xzoomed: ScaleLinear<number, number>;

  getMinMax(arr: ISequence<IKeyValue<number>[]>, col: EventColumn): [number, number] {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    //TODO: get overview mode
    const eventKeys = col.getDisplayEventList();
    if (col.getBoxplotPossible()) eventKeys.push(EEventBoxplotDataKeys.max);
    arr.forEach((a) => {
      col.getEventValues(a, false, eventKeys).forEach((d) => {
        if (d.value === undefined) return;
        if (d.value < min) {
          min = d.value;
        }
        if (d.value > max) {
          max = d.value;
        }
      });
    });
    return [min, max];
  }

  canRender(col: any, mode: ERenderMode): boolean {
    if (col instanceof EventColumn) {
      return mode === ERenderMode.CELL || mode === ERenderMode.GROUP || mode === ERenderMode.SUMMARY;
    }
    return false;
  }

  create(col: EventColumn, context: IRenderContext): any {
    context.tasks
      .groupRows(
        col,
        { color: 'black', name: 'eventGrouping', order: col.findMyRanker().getOrder() },
        'minMax',
        (rows) =>
          this.getMinMax(
            rows.map((r) => col.getMap(r)),
            col
          )
      )
      .then((data) => {
        if (typeof data === 'symbol') {
          return;
        }
        col.setScaleMin(data[0]);
        col.setScaleMax(data[1]);
      });
    const min = col.getScaleMin() ? col.getScaleMin() : 0;
    const max = col.getScaleMax() ? col.getScaleMax() : 100;
    const colWidth = context.colWidth(col);
    this.X = scaleLinear()
      .domain([min, max])
      .range([EventCellRenderer.MARGIN_LEFT, colWidth - EventCellRenderer.MARGIN_RIGHT]);
    this.Xzoomed = col.transform.rescaleX(this.X);
    return {
      template: `<div class="svg-container" >
                    <svg class="svg-content">
                    </svg>
                </div>`,
      update: (n: HTMLImageElement, dataRow: IDataRow) => {
        const div = select(n);
        const svg = div.select('svg');
        svg.selectAll('*').remove();
        const mainG = svg.append('g');
        const eventData = col.getMap(dataRow);
        this.addTooltipListeners(context, col, n, dataRow);

        const X = this.Xzoomed;
        if (col.getShowBoxplot()) this.createBoxPlot(mainG, eventData, X, col);

        // add zero line
        mainG
          .append('line')
          .attr('x1', X(0))
          .attr('x2', X(0))
          .attr('y1', '0%')
          .attr('y2', '100%')
          .attr('stroke', 'lightgrey')
          .attr('stroke-width', '1px');

        mainG
          .selectAll('circle')
          .data(col.getEventValues(eventData))
          .enter()
          .append('circle')
          .attr('cx', (x) => X(x.value))
          .attr('cy', '50%')
          .attr('r', EventCellRenderer.CIRCLE_RADIUS)
          .attr('fill', (x) => col.getCategoryColor(x.key));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        const eventData = col.getMap(d);
        const X = this.Xzoomed;
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

  private addTooltipListeners(context: IRenderContext, col: EventColumn, n: HTMLImageElement, dataRow: IDataRow) {
    const tooltipDiv = document.getElementById(context.idPrefix + '-tooltip-node');
    const showTooltip = () => {
      const tooltipContentDiv = document.getElementById(context.idPrefix + '-tooltip-content');
      col.updateTooltipContent(dataRow, tooltipContentDiv);
      const tooltipArrowDiv = document.getElementById(context.idPrefix + '-tooltip-arrow');
      if (col.popperInstance) {
        col.popperInstance.destroy();
      }
      col.popperInstance = createPopper(n, tooltipDiv, {
        strategy: 'fixed',
        placement: 'auto-start',
        modifiers: [
          { name: 'arrow', options: { element: tooltipArrowDiv } },
          {
            name: 'offset',
            options: {
              offset: [0, 4],
            },
          },
        ],
      });

      tooltipDiv.hidden = false;
    };
    const hideTooltip = () => {
      if (col.popperInstance) {
        col.popperInstance.destroy();
      }
      col.popperInstance.setOptions((options) => ({
        ...options,
        modifiers: [...options.modifiers, { name: 'eventListeners', enabled: false }],
      }));
      tooltipDiv.hidden = true;
    };

    for (const event of ['mouseenter']) {
      n.addEventListener(event, showTooltip);
    }
    for (const event of ['mouseleave', 'focus', 'blur']) {
      n.addEventListener(event, hideTooltip);
    }
  }

  private createBoxPlot(
    mainG: Selection<SVGGElement, unknown, null, undefined>,
    eventData: IKeyValue<number>[],
    X: ScaleLinear<number, number, never>,
    col: EventColumn
  ) {
    const data = col.getBoxplotData(eventData);

    if (!data || isNaN(data.median)) return;
    const boxSvg = mainG.append('g');

    const yCenter = 50;
    const boxHeight = 50;

    // vertical lines
    boxSvg
      .selectAll('mainLines')
      .data([
        [data.min, data.q1],
        [data.q3, data.max],
      ])
      .enter()
      .append('line')
      .attr('y1', yCenter + '%')
      .attr('y2', yCenter + '%')
      .attr('x1', (d) => X(d[0]))
      .attr('x2', (d) => X(d[1]))
      .attr('stroke', 'black');

    // box
    boxSvg
      .append('rect')
      .attr('y', yCenter - boxHeight / 2 + '%')
      .attr('x', X(data.q1))
      .attr('width', X(data.q3) - X(data.q1))
      .attr('height', boxHeight + '%')
      .attr('stroke', 'black')
      .style('fill', col.getCategoryColor(EventColumn.BOXPLOT_COLOR_NAME))
      .style('opacity', EventCellRenderer.BOXPLOT_OPACITY);
    // horizontal lines
    boxSvg
      .selectAll('toto')
      .data([data.min, data.median, data.max])
      .enter()
      .append('line')
      .attr('y1', yCenter - boxHeight / 2 + '%')
      .attr('y2', yCenter + boxHeight / 2 + '%')
      .attr('x1', function (d) {
        return X(d);
      })
      .attr('x2', function (d) {
        return X(d);
      })
      .attr('stroke', 'black');
  }

  createGroup(col: EventColumn, context: IRenderContext): IGroupCellRenderer {
    return {
      template: `<div class="svg-container">
                    <svg class="svg-content">
                    </svg>
                </div>`,
      update: (n: HTMLImageElement, group: IOrderedGroup) => {
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
    n: HTMLImageElement,
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
        const range = col.getRange();
        const binning = bin().domain(range).thresholds(col.getHeatmapBinCount());
        let X = this.Xzoomed;
        const Y = scaleLinear().domain([0, keyList.length]).range([0, 100]);
        const div = select(n);
        const svg = div.select('svg');
        let formatter = format('.5f');
        svg.selectAll('*').remove();
        const mainG = svg.append('g');
        if (isSummary) {
          X = this.X.copy().range([0.01, 0.99]);
          formatter = format('.5%');
        }

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
          mainG
            .selectAll('row' + i)
            .data(binnedData.filter((d) => X(d.x1) > 0))
            .enter()
            .append('rect')
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
          mainG
            .append('rect')

            .attr('x', formatter(X(binnedData[0].x0)))
            .attr('y', Y(i) + 1 + '%')
            .attr('width', formatter(X(binnedData[binnedData.length - 1].x1) - X(binnedData[0].x0)))
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

  createSummary(col: EventColumn, context: IRenderContext): ISummaryRenderer {
    return {
      template: `<div class="svg-container">
                    <svg class="svg-content">
                    </svg>
                </div>`,
      update: (n: HTMLImageElement) => {
        const div = select(n);
        const svg = div.select('svg') as Selection<SVGSVGElement, unknown, null, undefined>;
        svg.selectAll('*').remove();

        if (n.classList.contains('lu-side-panel-summary')) {
          const order = context.provider.getFirstRanking().getOrder();
          const group = { color: 'black', name: 'mygroup', order };
          const keyList = col.getDisplayEventList();
          this.drawHeatmap(context, col, group, keyList, n, true);
          return;
        }

        const g = svg.append('g').attr('transform', 'translate(0,' + EventCellRenderer.SUMMARY_HEIGHT + ')');

        const zoomElement = zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.001, 1000])
          .extent([
            [0, 0],
            [EventCellRenderer.EVENT_COLUMN_WIDTH, EventCellRenderer.SUMMARY_HEIGHT],
          ])
          .on('zoom', (event: D3ZoomEvent<Element, unknown>) => {
            const transform: ZoomTransform = event.transform;
            this.Xzoomed = transform.rescaleX(this.X);
            g.call(axisTop(this.Xzoomed).ticks(EventCellRenderer.getTickNumberForXAxis(context.colWidth(col))));
            if (!event.sourceEvent) return;
            if (event.sourceEvent && event.sourceEvent.constructor.name === 'MouseEvent') {
              return;
            }
          })
          .on('end', (event: D3ZoomEvent<Element, unknown>) => {
            const transform = event.transform;
            if (col.transform === transform) return;
            col.transform = transform;
            col.markDirty('values');
          });

        svg.call(zoomElement);
        svg.on('dblclick.zoom', () => {
          col.transform = zoomIdentity;
          col.markDirty('values');
        });
        svg.call(zoomElement.transform, col.transform);
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
}
