import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import StringColumn from '../model/StringColumn';
import {filterMissingMarkup} from '../ui/missing';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
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
    const examples = <string[]>[];
    for (const row of rows) {
      if (col.isMissing(row)) {
        continue;
      }
      const v = col.getLabel(row);
      examples.push(v);
      if (examples.length >= numExampleRows) {
        break;
      }
    }
    return `${examples.join(', ')}${examples.length < rows.length} ? ', &hellip;': ''}`;
  }

  createGroup(col: StringColumn) {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, _group: IGroup, rows: IDataRow[]) => {
        n.innerHTML = `${StringCellRenderer.exampleText(col, rows)}`;
      }
    };
  }

  private static interactiveSummary(col: StringColumn, node: HTMLElement) {
    const filterMissing = <HTMLInputElement>node.querySelector('input[type="checkbox"].lu_filter_missing');
    const input = <HTMLInputElement>node.querySelector('input[type="text"]');
    const isRegex = <HTMLInputElement>node.querySelector('input[type="checkbox"]:first-of-type');

    const update = () => {
      if (filterMissing.checked) {
        col.setFilter(StringColumn.FILTER_MISSING);
        return;
      }
      col.setFilter(isRegex ? new RegExp(input.value) : input.value);
    };

    filterMissing.onchange = update;
    input.onchange = update;
    isRegex.onchange = update;

    return () => {
      let bak = col.getFilter() || '';
      const bakMissing = bak === StringColumn.FILTER_MISSING;
      if (bakMissing) {
        bak = '';
      }
      filterMissing.checked = bakMissing;
      input.value = bak instanceof RegExp ? bak.source : bak;
      isRegex.checked = bak instanceof RegExp;
    };
  }

  createSummary(col: StringColumn, _context: IRenderContext, interactive: boolean) {
    if (!interactive) {
      return {
        template: `<div></div>`,
        update: (node: HTMLElement) => {
          const filter = col.getFilter() || '';
          node.textContent = filter === StringColumn.FILTER_MISSING ? '' : String(filter);
        }
      };
    }
    let bak = col.getFilter() || '';
    const bakMissing = bak === StringColumn.FILTER_MISSING;
    if (bakMissing) {
      bak = '';
    }
    let update: () => void;

    return {
      template: `<input type="text" placeholder="containing..." autofocus value="${(bak instanceof RegExp) ? bak.source : bak}" style="width: 100%">
          <label><input type="checkbox" ${(bak instanceof RegExp) ? 'checked="checked"' : ''}>RegExp</label>
          ${filterMissingMarkup(bakMissing)}`,
      update: (node: HTMLElement) => {
        if (!update) {
          update = StringCellRenderer.interactiveSummary(col, node);
        }
        update();
      }
    };
  }
}
