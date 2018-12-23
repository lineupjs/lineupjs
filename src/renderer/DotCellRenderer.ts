import {round} from '../internal';
import {Column, isNumbersColumn, INumberColumn, IDataRow, isNumberColumn, IOrderedGroup} from '../model';
import {CANVAS_HEIGHT, DOT} from '../styles';
import {colorOf} from './impose';
import {default as IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {attr, noRenderer} from './utils';
import {concatSeq, ISequence} from '../internal/interable';

/** @internal */
export default class DotCellRenderer implements ICellRendererFactory {
  readonly title = 'Dot';
  readonly groupTitle = 'Dots';

  canRender(col: Column, mode: ERenderMode) {
    return isNumberColumn(col) && mode !== ERenderMode.SUMMARY;
  }

  private static getDOMRenderer(col: INumberColumn) {
    const dots = isNumbersColumn(col) ? col.dataLength! : 1;
    let tmp = '';
    for (let i = 0; i < dots; ++i) {
      tmp += `<div style='background-color: ${Column.DEFAULT_COLOR}' title=''></div>`;
    }

    const update = (n: HTMLElement, data: ISequence<{value: number, label: string, color: string | null}>) => {
      //adapt the number of children
      const l = data.length;
      if (n.children.length !== l) {
        n.innerHTML = data.reduce((tmp, r) => {
          return `${tmp}<div style='background-color: ${r.color}' title='${r.label}'></div>`;
        }, '');
      }
      const children = n.children;
      data.forEach((v, i) => {
        const d = children[i];
        attr(<HTMLElement>d, {
          title: v.label
        }, {
            display: isNaN(v.value) ? 'none' : null,
            left: `${round(v.value * 100, 2)}%`,
            // jitter
            top: l > 1 ? `${round(Math.random() * 80 + 10, 2)}%` : null,
            'background-color': v.color
          });
      });
    };

    const render = (ctx: CanvasRenderingContext2D, vs: number[], colors: (string | null)[], width: number) => {
      ctx.save();
      ctx.globalAlpha = DOT.opacity;
      vs.forEach((v, i) => {
        ctx.fillStyle = colors[i] || DOT.color;
        ctx.fillRect(Math.max(0, v * width - DOT.size / 2), 0, DOT.size, CANVAS_HEIGHT);
      });
      ctx.restore();
    };

    return {template: `<div>${tmp}</div>`, update, render};
  }

  create(col: INumberColumn, context: IRenderContext, imposer?: IImposer) {
    const {template, render, update} = DotCellRenderer.getDOMRenderer(col);
    const width = context.colWidth(col);
    const formatter = col.getNumberFormat();
    return {
      template,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const color = colorOf(col, d, imposer);
        if (!isNumbersColumn(col)) {
          const v = col.getNumber(d);
          return update(n, [{value: v, label: col.getLabel(d), color}]);
        }
        const data = col.getNumbers(d).filter((vi: number) => !isNaN(vi)).map((value) => ({value, label: formatter(value), color}));
        return update(n, data);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const color = colorOf(col, d, imposer);
        if (!isNumbersColumn(col)) {
          const v = col.getNumber(d);
          return render(ctx, [v], [color], width);
        }
        const vs: number[] = col.getNumbers(d).filter((vi: number) => !isNaN(vi));
        return render(ctx, vs, vs.map((_: any) => color), width);
      }
    };
  }

  createGroup(col: INumberColumn, context: IRenderContext, imposer?: IImposer) {
    const {template, update} = DotCellRenderer.getDOMRenderer(col);
    const formatter = col.getNumberFormat();

    return {
      template,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupRows(col, group, 'dot', (rows) => {
          //value, color, label,

          if (!isNumbersColumn(col)) {
            return rows.map((r) => ({value: col.getNumber(r), label: col.getLabel(r), color: colorOf(col, r, imposer)}));
          }
          // concatenate all columns
          const vs = rows.map((r) => {
            const color = colorOf(col, r, imposer);
            return col.getNumbers(r)
              .filter((vi: number) => !isNaN(vi))
              .map((value) => ({value, label: formatter(value), color}));
          });
          return Array.from(concatSeq(vs));
        }).then((data) => {
          if (typeof data !== 'symbol') {
            update(n, data);
          }
        });
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
