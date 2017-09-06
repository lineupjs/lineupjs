import ICellRendererFactory from './ICellRendererFactory';
import {INumbersColumn} from '../model/NumbersColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {forEachChild} from '../utils';
import Column from '../model/Column';
import {IGroup} from '../model/Group';


export abstract class ANumbersCellRenderer implements ICellRendererFactory {

  protected abstract createDOMContext(col: INumbersColumn & Column): { templateRow: string, render: (row: HTMLElement, d: IDataRow)=>void};

  createDOM(col: INumbersColumn & Column): IDOMCellRenderer {
    const {templateRow, render} = this.createDOMContext(col);
    return {
      template: `<div>${templateRow}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        render(n, d);
      }
    };
  }

  createGroupDOM(col: INumbersColumn & Column): IDOMGroupRenderer {
    const {templateRow, render} = this.createDOMContext(col);
    return {
      template: `<div><div>${templateRow}</div></div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        // render a heatmap
        matchRows(n, rows, `<div>${templateRow}</div>`);
        forEachChild(n, (row, rowIndex) => {
          const d = rows[rowIndex];
          render(<HTMLElement>row, d);
        });
      }
    };
  }

  protected abstract createCanvasContext(col: INumbersColumn & Column, context: ICanvasRenderContext): (ctx: CanvasRenderingContext2D, d: IDataRow, offset: number, rowHeight: number)=>void;

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const render = this.createCanvasContext(col, context);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const rowHeight = context.rowHeight(i);
      render(ctx, d, 0, rowHeight);
    };
  }

  createGroupCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const render = this.createCanvasContext(col, context);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const rowHeight = context.groupHeight(group) / rows.length;
      rows.forEach((d, i) => {
        render(ctx, d, rowHeight * i, rowHeight);
      });
    };
  }
}


export function matchRows(n: HTMLElement|SVGElement, rows: IDataRow[], template: string) {
  // first match the number of rows
  const children = <(HTMLElement|SVGElement)[]>Array.from(n.children);
  if (children.length > rows.length) {
    children.slice(rows.length).forEach((c) => c.remove());
  } else if (rows.length > children.length) {
    n.insertAdjacentHTML('beforeend', template.repeat(rows.length - children.length));
  }
}
