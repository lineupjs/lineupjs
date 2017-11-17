import ICellRendererFactory from './ICellRendererFactory';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import Column from '../model/Column';
import {matchRows} from './ANumbersCellRenderer';
import {forEachChild} from '../utils';
import {IGroup} from '../model/Group';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {isMissingValue} from '../model/missing';
import {INumbersColumn, isNumbersColumn} from '../model/INumberColumn';

export function line(data: number[]) {
  if (data.length === 0) {
    return '';
  }
  let p = '';
  let moveNext = true;

  data.forEach((d, i) => {
    if (isMissingValue(d)) {
      moveNext = true;
    } else if (moveNext) {
      p += `M${i},${1 - d} `;
      moveNext = false;
    } else {
      p += `L${i},${1 - d} `;
    }
  });
  return p;
}

export default class SparklineCellRenderer implements ICellRendererFactory {
  readonly title = 'Sparkline';

  canRender(col: Column) {
    return isNumbersColumn(col);
  }

  createDOM(col: INumbersColumn & Column): IDOMCellRenderer {
    const yPos = 1 - col.getMapping().apply(col.getThreshold());
    return {
      template: `<svg viewBox="0 0 ${col.getDataLength() - 1} 1" preserveAspectRatio="none meet"><line x1="0" x2="${col.getDataLength() - 1}" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const data = col.getNumbers(d.v, d.dataIndex);
        n.querySelector('path')!.setAttribute('d', line(data));
      }
    };
  }

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const h = context.rowHeight(i);
      if (renderMissingCanvas(ctx, col, d, h)) {
        return;
      }
      const data = col.getNumbers(d.v, d.dataIndex);
      if (data.length === 0) {
        return;
      }
      ctx.save();
      const w = context.colWidth(col) / (col.getDataLength()-1);

      // base line
      ctx.strokeStyle = '#c1c1c1';
      ctx.beginPath();
      ctx.moveTo(0, 1 - col.getMapping().apply(col.getThreshold()));
      ctx.lineTo(w * (data.length-1), h);
      ctx.stroke();

      ctx.strokeStyle = 'black';
      this.renderLine(ctx, data, h, w);
      ctx.restore();
    };
  }

  private renderLine(ctx: CanvasRenderingContext2D, data: number[], w: number, h: number) {
    ctx.beginPath();
    let moveNext = false;
    if (isMissingValue(data[0])) {
      moveNext = true;
    } else {
      ctx.moveTo(0, (1 - data[0]) * h);
    }
    for (let i = 1; i < data.length; ++i) {
      const v = data[i];
      if (isMissingValue(v)) {
        moveNext = true;
      } else if (moveNext) {
        ctx.moveTo(i * w, (1 - data[i]) * h);
        moveNext = false;
      } else {
        ctx.lineTo(i * w, (1 - data[i]) * h);
      }
    }
    ctx.stroke();
  }

  createGroupDOM(col: INumbersColumn & Column): IDOMGroupRenderer {
    const yPos = 1 - col.getMapping().apply(col.getThreshold());
    return {
      template: `<svg viewBox="0 0 ${col.getDataLength()} 1" preserveAspectRatio="none meet"><line x1="0" x2="${col.getDataLength() - 1}" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        //overlapping ones
        matchRows(n, rows, `<path></path>`);
        forEachChild(n, ((row, i) => {
          const d = rows[i];
          row.setAttribute('d', line(col.getNumbers(d.v, d.dataIndex)));
        }));
      }
    };
  }

  createGroupCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      //overlapping ones
      const h = context.groupHeight(group);
      const w = context.colWidth(col);
      ctx.save();

      ctx.strokeStyle = '#c1c1c1';
      ctx.beginPath();
      const tresholdLine = (1 - col.getMapping().apply(col.getThreshold())) * h;
      ctx.moveTo(0, tresholdLine);
      ctx.lineTo(w, tresholdLine);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';

      rows.forEach((d) => {
        const data = col.getNumbers(d.v, d.dataIndex);
        if (data.length === 0) {
          return;
        }
        this.renderLine(ctx, data, w, h);
      });
      ctx.restore();
    };
  }
}
