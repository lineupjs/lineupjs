import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import StringColumn from '../model/StringColumn';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer, setText} from './utils';

/** @internal */
export default class LinkCellRenderer implements ICellRendererFactory {
  readonly title = 'Link';

  canRender(col: Column, mode: ERenderMode) {
    return col instanceof StringColumn && mode !== ERenderMode.SUMMARY;
  }

  create(col: StringColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<a${align !== 'left' ? ` class="lu-${align}"` : ''} target="_blank" href=""></a>`,
      update: (n: HTMLAnchorElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        n.href = col.getValue(d);
        if (col.escape) {
          setText(n, col.getLabel(d));
        } else {
          n.innerHTML = col.getLabel(d);
        }
      },
      render: noop
    };
  }

  private static exampleText(col: Column, rows: IDataRow[]) {
    const numExampleRows = 5;
    const examples = <string[]>[];
    for (const row of rows) {
      if (col.isMissing(row)) {
        continue;
      }
      examples.push(`<a target="_blank" href="${col.getValue(row)}">${col.getLabel(row)}</a>`);
      if (examples.length >= numExampleRows) {
        break;
      }
    }
    return `${examples.join(', ')}${examples.length < rows.length ? ', &hellip;' : ''}`;
  }

  createGroup(col: StringColumn) {
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
