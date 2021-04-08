import type { Column, IDataRow } from '../model';
import type {
  ERenderMode,
  ICellRendererFactory,
  IGroupCellRenderer,
  ISummaryRenderer,
  ICellRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { noRenderer, setText } from './utils';

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
        const l = col.getLabel(d);
        setText(n, l);
        n.title = l;
      },
    };
  }

  createGroup(_col: Column): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
