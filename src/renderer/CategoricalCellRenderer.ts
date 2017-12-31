import Column from '../model/Column';
import {IDataRow, IGroup, ICategoricalColumn, isCategoricalColumn} from '../model';
import {forEachChild, setText} from './utils';
import {computeHist, ICategoricalStatistics} from '../internal/math';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {ICellRendererFactory, default as IRenderContext} from './interfaces';
import {CANVAS_HEIGHT} from '../styles';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalCellRenderer implements ICellRendererFactory {
  readonly title = 'Color';
  readonly groupTitle = 'Histogram';

  canRender(col: Column) {
    return isCategoricalColumn(col);
  }

  create(col: ICategoricalColumn & Column, context: IRenderContext) {
    const width = context.colWidth(col);
    return {
      template: `<div>
        <div></div><div></div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = col.getColor(d);
        setText(<HTMLSpanElement>n.lastElementChild!, col.getLabel(d));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        ctx.fillStyle = col.getColor(d) || '';
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
      }
    };
  }

  createGroup(col: ICategoricalColumn & Column, _context: IRenderContext, globalHist: ICategoricalStatistics | null) {
    const colors = col.categoryColors;
    const labels = col.categoryLabels;
    const bins = col.categories.map((c, i) => `<div title="${labels[i]}: 0" data-cat="${c}"><div style="height: 0; background-color: ${colors[i]}"></div></div>`).join('');

    return {
      template: `<div>${bins}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {maxBin, hist} = computeHist(rows, (r: IDataRow) => col.getCategories(r), col.categories);

        const max = Math.max(maxBin, globalHist ? globalHist.maxBin : 0);
        forEachChild(n, (d: HTMLElement, i) => {
          const {y} = hist[i];
          d.title = `${labels[i]}: ${y}`;
          const inner = <HTMLElement>d.firstElementChild!;
          inner.style.height = `${Math.round(y * 100 / max)}%`;
        });
      }
    };
  }
}
