import ICellRendererFactory from './ICellRendererFactory';
import {default as BoxPlotColumn, isBoxPlotColumn} from '../model/BoxPlotColumn';
import Column from '../model/Column';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {
  IBoxPlotColumn, IBoxPlotData, INumberColumn, INumbersColumn, isNumbersColumn,
  LazyBoxPlotData
} from '../model/INumberColumn';
import {IGroup} from '../model/Group';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {isNumberColumn} from '../model';
import NumberColumn from '../model/NumberColumn';
import {colorOf, IImposer} from './impose';

export function computeLabel(v: IBoxPlotData) {
  if (v === null) {
    return '';
  }
  const f = BoxPlotColumn.DEFAULT_FORMATTER;
  return `min = ${f(v.min)}\nq1 = ${f(v.q1)}\nmedian = ${f(v.median)}\nq3 = ${f(v.q3)}\nmax = ${f(v.max)}`;
}

export default class BoxplotCellRenderer implements ICellRendererFactory {
  readonly title = 'Box Plot';

  canRender(col: Column, isGroup: boolean) {
    return (isBoxPlotColumn(col) && !isGroup || (isNumberColumn(col) && isGroup));
  }

  createDOM(col: IBoxPlotColumn & Column, _context: IDOMRenderContext, imposer?: IImposer): IDOMCellRenderer {
    const sortMethod = <keyof IBoxPlotData>col.getSortMethod();
    const sortedByMe = col.isSortedByMe().asc !== undefined;
    return {
      template: `<div title="">
                    <div><div></div><div></div></div>
                 </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const data = col.getBoxPlotData(d.v, d.dataIndex);

        const missing = renderMissingDOM(n, col, d) || !data;

        if (missing) {
          return;
        }

        const label = col.getRawBoxPlotData(d.v, d.dataIndex)!;
        renderDOMBoxPlot(n, data!, label, sortedByMe ? sortMethod : '', colorOf(col, d, imposer));
      }
    };
  }

  createCanvas(col: IBoxPlotColumn & Column, context: ICanvasRenderContext, imposer?: IImposer): ICanvasCellRenderer {
    const sortMethod = <keyof IBoxPlotData>col.getSortMethod();
    const topPadding = context.option('rowBarPadding', 1);
    const sortedByMe = col.isSortedByMe().asc !== undefined;
    const width = context.colWidth(col);

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const rowHeight = context.rowHeight(i);

      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }

      // Rectangle
      const data = col.getBoxPlotData(d.v, d.dataIndex);
      if (!data) {
        return;
      }

      const scaled = {
        min: data.min * width,
        median: data.median * width,
        q1: data.q1 * width,
        q3: data.q3 * width,
        max: data.max * width,
        outlier: data.outlier ? data.outlier.map((d) => d * width) : undefined
      };
      renderBoxPlot(ctx, scaled, sortedByMe ? sortMethod : '', colorOf(col, d, imposer), rowHeight, topPadding, context);
    };
  }

  private static createAggregatedBoxPlot(col: INumbersColumn & Column, rows: IDataRow[], raw = false): IBoxPlotData {
    // concat all values
    const vs = (<number[]>[]).concat(...rows.map((r) => (raw ? col.getRawNumbers(r.v, r.dataIndex) : col.getNumber(r.v, r.dataIndex))));
    return new LazyBoxPlotData(vs);
  }

  createGroupDOM(col: INumberColumn & Column, _context: IDOMRenderContext, imposer?: IImposer): IDOMGroupRenderer {
    const sort = (col instanceof NumberColumn && col.isGroupSortedByMe().asc !== undefined) ? col.getSortMethod() : '';
    return {
      template: `<div title="">
                    <div><div></div><div></div></div>
                 </div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        if (rows.every((row) => col.isMissing(row.v, row.dataIndex))) {
          renderMissingDOM(n, col, rows[0]); // doesn't matter since all
          return;
        }
        n.classList.remove('lu-missing');
        let box: IBoxPlotData, label: IBoxPlotData;

        if (isNumbersColumn(col)) {
          box = BoxplotCellRenderer.createAggregatedBoxPlot(col, rows);
          label = BoxplotCellRenderer.createAggregatedBoxPlot(col, rows, true);
        } else {
          box = new LazyBoxPlotData(rows.map((row) => col.getNumber(row.v, row.dataIndex)));
          label = new LazyBoxPlotData(rows.map((row) => col.getRawNumber(row.v, row.dataIndex)));
        }
        renderDOMBoxPlot(n, box, label, sort, colorOf(col, null, imposer));
      }
    };
  }

  createGroupCanvas(col: INumberColumn & Column, context: ICanvasRenderContext, imposer?: IImposer): ICanvasGroupRenderer {
    const topPadding = context.option('rowBarGroupPadding', 1);
    const width = context.colWidth(col);
    const sort = (col instanceof NumberColumn && col.isGroupSortedByMe().asc !== undefined) ? col.getSortMethod() : '';
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const height = context.groupHeight(group);
      if (rows.every((row) => col.isMissing(row.v, row.dataIndex))) {
        renderMissingCanvas(ctx, col, rows[0], height); // doesn't matter since all
        return;
      }
      let box: IBoxPlotData;

      if (isNumbersColumn(col)) {
        box = BoxplotCellRenderer.createAggregatedBoxPlot(col, rows);
      } else {
        box = new LazyBoxPlotData(rows.map((row) => col.getNumber(row.v, row.dataIndex)));
      }
      const scaled = {
        min: box.min * width,
        median: box.median * width,
        q1: box.q1 * width,
        q3: box.q3 * width,
        max: box.max * width,
        outlier: box.outlier ? box.outlier.map((d) => d * width) : undefined
      };
      renderBoxPlot(ctx, scaled, sort, colorOf(col, null, imposer), height, topPadding, context);
    };
  }
}

