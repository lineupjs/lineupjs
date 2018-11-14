import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import {ICellRendererFactory, IGroupCellRenderer, ISummaryRenderer, ICellRenderer} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer, setText, exampleText} from './utils';
import DateColumn, {choose} from '../model/DateColumn';

/** @internal */
export default class DateCellRenderer implements ICellRendererFactory {
  title = 'Date';
  groupTitle = 'Date';
  summaryTitle = 'Date';

  canRender(col: Column) {
    return col instanceof DateColumn;
  }

  create(col: DateColumn): ICellRenderer {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        setText(n, col.getLabel(d));
      },
      render: noop
    };
  }

  createGroup(col: DateColumn): IGroupCellRenderer {
    const isGrouped = col.isGroupedBy() >= 0;
    const grouper = col.getDateGrouper();
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        if (isGrouped) {
          const chosen = choose(rows, grouper, col);
          setText(n, chosen.name);
          return;
        }
        setText(n, exampleText(col, rows));
      }
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
