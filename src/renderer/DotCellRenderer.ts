import {GUESSES_GROUP_HEIGHT} from '../constants';
import {concatSeq, ISequence, round} from '../internal';
import {Column, DEFAULT_COLOR, IDataRow, INumberColumn, IOrderedGroup, isNumberColumn, isNumbersColumn} from '../model';
import {CANVAS_HEIGHT, DOT} from '../styles';
import {colorOf} from './impose';
import {ERenderMode, ICellRendererFactory, IImposer, IRenderContext} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {noRenderer} from './utils';



/** @internal */
export default class DotCellRenderer implements ICellRendererFactory {
  readonly title = 'Dot';
  readonly groupTitle = 'Dots';

  canRender(col: Column, mode: ERenderMode) {
    return isNumberColumn(col) && mode !== ERenderMode.SUMMARY;
  }

  private static getCanvasRenderer(col: INumberColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    const pi2 = Math.PI * 2;
    const radius = DOT.size / 2;
    const render = (ctx: CanvasRenderingContext2D, vs: {value: number, color: (string | null)}[], width: number) => {
      ctx.save();
      ctx.globalAlpha = DOT.opacity;
      for (const v of vs) {
        ctx.fillStyle = v.color || DOT.color;
        const x = Math.min(width - radius, Math.max(radius, v.value * width));
        const y = round(Math.random() * (GUESSES_GROUP_HEIGHT - DOT.size) + radius, 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, pi2, true);
        ctx.fill();
      }
      ctx.restore();
    };
    return {
      template: `<canvas height="${GUESSES_GROUP_HEIGHT}"></canvas>`,
      render,
      width
    };
  }

  private static getDOMRenderer(col: INumberColumn) {
    const dots = isNumbersColumn(col) ? col.dataLength! : 1;
    let tmp = '';
    for (let i = 0; i < dots; ++i) {
      tmp += `<div style='background-color: ${DEFAULT_COLOR}' title=''></div>`;
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
        const d = <HTMLElement>children[i];
        d.title = v.label;
        d.style.display = isNaN(v.value) ? 'none' : null;
        d.style.left = `${round(v.value * 100, 2)}%`;
        // jitter
        d.style.top = l > 1 ? `${round(Math.random() * 80 + 10, 2)}%` : null;
        d.style.backgroundColor = v.color;
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
    const {template, render, width} = DotCellRenderer.getCanvasRenderer(col, context);

    return {
      template,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupRows(col, group, 'dot', (rows) => {
          //value, color, label,

          if (!isNumbersColumn(col)) {
            return Array.from(rows.map((r) => ({value: col.getNumber(r), color: colorOf(col, r, imposer)})));
          }
          // concatenate all columns
          const vs = rows.map((r) => {
            const color = colorOf(col, r, imposer);
            return col.getNumbers(r)
              .filter((vi: number) => !isNaN(vi))
              .map((value) => ({value, color}));
          });
          return Array.from(concatSeq(vs));
        }).then((data) => {
          if (typeof data === 'symbol') {
            return;
          }
          const ctx = (<HTMLCanvasElement>n).getContext('2d')!;
          ctx.canvas.width = width;
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          render(ctx, data, width);
        });
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
