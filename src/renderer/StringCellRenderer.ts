import { IDataRow, IGroup } from '../model';
import Column from '../model/Column';
import StringColumn from '../model/StringColumn';
import { filterMissingMarkup, findFilterMissing } from '../ui/missing';
import { default as IRenderContext, ICellRendererFactory } from './interfaces';
import { renderMissingDOM } from './missing';
import { noop, setText, randomId } from './utils';


/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 * @internal
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
    return `${examples.join(', ')}${examples.length < rows.length ? ', &hellip;' : ''}`;
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
    const form = <HTMLFormElement>node;
    const filterMissing = findFilterMissing(node);
    const input = <HTMLInputElement>node.querySelector('input[type="text"]');
    const isRegex = <HTMLInputElement>node.querySelector('input[type="checkbox"]');

    const update = () => {
      input.disabled = filterMissing.checked;
      isRegex.disabled = filterMissing.checked;

      if (filterMissing.checked) {
        col.setFilter(StringColumn.FILTER_MISSING);
        return;
      }
      const valid = input.value.trim();
      filterMissing.disabled = valid.length > 0;
      if (valid.length <= 0) {
        col.setFilter(null);
        return;
      }
      col.setFilter(isRegex.checked ? new RegExp(input.value) : input.value);
    };

    filterMissing.onchange = update;
    input.onchange = update;
    isRegex.onchange = update;
    form.onsubmit = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      update();
      return false;
    };

    return (actCol: StringColumn) => {
      col = actCol;
      let bak = col.getFilter() || '';
      const bakMissing = bak === StringColumn.FILTER_MISSING;
      if (bakMissing) {
        bak = '';
      }
      filterMissing.checked = bakMissing;
      input.value = bak instanceof RegExp ? bak.source : bak;
      isRegex.checked = bak instanceof RegExp;
      filterMissing.disabled = input.value.trim().length > 0;
      input.disabled = filterMissing.checked;
      isRegex.disabled = filterMissing.checked;
    };
  }

  createSummary(col: StringColumn, context: IRenderContext, interactive: boolean) {
    if (!interactive) {
      return {
        template: `<div></div>`,
        update: (node: HTMLElement) => {
          const filter = col.getFilter() || '';
          node.textContent = toString(filter);
        }
      };
    }
    let bak = col.getFilter() || '';
    const bakMissing = bak === StringColumn.FILTER_MISSING;
    if (bakMissing) {
      bak = '';
    }
    let update: (col: StringColumn) => void;
    const id = randomId(context.idPrefix);
    return {
      template: `<form><input type="text" placeholder="containing..." autofocus value="${(bak instanceof RegExp) ? bak.source : bak}">
          <div class="lu-checkbox"><input id="${id}" type="checkbox" ${(bak instanceof RegExp) ? 'checked="checked"' : ''}><label for="${id}">RegExp</label></div>
          ${filterMissingMarkup(bakMissing, context.idPrefix)}</form>`,
      update: (node: HTMLElement) => {
        if (!update) {
          update = StringCellRenderer.interactiveSummary(col, node);
        }
        update(col);
      }
    };
  }
}

function toString(filter: null | string | RegExp) {
  if (filter == null || filter === '' || filter === StringColumn.FILTER_MISSING) {
    return '';
  }
  if (filter instanceof RegExp) {
    return filter.source;
  }
  return String(filter);
}