function renderDOMBoxPlot(n: HTMLElement, data: IBoxPlotData, label: IBoxPlotData, sort: string, color: string | null) {
  n.title = computeLabel(label);

  const whiskers = <HTMLElement>n.firstElementChild;
  const box = <HTMLElement>whiskers.firstElementChild;
  const median = <HTMLElement>whiskers.lastElementChild;

  let leftWhisker : number;
  let rightWhisker : number;

  if (data.outlier && data.outlier.length > 0) {
    leftWhisker = Math.max(data.q1 - 1.5 * (data.q3 - data.q1), data.min);
    rightWhisker = Math.min(data.q3 + 1.5 * (data.q3 - data.q1), data.max);
  } else {
    leftWhisker = data.min;
    rightWhisker = data.max;
  }

  whiskers.style.left = `${leftWhisker * 100}%`;
  const range = rightWhisker - leftWhisker;
  whiskers.style.width = `${range * 100}%`;

  //relative within the whiskers
  box.style.left = `${(data.q1 - leftWhisker) / range * 100}%`;
  box.style.width = `${(data.q3 - data.q1) / range * 100}%`;
  box.style.backgroundColor = color;

  //relative within the whiskers
  median.style.left = `${(data.median - leftWhisker) / range * 100}%`;

  whiskers.dataset.sort = sort; // add sort criteria to whiskers by default
  if (!data.outlier || data.outlier.length === 0) {
    if (n.children.length > 1) {
      n.innerHTML = '';
      n.appendChild(whiskers);
    }
    return;
  }

  // match lengths
  // create outlier elements
  const outliers = <HTMLElement[]>Array.from(n.children).slice(1);
  outliers.slice(data.outlier.length).forEach((v) => v.remove());
  for (let i = outliers.length; i < data.outlier.length; ++i) {
    const p = n.ownerDocument.createElement('div');
    outliers.push(p);
    n.appendChild(p);
  }

  const minOutlier = Math.min(...data.outlier);
  const maxOutlier = Math.max(...data.outlier);
  data.outlier.forEach((v, i) => {
    delete outliers[i].dataset.sort;
    outliers[i].style.left = `${v * 100}%`;

    // apply the sort criteria style if the value is either the minimum or the maximum value
    if ((v < leftWhisker && v === minOutlier && sort === 'min') || (v > rightWhisker && v === maxOutlier && sort === 'max')) {
      outliers[i].dataset.sort = sort;
      whiskers.dataset.sort = '';
    }
  });
}

function renderBoxPlot(ctx: CanvasRenderingContext2D, box: IBoxPlotData, sort: string, color: string | null, height: number, topPadding: number, context: ICanvasRenderContext) {
  const boxColor = color || context.option('style.boxplot.box', '#e0e0e0');
  const boxStroke = context.option('style.boxplot.stroke', 'black');
  const boxSortIndicator = context.option('style.boxplot.sortIndicator', '#ffa500');

  const boxTopPadding = topPadding + ((height - topPadding * 2) * 0.1);

  let left : number;
  let right : number;

  if (box.outlier && box.outlier.length > 0) {
    left = Math.max(box.q1 - 1.5 * (box.q3 - box.q1), box.min);
    right = Math.min(box.q3 + 1.5 * (box.q3 - box.q1), box.max);
  } else {
    left = box.min;
    right = box.max;
  }

  ctx.fillStyle = boxColor;
  ctx.strokeStyle = boxStroke;
  ctx.beginPath();
  ctx.rect(box.q1, boxTopPadding, box.q3 - box.q1, height - (boxTopPadding * 2));
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
  ctx.moveTo(box.median, boxTopPadding);
  ctx.lineTo(box.median, height - boxTopPadding);
  ctx.moveTo(box.q3, middlePos);
  ctx.lineTo(right, middlePos);
  ctx.moveTo(right, topPadding);
  ctx.lineTo(right, bottomPos);
  ctx.stroke();
  ctx.fill();

  if (sort !== '') {
    ctx.strokeStyle = boxSortIndicator;
    ctx.beginPath();
    ctx.moveTo(<number>box[<keyof IBoxPlotData>sort], topPadding);
    ctx.lineTo(<number>box[<keyof IBoxPlotData>sort], height - topPadding);
    ctx.stroke();
    ctx.fill();
  }

  if (!box.outlier) {
    return;
  }
  box.outlier.forEach((v) => {
    // currently dots with 3px
    ctx.fillRect(v - 1, middlePos - 1, 3, 3);
  });
}
