import {
  StringColumn,
  Column,
  type IDataRow,
  type IOrderedGroup,
  type IStringFilter,
  EStringFilterType,
} from '../model';
import { filterMissingMarkup, findFilterMissing } from '../ui/missing';
import type {
  IRenderContext,
  ICellRendererFactory,
  ISummaryRenderer,
  IGroupCellRenderer,
  ICellRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { setText, exampleText } from './utils';
import { cssClass } from '../styles';
import { debounce } from '../internal';

/**
 * renders a string with additional alignment behavior
 * one instance factory shared among strings
 */
export default class StringCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Default';

  canRender(col: Column): boolean {
    return col instanceof StringColumn;
  }

  create(col: StringColumn, context: IRenderContext): ICellRenderer {
    const align = context.sanitize(col.alignment || 'left');
    return {
      template: `<div${align !== 'left' ? ` class="${cssClass(align)}"` : ''}> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        if (col.escape) {
          setText(n, col.getLabel(d));
        } else {
          n.innerHTML = col.getLabel(d);
        }
        n.title = n.textContent!;
      },
    };
  }

  createGroup(col: StringColumn, context: IRenderContext): IGroupCellRenderer {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, group: IOrderedGroup) => {
        return context.tasks
          .groupExampleRows(col, group, 'string', (rows) => exampleText(col, rows))
          .then((text) => {
            if (typeof text === 'symbol') {
              return;
            }
            n.classList.toggle(cssClass('missing'), !text);
            if (col.escape) {
              setText(n, text);
            } else {
              n.innerHTML = text;
              n.title = text;
            }
          });
      },
    };
  }

  private static interactiveSummary(col: StringColumn, node: HTMLElement) {
    const form = node as HTMLFormElement;
    const filterMissing = findFilterMissing(node);
    const input = node.querySelector<HTMLInputElement>('input[type="text"]');
    const radioButtons = node.querySelectorAll<HTMLInputElement>('input[name="searchOptions"]');
    let isInputFocused = false;

    const toInput = (text: string, filterType: EStringFilterType) => {
      const v = text.trim();
      if (v === '') {
        return null;
      }
      return filterType === EStringFilterType.regex ? new RegExp(v, 'mi') : v;
    };

    const update = () => {
      const valid = input.value.trim();
      const checkedRadio = node.querySelector<HTMLInputElement>('input[name="searchOptions"]:checked');
      const filterType = (checkedRadio?.value as EStringFilterType) || EStringFilterType.contains;

      if (valid.length <= 0) {
        const filter = filterMissing.checked
          ? { filter: null, filterMissing: filterMissing.checked, filterType }
          : null;
        col.setFilter(filter);
        return;
      }
      col.setFilter({
        filter: toInput(input.value, filterType),
        filterMissing: filterMissing.checked,
        filterType,
      });
    };

    filterMissing.onchange = update;
    input.onchange = update;
    input.oninput = debounce(update, 100);
    input.onfocus = () => {
      isInputFocused = true;
    };
    input.onblur = () => {
      isInputFocused = false;
    };
    radioButtons.forEach((radio) => {
      radio.onchange = update;
    });
    form.onsubmit = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      update();
      return false;
    };

    return (actCol: StringColumn) => {
      // skip update of form fields if search input is currently in focus
      // otherwise this function sets an old value while typing
      if (isInputFocused) {
        return;
      }
      col = actCol;
      const f = col.getFilter() || { filter: null, filterMissing: false, filterType: EStringFilterType.contains };
      const currentFilterType = f.filterType || EStringFilterType.contains;
      const isRegexFilter = f.filter instanceof RegExp;
      const displayFilterType = isRegexFilter ? EStringFilterType.regex : currentFilterType;
      const bak = f.filter;

      filterMissing.checked = f.filterMissing;
      input.value = bak instanceof RegExp ? bak.source : bak || '';

      // Update radio button selection
      const targetRadio = node.querySelector<HTMLInputElement>(
        `input[name="searchOptions"][value="${displayFilterType}"]`
      );
      if (targetRadio) {
        targetRadio.checked = true;
      }
    };
  }

  createSummary(col: StringColumn, context: IRenderContext, interactive: boolean): ISummaryRenderer {
    if (!interactive) {
      return {
        template: `<div></div>`,
        update: (node: HTMLElement) => {
          const filter = col.getFilter();
          node.textContent = filterToString(filter);
        },
      };
    }
    const f = col.getFilter() || { filter: null, filterMissing: false, filterType: EStringFilterType.contains };
    const currentFilterType = f.filterType || EStringFilterType.contains;
    const isRegexFilter = f.filter instanceof RegExp;
    const displayFilterType = isRegexFilter ? EStringFilterType.regex : currentFilterType;
    let update: (col: StringColumn) => void;
    return {
      template: `<form><input type="text" placeholder="Filter ${context.sanitize(col.desc.label)}..." autofocus
      list="${context.idPrefix}${col.id}_dl" value="${context.sanitize(filterToString(f))}">
          ${filterMissingMarkup(f.filterMissing)}
          <datalist id="${context.idPrefix}${col.id}_dl"></datalist>
          <details class="${cssClass('string-advanced-options')}">
            <summary>Advanced options</summary>
            <span class="${cssClass('search-options-title')}">Find rows that &hellip;</span>
            <label class="${cssClass('checkbox')}">
              <input type="radio" name="searchOptions" value="${EStringFilterType.contains}" ${displayFilterType === EStringFilterType.contains ? 'checked="checked"' : ''}>
              <span>Contain the search terms</span>
            </label>
            <label class="${cssClass('checkbox')}">
              <input type="radio" name="searchOptions" value="${EStringFilterType.exact}" ${displayFilterType === EStringFilterType.exact ? 'checked="checked"' : ''}>
              <span>Exactly match the search terms</span>
            </label>
            <label class="${cssClass('checkbox')}">
              <input type="radio" name="searchOptions" value="${EStringFilterType.startsWith}" ${displayFilterType === EStringFilterType.startsWith ? 'checked="checked"' : ''}>
              <span>Start with the search terms</span>
            </label>
            <label class="${cssClass('checkbox')}">
              <input type="radio" name="searchOptions" value="${EStringFilterType.regex}" ${displayFilterType === EStringFilterType.regex ? 'checked="checked"' : ''}>
              <span>Match as regular expression</span>
            </label>
          </details>
          </form>`,
      update: (node: HTMLElement) => {
        if (!update) {
          update = StringCellRenderer.interactiveSummary(col, node);
        }
        update(col);
        const dl = node.querySelector('datalist')!;

        // no return here = loading indicator since it won't affect the rendering
        void context.tasks.summaryStringStats(col).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          const { summary } = r;
          matchDataList(dl, summary.topN);
        });
      },
    };
  }
}

/**
 * @internal
 */
export function filterToString(filter: IStringFilter | null) {
  if (filter == null || !filter.filter) {
    return '';
  }
  if (filter.filter instanceof RegExp) {
    return filter.filter.source;
  }
  return filter.filter;
}

/**
 * matches the given stats to a datalist
 * @internal
 */
export function matchDataList(node: HTMLDataListElement, matches: readonly { value: string; count: number }[]) {
  const children = Array.from(node.options);
  // update existing
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    let child = children[i];
    if (!child) {
      child = node.ownerDocument.createElement('option');
      node.appendChild(child);
    }
    child.value = m.value;
    setText(child, m.count > 1 ? `${m.value} (${m.count.toLocaleString()})` : m.value);
  }
  // remove extra
  for (let i = children.length - 1; i >= matches.length; i--) {
    children[i].remove();
  }
}
