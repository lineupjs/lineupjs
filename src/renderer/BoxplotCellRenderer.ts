import { IBoxPlotData, IAdvancedBoxPlotData, round } from '../internal';
import {
  NumberColumn,
  IBoxPlotColumn,
  INumberColumn,
  isBoxPlotColumn,
  Column,
  IDataRow,
  isNumberColumn,
  isMapAbleColumn,
  IOrderedGroup,
} from '../model';
import { BOX_PLOT, CANVAS_HEIGHT, DOT, cssClass } from '../styles';
import { colorOf } from './impose';
import {
  IRenderContext,
  ERenderMode,
  ICellRendererFactory,
  IImposer,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingCanvas } from './missing';
import { tasksAll } from '../provider';
import { adaptColor, BIG_MARK_LIGHTNESS_FACTOR, SMALL_MARK_LIGHTNESS_FACTOR } from './utils';

const BOXPLOT = `<div title="">
  <div class="${cssClass('boxplot-whisker')}">
    <div class="${cssClass('boxplot-box')}"></div>
    <div class="${cssClass('boxplot-median')}"></div>
    <div class="${cssClass('boxplot-mean')}"></div>
  </div>
</div>`;

const MAPPED_BOXPLOT = `<div title="">
  <div class="${cssClass('boxplot-whisker')}">
    <div class="${cssClass('boxplot-box')}"></div>
    <div class="${cssClass('boxplot-median')}"></div>
    <div class="${cssClass('boxplot-mean')}"></div>
  </div>
  <span class="${cssClass('mapping-hint')}"></span><span class="${cssClass('mapping-hint')}"></span>
</div>`;

/** @internal */
export function computeLabel(col: INumberColumn, v: IBoxPlotData | IAdvancedBoxPlotData) {
  if (v == null) {
    return '';
  }
  const f = col.getNumberFormat();
  const mean =
    (v as IAdvancedBoxPlotData).mean != null ? `mean = ${f((v as IAdvancedBoxPlotData).mean)} (dashed line)\n` : '';
  return `min = ${f(v.min)}\nq1 = ${f(v.q1)}\nmedian = ${f(v.median)}\n${mean}q3 = ${f(v.q3)}\nmax = ${f(v.max)}`;
}

export default class BoxplotCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Box Plot';

  canRender(col: Column, mode: ERenderMode): boolean {
    return (isBoxPlotColumn(col) && mode === ERenderMode.CELL) || (isNumberColumn(col) && mode !== ERenderMode.CELL);
  }

  create(col: IBoxPlotColumn, context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const sortMethod = col.getSortMethod() as keyof IBoxPlotData;
    const sortedByMe = col.isSortedByMe().asc !== undefined;
    const width = context.colWidth(col);
    return {
      template: BOXPLOT,
      update: (n: HTMLElement, d: IDataRow) => {
        const data = col.getBoxPlotData(d);
        n.classList.toggle(cssClass('missing'), !data);
        if (!data) {
          return;
        }
        const label = col.getRawBoxPlotData(d)!;
        renderDOMBoxPlot(col, n, data!, label, sortedByMe ? sortMethod : '', colorOf(col, d, imposer));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }

        // Rectangle
        const data = col.getBoxPlotData(d);
        if (!data) {
          return;
        }

        const scaled = {
          min: data.min * width,
          median: data.median * width,
          mean: (data as IAdvancedBoxPlotData).mean != null ? (data as IAdvancedBoxPlotData).mean * width : undefined,
          q1: data.q1 * width,
          q3: data.q3 * width,
          max: data.max * width,
          outlier: data.outlier ? data.outlier.map((d) => d * width) : undefined,
          whiskerLow: data.whiskerLow != null ? data.whiskerLow * width : undefined,
          whiskerHigh: data.whiskerHigh != null ? data.whiskerHigh * width : undefined,
        };
        renderBoxPlot(ctx, scaled, sortedByMe ? sortMethod : '', colorOf(col, d, imposer), CANVAS_HEIGHT, 0);
      },
    };
  }

  createGroup(col: INumberColumn, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const sort = col instanceof NumberColumn && col.isGroupSortedByMe().asc !== undefined ? col.getSortMethod() : '';
    return {
      template: BOXPLOT,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return tasksAll([
          context.tasks.groupBoxPlotStats(col, group, false),
          context.tasks.groupBoxPlotStats(col, group, true),
        ]).then((data) => {
          if (typeof data === 'symbol') {
            return;
          }
          // render
          const isMissing =
            data == null ||
            data[0] == null ||
            data[0].group.count === 0 ||
            data[0].group.count === data[0].group.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          renderDOMBoxPlot(col, n, data[0].group, data[1].group, sort, colorOf(col, null, imposer));
        });
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
      template: isMapAbleColumn(col) ? MAPPED_BOXPLOT : BOXPLOT,
      update: (n: HTMLElement) => {
        return tasksAll([
          context.tasks.summaryBoxPlotStats(col, false),
          context.tasks.summaryBoxPlotStats(col, true),
        ]).then((data) => {
          if (typeof data === 'symbol') {
            return;
          }
          const isMissing =
            data == null ||
            data[0] == null ||
            data[0].summary.count === 0 ||
            data[0].summary.count === data[0].summary.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          const mappedSummary = data[0].summary;
          const rawSummary = data[1].summary;
          const sort =
            col instanceof NumberColumn && col.isGroupSortedByMe().asc !== undefined ? col.getSortMethod() : '';

          if (isMapAbleColumn(col)) {
            const range = col.getRange();
            Array.from(n.getElementsByTagName('span')).forEach((d: HTMLElement, i) => (d.textContent = range[i]));
          }

          renderDOMBoxPlot(col, n, mappedSummary, rawSummary, sort, colorOf(col, null, imposer), isMapAbleColumn(col));
        });
      },
    };
  }
}

