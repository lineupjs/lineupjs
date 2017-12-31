import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import {attr} from './utils';
import Column from '../model/Column';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {ICellRendererFactory, default as IRenderContext} from './interfaces';
import {CANVAS_HEIGHT, UPSET} from '../styles';


export default class UpSetCellRenderer implements ICellRendererFactory {
  readonly title = 'Matrix';

  private static calculateSetPath(setData: boolean[], cellDimension: number) {
    const catindexes: number[] = [];
    setData.forEach((d: boolean, i: number) => (d) ? catindexes.push(i) : -1);

    const left = (catindexes[0] * cellDimension) + (cellDimension / 2);
    const right = (catindexes[catindexes.length - 1] * cellDimension) + (cellDimension / 2);

    return {left, right};
  }

  private static createDOMContext(col: ICategoricalColumn & Column) {
    const dataLength = col.categories.length;
    let templateRows = '';
    for (let i = 0; i < dataLength; ++i) {
      templateRows += `<div></div>`;
    }
    return {
      templateRow: templateRows,
      render: (n: HTMLElement, value: boolean[]) => {
        Array.from(n.children).slice(1).forEach((d, i) => {
          const v = value[i];
          attr(<HTMLElement>d, {
            'class': v ? 'enabled' : ''
          });
        });

        const line = <HTMLElement>n.firstElementChild;
        const left = value.findIndex((d) => d);
        const right = (value.length - 1) - value.reverse().findIndex((d) => d);

        if (left < 0 || left === right) {
          line.style.display = 'none';
          return;
        }
        line.style.display = null;
        line.style.left = `${Math.round(100 * (left + 0.5) / value.length)}%`;
        line.style.width = `${Math.round(100 * (right - left) / value.length)}%`;
      },
      dataLength
    };
  }

  private static union(col: ICategoricalColumn, rows: IDataRow[]) {
    const values = new Set<string>();
    rows.forEach((d) => {
      col.getCategories(d).forEach((cat) => values.add(cat));
    });
    return col.categories.map((cat) => values.has(cat));
  }

  canRender(col: Column) {
    return isCategoricalColumn(col);
  }

  create(col: ICategoricalColumn & Column, context: IRenderContext) {
    const {templateRow, render, dataLength} = UpSetCellRenderer.createDOMContext(col);
    const width = context.colWidth(col);
    const cellDimension = width / dataLength;

    return {
      template: `<div><div></div>${templateRow}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const values = new Set(col.getCategories(d));
        const value = col.categories.map((cat) => values.has(cat));
        render(n, value);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        // Circle
        const values = new Set(col.getCategories(d));
        const data = col.categories.map((cat) => values.has(cat));

        const hasTrueValues = data.some((d) => d); //some values are true?

        ctx.save();
        ctx.fillStyle = UPSET.circle;
        ctx.strokeStyle = UPSET.stroke;
        if (hasTrueValues) {
          const {left, right} = UpSetCellRenderer.calculateSetPath(data, cellDimension);
          ctx.beginPath();
          ctx.moveTo(left, CANVAS_HEIGHT / 2);
          ctx.lineTo(right, CANVAS_HEIGHT / 2);
          ctx.stroke();
        }

        data.forEach((d, j) => {
          const posx = (j * cellDimension) + (cellDimension / 2);
          ctx.beginPath();
          ctx.globalAlpha = d ? 1 : UPSET.inactive;
          ctx.fillRect(posx, 0, cellDimension, CANVAS_HEIGHT);
          ctx.fill();
        });

        ctx.restore();
      }
    };
  }

  createGroup(col: ICategoricalColumn & Column) {
    const {templateRow, render} = UpSetCellRenderer.createDOMContext(col);
    return {
      template: `<div><div></div>${templateRow}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const value = UpSetCellRenderer.union(col, rows);
        render(n, value);
      }
    };
  }
}
