import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import StringColumn from '../model/StringColumn';
import {ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, setText} from './utils';


/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 */
export default class StringCellRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof StringColumn;
  }

  create(col: StringColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<div${align !== 'left' ? ` class="lu-${align}"` : ''}> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
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
    let examples = rows
      .slice(0, numExampleRows)
      .map((r) => col.getLabel(r))
      .join(', ');

    if (rows.length > numExampleRows) {
      examples += ', &hellip;';
    }
    return examples;
  }

  createGroup(col: StringColumn) {
    return {
      template: `<div class="text"> </div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        n.innerHTML = `${StringCellRenderer.exampleText(col, rows)}`;
      }
    };
  }
}
