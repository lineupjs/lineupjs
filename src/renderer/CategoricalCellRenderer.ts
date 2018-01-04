import {computeHist, ICategoricalStatistics} from '../internal/math';
import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import Column from '../model/Column';
import {CANVAS_HEIGHT} from '../styles';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {forEachChild, setText} from './utils';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalCellRenderer implements ICellRendererFactory {
  readonly title = 'Color';
  readonly groupTitle = 'Histogram';

  canRender(col: Column) {
    return isCategoricalColumn(col);
  }

  create(col: ICategoricalColumn, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div>
        <div></div><div></div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        const v = col.getCategory(d);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = v ? v.color : null;
        setText(<HTMLSpanElement>n.lastElementChild!, col.getLabel(d));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const v = col.getCategory(d);
        ctx.fillStyle = v ? v.color : '';
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
      }
    };
  }

  createGroup(col: ICategoricalColumn, _context: IRenderContext, globalHist: ICategoricalStatistics | null) {
    const bins = col.categories.map((c) => `<div title="${c.label}: 0" data-cat="${c.name}"><div style="height: 0; background-color: ${c.color}"></div></div>`).join('');

    return {
      template: `<div>${bins}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {maxBin, hist} = computeHist(rows, (r: IDataRow) => col.isMissing(r) ? '' : col.getCategory(r)!.name, col.categories.map((d) => d.name));

        const max = Math.max(maxBin, globalHist ? globalHist.maxBin : 0);
        forEachChild(n, (d: HTMLElement, i) => {
          const {y} = hist[i];
          d.title = `${col.categories[i].label}: ${y}`;
          const inner = <HTMLElement>d.firstElementChild!;
          inner.style.height = `${Math.round(y * 100 / max)}%`;
        });
      }
    };
  }
}
