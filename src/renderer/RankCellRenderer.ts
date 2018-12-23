import {Column, RankColumn, IDataRow, IOrderedGroup} from '../model';
import {ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noRenderer, setText} from './utils';
import {cssClass} from '../styles';

/** @internal */
export default class RankCellRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof RankColumn;
  }

  create(col: Column) {
    return {
      template: `<div class="${cssClass('right')}"> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        setText(n, col.getLabel(d));
      }
    };
  }

  createGroup(col: Column) {
    const ranking = col.findMyRanker()!;
    return {
      template: `<div><div></div><div></div></div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        const fromTSpan = <HTMLElement>n.firstElementChild!;
        const toTSpan = <HTMLElement>n.lastElementChild!;
        if (group.order.length === 0) {
          fromTSpan.textContent = '';
          toTSpan.textContent = '';
          return;
        }
        fromTSpan.textContent = ranking.getRank(group.order[0]).toString();
        toTSpan.textContent = ranking.getRank(group.order[group.order.length - 1]).toString();
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
