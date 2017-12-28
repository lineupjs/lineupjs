import ICellRendererFactory from './ICellRendererFactory';
import {ICategoricalColumn, isCategoricalColumn} from '../model/ICategoricalColumn';
import Column, {ICategoricalStatistics} from '../model/Column';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {clipText, forEachChild, setText} from '../utils';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import {computeHist} from '../provider/math';
import {renderMissingCanvas, renderMissingDOM} from './missing';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalCellRenderer implements ICellRendererFactory {
  readonly title = 'Color';
  readonly groupTitle = 'Histogram';

  canRender(col: Column) {
    return isCategoricalColumn(col);
  }

  createDOM(col: ICategoricalColumn & Column): IDOMCellRenderer {
    return {
      template: `<div>
        <div></div><div></div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        (<HTMLDivElement>n.firstElementChild!).style.backgroundColor = col.getColor(d.v, d.dataIndex);
        setText(<HTMLSpanElement>n.lastElementChild!, col.getLabel(d.v, d.dataIndex));
      }
    };
  }

  createCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      if (renderMissingCanvas(ctx, col, d, context.rowHeight(i))) {
        return;
      }
      ctx.fillStyle = col.getColor(d.v, d.dataIndex) || '';
      const cell = Math.min(context.colWidth(col) * 0.3, Math.max(context.rowHeight(i) - padding * 2, 0));
      ctx.fillRect(0, 0, cell, cell);
      ctx.fillStyle = context.option('style.text', 'black');
      clipText(ctx, col.getLabel(d.v, d.dataIndex), cell + 2, 0, context.colWidth(col) - cell - 2, context.textHints);
    };
  }

  createGroupDOM(col: ICategoricalColumn & Column): IDOMGroupRenderer {
    const colors = col.categoryColors;
    const labels = col.categoryLabels;
    const bins = col.categories.map((c, i) => `<div title="${labels[i]}: 0" data-cat="${c}"><div style="height: 0; background-color: ${colors[i]}"></div></div>`).join('');

    return {
      template: `<div>${bins}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[], globalHist: ICategoricalStatistics | null) => {
        const {maxBin, hist} = computeHist(rows, rows.map((r) => r.dataIndex), (r: IDataRow) => col.getCategories(r.v, r.dataIndex), col.categories);

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

  createGroupCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const padding = context.option('rowBarPadding', 1);
    const cats = col.categories;
    const colors = col.categoryColors;
    const widthPerBin = context.colWidth(col) / cats.length;

    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], _dx: number, _dy: number, globalHist: ICategoricalStatistics | null) => {
      const {maxBin, hist} = computeHist(rows, rows.map((r) => r.dataIndex), (r: IDataRow) => col.getCategories(r.v, r.dataIndex), col.categories);
      const max = Math.max(maxBin, globalHist ? globalHist.maxBin : 0);

      const total = context.groupHeight(group) - padding;
      hist.forEach(({y}, i) => {
        const height = (y / max) * total;
        ctx.fillStyle = colors[i];
        ctx.fillRect(i * widthPerBin + padding, (total - height) + padding, widthPerBin - 2 * padding, height);
      });
    };
  }
}
