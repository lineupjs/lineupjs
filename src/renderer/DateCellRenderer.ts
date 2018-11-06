import {IDataRow} from '../model';
import Column from '../model/Column';
import {ICellRendererFactory, IGroupCellRenderer, ISummaryRenderer, ICellRenderer} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer, setText} from './utils';
import DateColumn from '../model/DateColumn';

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

  createGroup(_col: DateColumn): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
