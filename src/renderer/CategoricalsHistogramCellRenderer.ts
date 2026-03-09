import { categoricalStatsBuilder } from '../internal';
import {
  isCategoricalsColumn,
  type ICategoricalsColumn,
  type Column,
  type IDataRow,
  type IOrderedGroup,
} from '../model';
import { cssClass } from '../styles';
import {
  ERenderMode,
  type ICellRenderer,
  type ICellRendererFactory,
  type IGroupCellRenderer,
  type IRenderContext,
  type ISummaryRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { wideEnough } from './utils';
import { categoricalHistogram } from './categoricalHistogram';

export default class CategoricalsHistogramCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Histogram';

  canRender(col: Column, mode: ERenderMode): boolean {
    return (
      isCategoricalsColumn(col) &&
      (mode === ERenderMode.CELL || mode === ERenderMode.GROUP || mode === ERenderMode.SUMMARY)
    );
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

  createGroup(col: ICategoricalsColumn, context: IRenderContext): IGroupCellRenderer {
    const { template, update, matchBins } = categoricalHistogram(col, false, context.sanitize);

    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        matchBins(n);
        return context.tasks.groupCategoricalStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const isMissing = !r || r.group == null || r.group.count === 0 || r.group.count === r.group.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          update(n, r.group);
        });
      },
    };
  }

  createSummary(col: ICategoricalsColumn, context: IRenderContext, interactive: boolean): ISummaryRenderer {
    const { template, update, matchBins } = categoricalHistogram(col, interactive || wideEnough(col), context.sanitize);

    return {
      template: `${template}</div>`,
      update: (n: HTMLElement) => {
        matchBins(n);
        return context.tasks.summaryCategoricalStats(col).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const isMissing = !r || r.summary == null || r.summary.count === 0 || r.summary.count === r.summary.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          update(n, r.summary);
        });
      },
    };
  }
}
