import {ICategoricalColumn, ICategory, IDataRow, IGroup, isCategoricalColumn} from '../model';
import Column from '../model/Column';
import {CANVAS_HEIGHT, UPSET} from '../styles';
import {default as IRenderContext, ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {noRenderer} from './utils';


export default class UpSetCellRenderer implements ICellRendererFactory {
  readonly title = 'Matrix';

  canRender(col: Column, mode: ERenderMode) {
    return isCategoricalColumn(col) && mode !== ERenderMode.SUMMARY;
  }

  private static calculateSetPath(setData: boolean[], cellDimension: number) {
    const catindexes: number[] = [];
    setData.forEach((d: boolean, i: number) => (d) ? catindexes.push(i) : -1);

    const left = (catindexes[0] * cellDimension) + (cellDimension / 2);
    const right = (catindexes[catindexes.length - 1] * cellDimension) + (cellDimension / 2);

    return {left, right};
  }

  private static createDOMContext(col: ICategoricalColumn) {
    const categories = col.categories;
    let templateRows = '';
    for (const cat of categories) {
      templateRows += `<div title="${cat.label}"></div>`;
    }
    return {
      templateRow: templateRows,
      render: (n: HTMLElement, value: boolean[]) => {
        Array.from(n.children).slice(1).forEach((d, i) => {
          const v = value[i];
          d.classList.toggle('enabled', v);
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
      }
    };
  }

  private static union(col: ICategoricalColumn, rows: IDataRow[]) {
    const values = new Set<ICategory>();
    rows.forEach((d) => {
      const v = col.getCategory(d);
      if (v) {
        values.add(v);
      }
    });
    return col.categories.map((cat) => values.has(cat));
  }

  create(col: ICategoricalColumn, context: IRenderContext) {
    const {templateRow, render} = UpSetCellRenderer.createDOMContext(col);
    const width = context.colWidth(col);
    const cellDimension = width / col.dataLength!;

    return {
      template: `<div><div></div>${templateRow}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        render(n, col.getValues(d));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        // Circle
        const data = col.getValues(d);

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

  createGroup(col: ICategoricalColumn) {
    const {templateRow, render} = UpSetCellRenderer.createDOMContext(col);
    return {
      template: `<div><div></div>${templateRow}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const value = UpSetCellRenderer.union(col, rows);
        render(n, value);
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
