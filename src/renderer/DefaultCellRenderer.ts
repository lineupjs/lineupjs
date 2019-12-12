import {Column, IDataRow} from '../model';
import {ERenderMode, ICellRendererFactory, IGroupCellRenderer, ISummaryRenderer, ICellRenderer} from './interfaces';
import {renderMissingDOM} from './missing';
import {noRenderer, setText} from './utils';

/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ICellRendererFactory {
  title = 'String';
  groupTitle = 'None';
  summaryTitle = 'None';

  canRender(_col: Column, _mode: ERenderMode): boolean {
    return true;
  }

  create(col: Column): ICellRenderer {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        setText(n, col.getLabel(d));
      }
    };
  }

  createGroup(_col: Column): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
