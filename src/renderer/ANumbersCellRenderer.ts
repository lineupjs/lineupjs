import {IDataRow, IGroup, isMissingValue} from '../model';
import Column from '../model/Column';
import {LazyBoxPlotData} from '../model/INumberColumn';
import NumbersColumn from '../model/NumbersColumn';
import {default as IRenderContext, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';

export abstract class ANumbersCellRenderer implements ICellRendererFactory {
  abstract readonly title: string;

  canRender(col: Column, _isGroup: boolean) {
    return col instanceof NumbersColumn && Boolean(col.dataLength);
  }

  protected abstract createContext(col: NumbersColumn, context: IRenderContext, imposer?: IImposer): {
    templateRow: string,
    update: (row: HTMLElement, data: number[], d: IDataRow) => void,
    render: (ctx: CanvasRenderingContext2D, data: number[], d: IDataRow) => void,
  };

  /**
   * mean value for now
   * @param {INumbersColumn & Column} col
   * @param {IDataRow[]} rows
   * @return {number[]}
   */
  private static choose(col: NumbersColumn, rows: IDataRow[]) {
    const data = rows.map((r) => col.getNumbers(r));
    const cols = col.dataLength!;
    const r = <number[]>[];
    // mean column
    for (let i = 0; i < cols; ++i) {
      const vs = data.map((d) => d[i]).filter((d) => !isMissingValue(d));
      if (!vs) {
        r.push(NaN);
      } else {
        const box = new LazyBoxPlotData(vs);
        r.push(box[col.getSortMethod()]);
      }
    }
    return r;
  }

  create(col: NumbersColumn, context: IRenderContext, _hist: any, imposer?: IImposer) {
    const width = context.colWidth(col);
    const {templateRow, render, update} = this.createContext(col, context, imposer);
    return {
      template: `<div>${templateRow}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        update(n, col.getNumbers(d), d);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        render(ctx, col.getNumbers(d), d);
      },
    };
  }

  createGroup(col: NumbersColumn, context: IRenderContext, _hist: any, imposer?: IImposer) {
    const {templateRow, update} = this.createContext(col, context, imposer);
    return {
      template: `<div>${templateRow}</div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        // render a heatmap
        const chosen = ANumbersCellRenderer.choose(col, rows);
        update(n, chosen, rows[0]);
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
