import {uniqueId} from './dialogs/utils';

/** @internal */
export const filterMissingText = 'Filter rows containing missing values';

/** @internal */
export function filterMissingMarkup(bakMissing: boolean, idPrefix: string) {
  const id = uniqueId(idPrefix);
  return `<div class="lu-checkbox"><input type="checkbox" ${bakMissing ? 'checked="checked"' : ''} id="${id}"><label for="${id}" class="lu-filter-missing">${filterMissingText}</label></div>`;
}

/** @internal */
export function filterMissingNumberMarkup(bakMissing: boolean, count: number, idPrefix: string) {
  const id = uniqueId(idPrefix);
  return `<div class="lu-checkbox"><input type="checkbox" ${bakMissing ? 'checked="checked"' : ''} ${count === 0 ? 'disabled' : ''} id="${id}"><label for="${id}" class="lu-filter-missing" ${count === 0 ? 'class="lu-disabled"' : ''}>Filter ${count} missing value rows</label></div>`;
}

export function findFilterMissing(node: HTMLElement) {
  return <HTMLInputElement>(<HTMLElement>node.querySelector('.lu-filter-missing')).previousElementSibling;
}

/** @internal */
export function updateFilterMissingNumberMarkup(element: HTMLElement, count: number) {
  const checked = element.querySelector('input')!;
  if (count > 0) {
    element.classList.remove('lu-disabled');
    checked.disabled = false;
  }
  if (!checked.checked) {
    element.lastElementChild!.textContent = `Filter ${count} remaining missing value rows`;
  }
}
