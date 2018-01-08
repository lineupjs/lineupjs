import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import RankColumn from '../model/RankColumn';
import {ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer, setText} from './utils';

/** @internal */
export default class RankCellRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof RankColumn;
  }

  create(col: Column) {
    return {
      template: `<div class="lu-right"> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        setText(n, col.getLabel(d));
      },
      render: noop
    };
  }

  createGroup(col: Column) {
    return {
      template: `<div><div></div><div></div></div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const fromTSpan = <HTMLElement>n.firstElementChild!;
        const toTSpan = <HTMLElement>n.lastElementChild!;
        if (rows.length === 0) {
          fromTSpan.textContent = '';
          toTSpan.textContent = '';
          return;
        }
        fromTSpan.textContent = col.getLabel(rows[0]);
        toTSpan.textContent = col.getLabel(rows[rows.length - 1],);
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
