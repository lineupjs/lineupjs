import {LinkColumn, Column, IDataRow, IOrderedGroup} from '../model';
import {IRenderContext, ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noRenderer, setText} from './utils';
import {cssClass} from '../styles';
import {ISequence} from '../internal';

/** @internal */
export default class LinkCellRenderer implements ICellRendererFactory {
  readonly title = 'Link';

  canRender(col: Column, mode: ERenderMode) {
    return col instanceof LinkColumn && mode !== ERenderMode.SUMMARY;
  }

  create(col: LinkColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<a${align !== 'left' ? ` class="${cssClass(align)}"` : ''} target="_blank" rel="noopener" href=""></a>`,
      update: (n: HTMLAnchorElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const v = col.getLink(d);
        n.href = v ? v.href : '';
        if (col.escape) {
          setText(n, v ? v.alt : '');
        } else {
          n.innerHTML = v ? v.alt : '';
        }
      }
    };
  }

  private static exampleText(col: LinkColumn, rows: ISequence<IDataRow>) {
    const numExampleRows = 5;
    const examples = <string[]>[];
    rows.every((row) => {
      const v = col.getLink(row);
      if (!v) {
        return true;
      }
      examples.push(`<a target="_blank" rel="noopener"  href="${v.href}">${v.alt}</a>`);
      return examples.length < numExampleRows;
    });
    return `${examples.join(', ')}${examples.length < rows.length ? ', &hellip;' : ''}`;
  }

  createGroup(col: LinkColumn, context: IRenderContext) {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, group: IOrderedGroup) => {
        return context.tasks.groupExampleRows(col, group, 'link', (rows) => LinkCellRenderer.exampleText(col, rows)).then((text) => {
          if (typeof text !== 'symbol') {
            n.innerHTML = text;
          }
        });
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
