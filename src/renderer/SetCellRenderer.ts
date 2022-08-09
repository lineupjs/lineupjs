import { Column, ICategoricalLikeColumn, IDataRow, IOrderedGroup, ISetColumn, isSetColumn } from '../model';
import { CANVAS_HEIGHT, cssClass } from '../styles';
import type {
  ICellRendererFactory,
  IRenderContext,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingCanvas, renderMissingDOM } from './missing';
import { forEachChild, noop, wideEnoughCat } from './utils';
import { round } from '../internal';

export default class SetCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Matrix';

  canRender(col: Column): boolean {
    return isSetColumn(col);
  }

  private static createDOMContext(col: ICategoricalLikeColumn, sanitize: (v: string) => string) {
    const categories = col.categories;
    const mapping = col.getColorMapping();
    let templateRows = '';
    for (const cat of categories) {
      templateRows += `<div class="${cssClass('heatmap-cell')}" title="${sanitize(
        cat.label
      )}" style="background-color: ${mapping.apply(cat)}"></div>`;
    }
    return {
      templateRow: templateRows,
      render: (n: HTMLElement, value: (number | boolean)[]) => {
        forEachChild(n, (d: HTMLElement, i) => {
          const v = value[i];
          d.style.backgroundColor = mapping.apply(categories[i]);
          d.style.opacity = typeof v === 'boolean' ? (v ? '1' : '0') : round(v, 2).toString();
        });
      },
    };
  }

  create(col: ISetColumn, context: IRenderContext): ICellRenderer {
    const { templateRow, render } = SetCellRenderer.createDOMContext(col, context.sanitize);
    const width = context.colWidth(col);
    const cellDimension = width / col.dataLength!;
    const cats = col.categories;
    const mapping = col.getColorMapping();

    return {
      template: `<div class="${cssClass('heatmap')}">${templateRow}</div>`,
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

        ctx.save();
        cats.forEach((d, j) => {
          if (!data[j]) {
            return;
          }
          const posX = j * cellDimension;
          ctx.fillStyle = mapping.apply(d);
          ctx.fillRect(posX, 0, cellDimension, CANVAS_HEIGHT);
        });

        ctx.restore();
      },
    };
  }

  createGroup(col: ISetColumn, context: IRenderContext): IGroupCellRenderer {
    const { templateRow, render } = SetCellRenderer.createDOMContext(col, context.sanitize);
    return {
      template: `<div class="${cssClass('heatmap')}">${templateRow}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupCategoricalStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const isMissing = !r || !r.group || r.group.count === 0 || r.group.count === r.group.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          render(
            n,
            r.group.hist.map((d) => d.count / r.group.maxBin)
          );
        });
      },
    };
  }

  createSummary(col: ICategoricalLikeColumn, context: IRenderContext): ISummaryRenderer {
    const categories = col.categories;
    const mapping = col.getColorMapping();
    let templateRows = `<div class="${cssClass('heatmap')}">`;
    const labels = wideEnoughCat(col);
    for (const cat of categories) {
      templateRows += `<div class="${cssClass('heatmap-cell')}" title="${context.sanitize(cat.label)}"${
        labels ? ` data-title="${context.sanitize(cat.label)}"` : ''
      } style="background-color: ${mapping.apply(cat)}"></div>`;
    }
    templateRows += '</div>';
    return {
      template: templateRows,
      update: noop,
    };
  }
}
