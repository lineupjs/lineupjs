import type { IDataRow, INumbersColumn, EAdvancedSortMethod, IOrderedGroup } from '../model';
import type { IRenderContext, IImposer, ICellRenderer, IGroupCellRenderer } from './interfaces';
import { renderMissingCanvas, renderMissingDOM } from './missing';
import { ISequence, boxplotBuilder, getSortLabel } from '../internal';

export abstract class ANumbersCellRenderer {
  abstract readonly title: string;

  protected abstract createContext(
    col: INumbersColumn,
    context: IRenderContext,
    imposer?: IImposer
  ): {
    clazz: string;
    templateRow: string;
    update: (row: HTMLElement, data: number[], raw: number[], d: IDataRow, tooltipPrefix?: string) => void;
    render: (ctx: CanvasRenderingContext2D, data: number[], d: IDataRow) => void;
  };

  static choose(col: INumbersColumn, rows: ISequence<IDataRow>) {
    let row: IDataRow | null = null;
    const data = rows.map((r, i) => {
      if (i === 0) {
        row = r;
      }
      return { n: col.getNumbers(r), raw: col.getRawNumbers(r) };
    });
    const cols = col.dataLength!;
    const normalized: number[] = [];
    const raw: number[] = [];
    // mean column)
    for (let i = 0; i < cols; ++i) {
      const vs = data.map((d) => ({ n: d.n[i], raw: d.raw[i] })).filter((d) => !Number.isNaN(d.n));
      if (vs.length === 0) {
        normalized.push(NaN);
        raw.push(NaN);
      } else {
        const bbn = boxplotBuilder();
        const bbr = boxplotBuilder();
        const s: EAdvancedSortMethod = (col as any).getSortMethod();
        vs.forEach((d) => {
          bbn.push(d.n);
          bbr.push(d.raw);
        });
        normalized.push(bbn.build()[s]!);
        raw.push(bbr.build()[s]!);
      }
    }
    return { normalized, raw, row };
  }

  create(col: INumbersColumn, context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const width = context.colWidth(col);
    const { templateRow, render, update, clazz } = this.createContext(col, context, imposer);
    return {
      template: `<div class="${clazz}">${templateRow}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        update(n, col.getNumbers(d), col.getRawNumbers(d), d);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        render(ctx, col.getNumbers(d), d);
      },
    };
  }

  createGroup(col: INumbersColumn, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const { templateRow, update, clazz } = this.createContext(col, context, imposer);
    return {
      template: `<div class="${clazz}">${templateRow}</div>`,
      update: (n: HTMLDivElement, group: IOrderedGroup) => {
        // render a heatmap
        return context.tasks
          .groupRows(col, group, this.title, (rows) => ANumbersCellRenderer.choose(col, rows))
          .then((data) => {
            if (typeof data !== 'symbol') {
              update(n, data.normalized, data.raw, data.row!, `${getSortLabel(col.getSortMethod())} `);
            }
          });
      },
    };
  }
}

/** @internal */
export function matchRows(n: HTMLElement | SVGElement, length: number, template: string) {
  // first match the number of rows
  const children = Array.from(n.children) as (HTMLElement | SVGElement)[];
  if (children.length > length) {
    children.slice(length).forEach((c) => c.remove());
  } else if (length > children.length) {
    n.insertAdjacentHTML('beforeend', template.repeat(length - children.length));
  }
}
