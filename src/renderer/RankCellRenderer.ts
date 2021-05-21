import { Column, RankColumn, IDataRow, IOrderedGroup } from '../model';
import type { ICellRendererFactory, ISummaryRenderer, IGroupCellRenderer, ICellRenderer } from './interfaces';
import { renderMissingDOM } from './missing';
import { noRenderer, setText } from './utils';
import { cssClass } from '../styles';

export default class RankCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Default';

  canRender(col: Column) {
    return col instanceof RankColumn;
  }

  create(col: Column): ICellRenderer {
    return {
      template: `<div class="${cssClass('right')}"> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        setText(n, col.getLabel(d));
      },
    };
  }

  createGroup(col: Column): IGroupCellRenderer {
    const ranking = col.findMyRanker()!;
    return {
      template: `<div><div></div><div></div></div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        const fromTSpan = n.firstElementChild! as HTMLElement;
        const toTSpan = n.lastElementChild! as HTMLElement;
        if (group.order.length === 0) {
          fromTSpan.textContent = '';
          toTSpan.textContent = '';
          return;
        }
        fromTSpan.textContent = ranking.getRank(group.order[0]).toString();
        toTSpan.textContent = ranking.getRank(group.order[group.order.length - 1]).toString();
      },
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
