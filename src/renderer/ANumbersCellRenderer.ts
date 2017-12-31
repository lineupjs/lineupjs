import {ICellRendererFactory, default as IRenderContext} from './interfaces';
import Column from '../model/Column';
import {IDataRow, IGroup, INumbersColumn, isMissingValue, isNumbersColumn} from '../model';
import {mean} from 'd3-array';
import {renderMissingCanvas, renderMissingDOM} from './missing';

export abstract class ANumbersCellRenderer implements ICellRendererFactory {
  abstract readonly title: string;

  canRender(col: Column, _isGroup: boolean) {
    return isNumbersColumn(col);
  }

  protected abstract createContext(col: INumbersColumn & Column, context: IRenderContext): {
    templateRow: string,
    update: (row: HTMLElement, data: number[]) => void,
    render: (ctx: CanvasRenderingContext2D, data: number[]) => void,
  };

  /**
   * mean value for now
   * @param {INumbersColumn & Column} col
   * @param {IDataRow[]} rows
   * @return {number[]}
   */
  private static choose(col: INumbersColumn & Column, rows: IDataRow[]) {
    const data = rows.map((r) => col.getRawNumbers(r));
    const cols = col.getDataLength();
    const r = <number[]>[];
    // mean column
    for(let i = 0; i < cols; ++i) {
      const col = data.map((d) => d[i]).filter((d) => !isMissingValue(d));
      r.push(mean(col)!);
    }
    return r;
  }

  create(col: INumbersColumn & Column, context: IRenderContext) {
    const width = context.colWidth(col);
    const {templateRow, render, update} = this.createContext(col, context);
    return {
      template: `<div>${templateRow}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        update(n, col.getRawNumbers(d));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        render(ctx, col.getRawNumbers(d));
      },
    };
  }

  createGroup(col: INumbersColumn & Column, context: IRenderContext) {
    const {templateRow, update} = this.createContext(col, context);
    return {
      template: `<div>${templateRow}</div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        // render a heatmap
        const chosen = ANumbersCellRenderer.choose(col, rows);
        update(n, chosen);
      }
    };
  }
}


export function matchRows(n: HTMLElement | SVGElement, rows: IDataRow[], template: string) {
  // first match the number of rows
  const children = <(HTMLElement | SVGElement)[]>Array.from(n.children);
  if (children.length > rows.length) {
    children.slice(rows.length).forEach((c) => c.remove());
  } else if (rows.length > children.length) {
    n.insertAdjacentHTML('beforeend', template.repeat(rows.length - children.length));
  }
}
