import ICellRendererFactory from './ICellRendererFactory';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import Column from '../model/Column';
import {IGroup} from '../model/Group';
import {mean} from 'd3';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {isMissingValue} from '../model/missing';
import {INumbersColumn, isNumbersColumn} from '../model/INumberColumn';

export abstract class ANumbersCellRenderer implements ICellRendererFactory {
  abstract readonly title: string;

  canRender(col: Column, _isGroup: boolean) {
    return isNumbersColumn(col);
  }

  protected abstract createDOMContext(col: INumbersColumn & Column): { templateRow: string, render: (row: HTMLElement, data: number[]) => void };

  /**
   * mean value for now
   * @param {INumbersColumn & Column} col
   * @param {IDataRow[]} rows
   * @return {number[]}
   */
  private static choose(col: INumbersColumn & Column, rows: IDataRow[]) {
    const data = rows.map((r) => col.getRawNumbers(r.v, r.dataIndex));
    const cols = col.getDataLength();
    const r = <number[]>[];
    // mean column
    for(let i = 0; i < cols; ++i) {
      const col = data.map((d) => d[i]).filter((d) => !isMissingValue(d));
      r.push(mean(col));
    }
    return r;
  }

  createDOM(col: INumbersColumn & Column): IDOMCellRenderer {
    const {templateRow, render} = this.createDOMContext(col);
    return {
      template: `<div>${templateRow}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        render(n, col.getRawNumbers(d.v,d.dataIndex));
      }
    };
  }

  createGroupDOM(col: INumbersColumn & Column): IDOMGroupRenderer {
    const {templateRow, render} = this.createDOMContext(col);
    return {
      template: `<div>${templateRow}</div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        // render a heatmap
        const chosen = ANumbersCellRenderer.choose(col, rows);
        render(n, chosen);
      }
    };
  }

  protected abstract createCanvasContext(col: INumbersColumn & Column, context: ICanvasRenderContext): (ctx: CanvasRenderingContext2D, data: number[], offset: number, rowHeight: number) => void;

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const render = this.createCanvasContext(col, context);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      const rowHeight = context.rowHeight(i);
      render(ctx, col.getRawNumbers(d.v, d.dataIndex), 0, rowHeight);
    };
  }

  createGroupCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const render = this.createCanvasContext(col, context);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const rowHeight = context.groupHeight(group);
      const chosen = ANumbersCellRenderer.choose(col, rows);
      render(ctx, chosen, 0, rowHeight);
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
