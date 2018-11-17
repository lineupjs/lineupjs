import {uniqueId} from './dialogs/utils';
import {cssClass} from '../styles';

/** @internal */
export const filterMissingText = 'Filter rows containing missing values';

/** @internal */
export function filterMissingMarkup(bakMissing: boolean, idPrefix: string) {
  const id = uniqueId(idPrefix);
  return `<div class="${cssClass('checkbox')}">
    <input type="checkbox" ${bakMissing ? 'checked="checked"' : ''} id="${id}">
    <label for="${id}" class="${cssClass('filter-missing')}">${filterMissingText}</label>
  </div>`;
}

/** @internal */
export function filterMissingNumberMarkup(bakMissing: boolean, count: number, idPrefix: string) {
  const id = uniqueId(idPrefix);
  return `<div class="${cssClass('checkbox')}">
    <input type="checkbox" ${bakMissing ? 'checked="checked"' : ''} ${count === 0 ? 'disabled' : ''} id="${id}">
    <label for="${id}" class="${cssClass('filter-missing')} ${count === 0 ? cssClass('disabled'): ''}">Filter ${count} missing value rows</label>
  </div>`;
}

/** @internal */
export function findFilterMissing(node: HTMLElement) {
  return <HTMLInputElement>(<HTMLElement>node.querySelector(`.${cssClass('filter-missing')}`)!).previousElementSibling!;
}

/** @internal */
export function updateFilterMissingNumberMarkup(element: HTMLElement, count: number) {
  const checked = element.querySelector('input')!;
  checked.disabled = count === 0;
  element.lastElementChild!.classList.toggle(cssClass('disabled'), count === 0);
  element.lastElementChild!.textContent = `Filter ${count} missing value rows`;
}
