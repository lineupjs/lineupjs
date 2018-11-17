import {INumberBin, IStatistics} from '../internal';
import {IDataRow, IGroup, IGroupMeta} from '../model';
import Column from '../model/Column';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import {CANVAS_HEIGHT, cssClass} from '../styles';
import {getHistDOMRenderer} from './HistogramCellRenderer';
import {default as IRenderContext, ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {createData} from './MultiLevelCellRenderer';
import {matchColumns, forEachChild} from './utils';
import {colorOf} from '../ui/dialogs/utils';


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
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IGroup, meta: IGroupMeta) => {
        const missing = renderMissingDOM(n, col, d);
        if (missing) {
          return;
        }
        matchColumns(n, cols, context);
        forEachChild(n, (ni: HTMLElement, j) => {
          cols[j].renderer!.update(ni, d, i, group, meta);
        });
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow, _i: number, group: IGroup, meta: IGroupMeta) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }

        ctx.save();
        ctx.scale(1, 1 / cols.length); // scale since internal use the height, too
        cols.forEach((r, i) => {
          const rr = r.renderer!;
          if (rr.render) {
            rr.render(ctx, d, i, group, meta);
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
      update: (n: HTMLElement, group: IGroup, rows: IDataRow[]) => {
        matchColumns(n, cols, context);
        forEachChild(n, (ni: HTMLElement, j) => {
          cols[j].groupRenderer!.update(ni, group, rows);
        });
      }
    };
  }

  createSummary(col: CompositeNumberColumn, context: IRenderContext, _interactive: boolean, globalHist: IStatistics | null) {
    const cols = col.children;
    let acc = 0;
    const {template, render} = getHistDOMRenderer(globalHist, col, {
      color: () => colorOf(cols[(acc++) % cols.length])
    });
    return {
      template,
      update: (n: HTMLElement) => {
        const stats = cols.map((c) => <IStatistics | null>context.statsOf(<any>c));
        if (!stats.some(Boolean)) {
          n.classList.add(cssClass('missing'));
          return;
        }
        n.classList.remove(cssClass('missing'));
        const grouped = groupedHist(stats);
        render(n, grouped);
      }
    };
  }
}

const dummyBin: INumberBin = {
  length: 0,
  x0: 0,
  x1: 0
};

function groupedHist(stats: (IStatistics | null)[]) {
  const sample = stats.find(Boolean)!;
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
      if (bin.length > maxBin) {
        maxBin = bin.length;
      }
      hist.push(bin);
    });
  }
  return {maxBin, hist};
}
