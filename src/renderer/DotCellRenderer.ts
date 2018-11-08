import {ICategoricalStatistics, IStatistics} from '../internal';
import {INumberColumn, IDataRow, IGroup, isMissingValue, isNumberColumn} from '../model';
/**
 * a renderer rendering a bar for numerical columns
 */
import Column from '../model/Column';
import {DEFAULT_FORMATTER, isNumbersColumn} from '../model/INumberColumn';
import {CANVAS_HEIGHT, DOT} from '../styles';
import {colorOf} from './impose';
import {default as IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {attr, forEachChild, noRenderer} from './utils';

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

    const update = (n: HTMLElement, vs: number[], labels: string[], colors: (string | null)[]) => {
      //adapt the number of children
      if (n.children.length !== vs.length) {
        let tmp = '';
        for (let i = 0; i < vs.length; ++i) {
          tmp += `<div style='background-color: ${colors[i]}' title='${labels[i]}'></div>`;
        }
        n.innerHTML = tmp;
      }
      forEachChild(n, (d: HTMLElement, i) => {
        const v = vs[i];
        attr(<HTMLElement>d, {
          title: labels[i]
        }, {
          display: isMissingValue(v) ? 'none' : null,
          left: `${Math.round(v * 100)}%`,
          // jitter
          top: vs.length > 1 ? `${Math.round(Math.random() * 80 + 10)}%` : null,
          'background-color': colors[i]
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

  create(col: INumberColumn, context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    const {template, render, update} = DotCellRenderer.getDOMRenderer(col);
    const width = context.colWidth(col);
    return {
      template,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const color = colorOf(col, d, imposer);
        const v = col.getValue(d);
        if (!isNumbersColumn(col)) {
          return update(n, [v], [col.getLabel(d)], [color]);
        }
        const vs: number[] = v.filter((vi: number) => !isMissingValue(vi));
        return update(n, vs, vs.map(DEFAULT_FORMATTER), vs.map((_: any) => color));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const color = colorOf(col, d, imposer);
        const v = col.getValue(d);
        if (!isNumbersColumn(col)) {
          return render(ctx, [v], [color], width);
        }
        const vs: number[] = v.filter((vi: number) => !isMissingValue(vi));
        return render(ctx, vs, vs.map((_: any) => color), width);
      }
    };
  }

  createGroup(col: INumberColumn, _context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    const {template, update} = DotCellRenderer.getDOMRenderer(col);
    return {
      template,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const vs = rows.map((r) => col.getValue(r));
        const colors = rows.map((r) => colorOf(col, r, imposer));

        if (!isNumbersColumn(col)) {
          return update(n, vs, rows.map((r) => col.getLabel(r)), colors);
        }
        // concatenate all columns
        const all = (<number[]>[]).concat(...vs.filter((vi: number) => !isMissingValue(vi)));
        return update(n, all, all.map(DEFAULT_FORMATTER), vs.map((_v: number[], i) => colors[i]));
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
