import { scaleLinear } from 'd3-scale';
import { GUESSES_GROUP_HEIGHT } from '../constants';
import { IAdvancedBoxPlotData, extent } from '../internal';
import { Column, INumberColumn, IOrderedGroup, isMapAbleColumn, isNumberColumn, NumberColumn } from '../model';
import { cssClass } from '../styles';
import { computeLabel } from './BoxplotCellRenderer';
import { colorOf } from './impose';
import {
  ERenderMode,
  ICellRenderer,
  ICellRendererFactory,
  IGroupCellRenderer,
  IImposer,
  IRenderContext,
  ISummaryRenderer,
} from './interfaces';
import { adaptColor, BIG_MARK_LIGHTNESS_FACTOR, noRenderer, SMALL_MARK_LIGHTNESS_FACTOR } from './utils';

export default class ViolinPlotCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Violin Plot';

  canRender(col: Column, mode: ERenderMode): boolean {
    return isNumberColumn(col) && mode !== ERenderMode.CELL;
  }

  create(): ICellRenderer {
    return noRenderer;
  }

  createGroup(col: INumberColumn, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const sort = col instanceof NumberColumn && col.isGroupSortedByMe().asc !== undefined ? col.getSortMethod() : '';
    return {
      template: createViolinTemplate(col.getWidth(), false),
      update: (n: HTMLElement, group: IOrderedGroup) => {
        const mapped = context.tasks.groupBoxPlotStats(col, group, false);
        const raw = context.tasks.groupBoxPlotStats(col, group, true);
        const isMissing = mapped == null || mapped.group.count === 0 || mapped.group.count === mapped.group.missing;
        n.classList.toggle(cssClass('missing'), isMissing);
        if (isMissing) {
          return;
        }
        const color = adaptColor(colorOf(col, null, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
        const fillColor = adaptColor(colorOf(col, null, imposer), BIG_MARK_LIGHTNESS_FACTOR);
        renderViolin(col, n, mapped.group, raw.group, sort, color, fillColor);
      },
    };
  }

  createSummary(
    col: INumberColumn,
    context: IRenderContext,
    _interactive: boolean,
    imposer?: IImposer
  ): ISummaryRenderer {
    return {
      template: createViolinTemplate(col.getWidth(), isMapAbleColumn(col)),
      update: (n: HTMLElement) => {
        const mapped = context.tasks.summaryBoxPlotStats(col, false);
        const raw = context.tasks.summaryBoxPlotStats(col, true);
        const isMissing =
          mapped == null || mapped.summary.count === 0 || mapped.summary.count === mapped.summary.missing;
        n.classList.toggle(cssClass('missing'), isMissing);
        if (isMissing) {
          return;
        }
        const mappedSummary = mapped.summary;
        const rawSummary = raw.summary;
        const sort =
          col instanceof NumberColumn && col.isGroupSortedByMe().asc !== undefined ? col.getSortMethod() : '';

        if (isMapAbleColumn(col)) {
          const range = col.getRange();
          Array.from(n.getElementsByTagName('span')).forEach((d: HTMLElement, i) => (d.textContent = range[i]));
        }
        const color = adaptColor(colorOf(col, null, imposer), SMALL_MARK_LIGHTNESS_FACTOR);
        const fillColor = adaptColor(colorOf(col, null, imposer), BIG_MARK_LIGHTNESS_FACTOR);
        renderViolin(col, n, mappedSummary, rawSummary, sort, color, fillColor);
      },
    };
  }
}

function createViolinTemplate(width: number, isMapped: boolean) {
  const mappedHelper = isMapped
    ? `<span class="${cssClass('mapping-hint')}"></span><span class="${cssClass('mapping-hint')}"></span>`
    : '';
  const h = GUESSES_GROUP_HEIGHT;
  return `<div title="">
      <svg class="${cssClass('violin')}"
           viewBox="0 0 ${width} ${h}" preserveAspectRatio="none meet">
        <path class="${cssClass('violin-path')}" d="M0,0 L100,0"></path>
        <line x1="0" x2="0" y1="${h / 2}" y2="${h / 2}" class="${cssClass('violin-iqr')}"></line>
        <line x1="0" x2="0" y1="${h / 2 - h * 0.25}" y2="${h / 2 + h * 0.25}" class="${cssClass('violin-mean')}"></line>
        <line x1="0" x2="0" y1="${h / 2 - h * 0.25}" y2="${h / 2 + h * 0.25}" class="${cssClass(
    'violin-median'
  )}"></line>
      </svg>
      ${mappedHelper}
    </div>`;
}

function computePath(xScale: (v: number) => number, data: IAdvancedBoxPlotData) {
  const halfH = GUESSES_GROUP_HEIGHT / 2;
  const yScale = scaleLinear([0, halfH - 1]).domain(extent(data.kdePoints, (d) => d.p));
  const pathF: string[] = [];
  const pathB: string[] = [];
  for (const point of data.kdePoints) {
    const x = xScale(point.v);
    const y = yScale(point.p);
    pathF.push(`${pathF.length === 0 ? 'M' : 'L'}${x},${halfH - y}`);
    pathB.push(`L${x},${halfH + y}`);
  }
  pathB.reverse();
  return pathF.join(' ') + pathB.join(' ') + ' Z';
}

function renderViolin(
  col: INumberColumn,
  n: HTMLElement,
  data: IAdvancedBoxPlotData,
  label: IAdvancedBoxPlotData,
  _sort: string,
  color: string | null,
  fillColor: string | null
) {
  n.title = computeLabel(col, label);
  const svg = n.firstElementChild as SVGSVGElement;
  svg.style.color = color;
  const path = svg.firstElementChild as SVGPathElement;
  path.style.fill = fillColor;
  const xScale = scaleLinear([0, col.getWidth()]).domain([0, 1]);
  path.setAttribute('d', computePath(xScale, data));
  const iqrLine = svg.children[1] as SVGLineElement;
  const medianLine = svg.children[2] as SVGCircleElement;
  const meanLine = svg.children[3] as SVGCircleElement;
  medianLine.setAttribute('x1', xScale(data.median).toString());
  medianLine.setAttribute('x2', xScale(data.median).toString());
  meanLine.setAttribute('x1', xScale(data.mean).toString());
  meanLine.setAttribute('x2', xScale(data.mean).toString());
  iqrLine.setAttribute('x1', xScale(data.q1).toString());
  iqrLine.setAttribute('x2', xScale(data.q3).toString());
}
