import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noRenderer, setText} from './utils';
import {cssClass} from '../styles';
import LinkColumn from '../model/LinkColumn';

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

  private static exampleText(col: LinkColumn, rows: IDataRow[]) {
    const numExampleRows = 5;
    const examples = <string[]>[];
    for (const row of rows) {
      if (col.isMissing(row)) {
        continue;
      }
      const v = col.getLink(row);
      examples.push(`<a target="_blank" rel="noopener"  href="${v ? v.href : ''}">${v ? v.alt : ''}</a>`);
      if (examples.length >= numExampleRows) {
        break;
      }
    }
    return `${examples.join(', ')}${examples.length < rows.length ? ', &hellip;' : ''}`;
  }

  createGroup(col: LinkColumn) {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        n.innerHTML = `${LinkCellRenderer.exampleText(col, rows)}`;
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
