import type { Column, IDataRow, NumberColumn } from '../model';
import type {
  ERenderMode,
  ICellRendererFactory,
  IGroupCellRenderer,
  ISummaryRenderer,
  ICellRenderer,
  IRenderContext,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { noRenderer, setText } from './utils';
import { cssClass } from '../styles';

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

  create(col: Column, context?: IRenderContext): ICellRenderer {
    const align = (col instanceof NumberColumn && col.alignment !== 'left') 
      ? (context ? context.sanitize(col.alignment) : col.alignment)
      : '';
    return {
      template: `<div${align ? ` class="${cssClass(align)}"` : ''}> </div>`,
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
