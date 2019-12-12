import {Column, ICategoricalLikeColumn, IDataRow, IOrderedGroup, ISetColumn, isSetColumn} from '../model';
import {CANVAS_HEIGHT, cssClass} from '../styles';
import {ICellRendererFactory, IRenderContext, ICellRenderer, IGroupCellRenderer, ISummaryRenderer} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {forEachChild, noop, wideEnoughCat} from './utils';
import {round} from '../internal';

export default class SetCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Matrix';

  canRender(col: Column): boolean {
    return isSetColumn(col);
  }

  private static createDOMContext(col: ICategoricalLikeColumn) {
    const categories = col.categories;
    const mapping = col.getColorMapping();
    let templateRows = '';
    for (const cat of categories) {
      templateRows += `<div class="${cssClass('heatmap-cell')}" title="${cat.label}" style="background-color: ${mapping.apply(cat)}"></div>`;
    }
    return {
      templateRow: templateRows,
      render: (n: HTMLElement, value: (number | boolean)[]) => {
        forEachChild(n, (d: HTMLElement, i) => {
          const v = value[i];
          d.style.opacity = typeof v === 'boolean' ? (v ? '1' : '0') : round(v, 2).toString();
        });
      }
    };
  }

  create(col: ISetColumn, context: IRenderContext): ICellRenderer {
    const {templateRow, render} = SetCellRenderer.createDOMContext(col);
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
          const posx = (j * cellDimension);
          ctx.fillStyle = mapping.apply(d);
          ctx.fillRect(posx, 0, cellDimension, CANVAS_HEIGHT);
        });

        ctx.restore();
      }
    };
  }

  createGroup(col: ISetColumn, context: IRenderContext): IGroupCellRenderer {
    const {templateRow, render} = SetCellRenderer.createDOMContext(col);
    return {
      template: `<div class="${cssClass('heatmap')}">${templateRow}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupCategoricalStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          render(n, r.group.hist.map((d) => d.count / r.group.maxBin));
        });
      }
    };
  }

  createSummary(col: ICategoricalLikeColumn): ISummaryRenderer {
    const categories = col.categories;
    const mapping = col.getColorMapping();
    let templateRows = `<div class="${cssClass('heatmap')}">`;
    const labels = wideEnoughCat(col);
    for (const cat of categories) {
      templateRows += `<div class="${cssClass('heatmap-cell')}" title="${cat.label}"${labels ? ` data-title="${cat.label}"` : ''} style="background-color: ${mapping.apply(cat)}"></div>`;
    }
    templateRows += '</div>';
    return {
      template: templateRows,
      update: noop
    };
  }
}
