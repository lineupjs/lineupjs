import { categoricalStatsBuilder } from '../internal';
import { isCategoricalsColumn, type ICategoricalsColumn, type Column, type IDataRow } from '../model';
import { ERenderMode, type ICellRenderer, type ICellRendererFactory, type IRenderContext } from './interfaces';
import { renderMissingDOM } from './missing';
import { categoricalHistogram } from './categoricalHistogram';

export default class CategoricalsHistogramCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Histogram';

  canRender(col: Column, mode: ERenderMode): boolean {
    return isCategoricalsColumn(col) && mode === ERenderMode.CELL;
  }

  create(col: ICategoricalsColumn, context: IRenderContext): ICellRenderer {
    const { template, update, matchBins } = categoricalHistogram(col, false, context.sanitize);

    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, row: IDataRow) => {
        if (renderMissingDOM(n, col, row)) {
          return;
        }
        matchBins(n);
        const b = categoricalStatsBuilder(col.categories);
        col.iterCategory(row).forEach((cat) => b.push(cat));
        update(n, b.build());
      },
    };
  }
}