function renderDOMBoxPlot(
  col: INumberColumn,
  n: HTMLElement,
  data: IBoxPlotData | IAdvancedBoxPlotData,
  label: IBoxPlotData | IAdvancedBoxPlotData,
  sort: string,
  color: string | null,
  hasRange = false
) {
  n.title = computeLabel(col, label);

  const whiskers = n.firstElementChild as HTMLElement;
  const box = whiskers.firstElementChild as HTMLElement;
  const median = box.nextElementSibling as HTMLElement;
  const mean = whiskers.lastElementChild as HTMLElement;

  const leftWhisker =
    data.whiskerLow != null ? data.whiskerLow : Math.max(data.q1 - 1.5 * (data.q3 - data.q1), data.min);
  const rightWhisker =
    data.whiskerHigh != null ? data.whiskerHigh : Math.min(data.q3 + 1.5 * (data.q3 - data.q1), data.max);
  whiskers.style.left = `${round(leftWhisker * 100, 2)}%`;
  const range = rightWhisker - leftWhisker;
  whiskers.style.width = `${round(range * 100, 2)}%`;

  //relative within the whiskers
  box.style.left = `${round(((data.q1 - leftWhisker) / range) * 100, 2)}%`;
  box.style.width = `${round(((data.q3 - data.q1) / range) * 100, 2)}%`;
  box.style.backgroundColor = adaptColor(color, BIG_MARK_LIGHTNESS_FACTOR);

  //relative within the whiskers
  median.style.left = `${round(((data.median - leftWhisker) / range) * 100, 2)}%`;
  if ((data as IAdvancedBoxPlotData).mean != null) {
    mean.style.left = `${round((((data as IAdvancedBoxPlotData).mean - leftWhisker) / range) * 100, 2)}%`;
    mean.style.display = null;
  } else {
    mean.style.display = 'none';
  }

  // match lengths
  const outliers = Array.from(n.children).slice(1, hasRange ? -2 : undefined) as HTMLElement[];
  const numOutliers = data.outlier ? data.outlier.length : 0;
  outliers.splice(numOutliers, outliers.length - numOutliers).forEach((v) => v.remove());

  whiskers.dataset.sort = sort;

  if (!data.outlier || numOutliers === 0) {
    return;
  }

  for (let i = outliers.length; i < numOutliers; ++i) {
    const p = n.ownerDocument!.createElement('div');
    p.classList.add(cssClass('boxplot-outlier'));
    outliers.unshift(p);
    whiskers.insertAdjacentElement('afterend', p);
  }
  data.outlier.forEach((v, i) => {
    delete outliers[i].dataset.sort;
    outliers[i].style.left = `${round(v * 100, 2)}%`;
  });

  if (sort === 'min' && data.outlier[0] <= leftWhisker) {
    // first outliers is the min
    whiskers.dataset.sort = '';
    outliers[0].dataset.sort = 'min';
    if (outliers.length > 1) {
      // append at the end of the DOM to be on top
      outliers[outliers.length - 1].insertAdjacentElement('afterend', outliers[0]);
    }
  } else if (sort === 'max' && data.outlier[outliers.length - 1] >= rightWhisker) {
    // last outlier is the max
    whiskers.dataset.sort = '';
    outliers[outliers.length - 1].dataset.sort = 'max';
  }
}

function renderBoxPlot(
  ctx: CanvasRenderingContext2D,
  box: IBoxPlotData,
  sort: string,
  color: string | null,
  height: number,
  topPadding: number
) {
  const left = box.whiskerLow != null ? box.whiskerLow : Math.max(box.q1 - 1.5 * (box.q3 - box.q1), box.min);
  const right = box.whiskerHigh != null ? box.whiskerHigh : Math.min(box.q3 + 1.5 * (box.q3 - box.q1), box.max);

  ctx.fillStyle = adaptColor(color || BOX_PLOT.box, BIG_MARK_LIGHTNESS_FACTOR);
  ctx.strokeStyle = adaptColor(BOX_PLOT.stroke, SMALL_MARK_LIGHTNESS_FACTOR);
  ctx.beginPath();
  ctx.rect(box.q1, 0, box.q3 - box.q1, height);
  ctx.fill();
  ctx.stroke();

  //Line
  const bottomPos = height - topPadding;
  const middlePos = height / 2;

  ctx.beginPath();
  ctx.moveTo(left, middlePos);
  ctx.lineTo(box.q1, middlePos);
  ctx.moveTo(left, topPadding);
  ctx.lineTo(left, bottomPos);
  ctx.moveTo(box.median, 0);
  ctx.lineTo(box.median, height);
  ctx.moveTo(box.q3, middlePos);
  ctx.lineTo(right, middlePos);
  ctx.moveTo(right, topPadding);
  ctx.lineTo(right, bottomPos);
  ctx.stroke();
  ctx.fill();

  if (sort !== '') {
    ctx.strokeStyle = BOX_PLOT.sort;
    ctx.beginPath();
    ctx.moveTo(box[sort as keyof IBoxPlotData] as number, topPadding);
    ctx.lineTo(box[sort as keyof IBoxPlotData] as number, height - topPadding);
    ctx.stroke();
    ctx.fill();
  }

  if (!box.outlier) {
    return;
  }
  ctx.fillStyle = BOX_PLOT.outlier;
  box.outlier.forEach((v) => {
    // currently dots with 3px
    ctx.fillRect(Math.max(v - DOT.size / 2, 0), middlePos - DOT.size / 2, DOT.size, DOT.size);
  });
}
