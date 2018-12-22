import {IDataRow, IOrderedGroup} from '../model';
import Column from '../model/Column';
import {ICategoricalLikeColumn, isCategoricalLikeColumn, isSetColumn, ISetColumn} from '../model/ICategoricalColumn';
import {CANVAS_HEIGHT, cssClass} from '../styles';
import {default as IRenderContext, ICellRendererFactory, ERenderMode} from './interfaces';
import {renderMissingCanvas, renderMissingDOM} from './missing';
import {union} from './UpSetCellRenderer';
import {noop, forEachChild, wideEnoughCat} from './utils';

/** @internal */
export default class CategoricalHeatmapCellRenderer implements ICellRendererFactory {
  title = 'Heatmap';

  canRender(col: Column, mode: ERenderMode) {
    return isCategoricalLikeColumn(col) && (mode !== ERenderMode.CELL || isSetColumn(col));
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
      render: (n: HTMLElement, value: boolean[]) => {
        forEachChild(n, (d: HTMLElement, i) => {
          const v = value[i];
          d.style.visibility = v ? null : 'hidden';
        });
      }
    };
  }

  create(col: ISetColumn, context: IRenderContext) {
    const {templateRow, render} = CategoricalHeatmapCellRenderer.createDOMContext(col);
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

  createGroup(col: ICategoricalLikeColumn, context: IRenderContext) {
    const {templateRow, render} = CategoricalHeatmapCellRenderer.createDOMContext(col);
    return {
      template: `<div class="${cssClass('heatmap')}">${templateRow}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupRows(col, group, 'union', (rows) => union(col, rows)).then((value) => {
          if (typeof value === 'symbol') {
            return;
          }
          render(n, value);
        });
      }
    };
  }

  createSummary(col: ICategoricalLikeColumn) {
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
