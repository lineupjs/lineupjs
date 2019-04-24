import {INumberBin, IStatistics} from '../internal';
import {Column, CompositeNumberColumn, IDataRow, IOrderedGroup, INumberColumn} from '../model';
import {CANVAS_HEIGHT, cssClass} from '../styles';
import {getHistDOMRenderer} from './HistogramCellRenderer';
import {IRenderContext, ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {createData} from './MultiLevelCellRenderer';
import {colorOf, matchColumns, forEachChild} from './utils';
import {tasksAll} from '../provider';
import {IHistogramLike} from './histogram';


/** @internal */
export default class InterleavingCellRenderer implements ICellRendererFactory {
  readonly title = 'Interleaved';

  canRender(col: Column) {
    return col instanceof CompositeNumberColumn;
  }

  create(col: CompositeNumberColumn, context: IRenderContext) {
    const {cols} = createData(col, context, false, ERenderMode.CELL);
    const width = context.colWidth(col);
    return {
      template: `<div>${cols.map((r) => r.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IOrderedGroup) => {
        const missing = renderMissingDOM(n, col, d);
        if (missing) {
          return;
        }
        matchColumns(n, cols, context);
        forEachChild(n, (ni: HTMLElement, j) => {
          cols[j].renderer!.update(ni, d, i, group);
        });
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow, _i: number, group: IOrderedGroup) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }

        ctx.save();
        ctx.scale(1, 1 / cols.length); // scale since internal use the height, too
        cols.forEach((r, i) => {
          const rr = r.renderer!;
          if (rr.render) {
            rr.render(ctx, d, i, group);
          }
          ctx.translate(0, CANVAS_HEIGHT);
        });
        ctx.restore();
      }
    };
  }

  createGroup(col: CompositeNumberColumn, context: IRenderContext) {
    const {cols} = createData(col, context, false, ERenderMode.GROUP);
    return {
      template: `<div>${cols.map((r) => r.template).join('')}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        matchColumns(n, cols, context);
        forEachChild(n, (ni: HTMLElement, j) => {
          cols[j].groupRenderer!.update(ni, group);
        });
      }
    };
  }

  createSummary(col: CompositeNumberColumn, context: IRenderContext, _interactive: boolean) {
    const cols = col.children;
    let acc = 0;
    const {template, render} = getHistDOMRenderer(col, {
      color: () => colorOf(cols[(acc++) % cols.length])
    });
    return {
      template,
      update: (n: HTMLElement) => {
        const tasks = cols.map((col) => context.tasks.summaryNumberStats(<INumberColumn>col));

        return tasksAll(tasks).then((vs) => {
          if (typeof vs === 'symbol') {
            return;
          }
          const summaries = vs.map((d) => d.summary);
          if (!summaries.some(Boolean)) {
            n.classList.add(cssClass('missing'));
            return;
          }
          n.classList.remove(cssClass('missing'));
          const grouped = groupedHist(summaries)!;
          render(n, grouped);
        });
      }
    };
  }
}

const dummyBin: INumberBin = {
  count: 0,
  x0: 0,
  x1: 0
};

function groupedHist(stats: (IStatistics | null)[]): IHistogramLike<number> | null {
  const sample = stats.find(Boolean)!;
  if (!sample) {
    return null;
  }

  const bins = sample.hist.length;
  // assert all have the same bin size
  const hist = <INumberBin[]>[];
  let maxBin = 0;
  for (let i = 0; i < bins; ++i) {
    stats.forEach((s) => {
      const bin = s ? s.hist[i] : null;
      if (!bin) {
        hist.push(dummyBin);
        return;
      }
      if (bin.count > maxBin) {
        maxBin = bin.count;
      }
      hist.push(bin);
    });
  }
  return {
    maxBin,
    hist
  };
}
