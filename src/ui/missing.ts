import {cssClass} from '../styles';

/** @internal */
export const filterMissingText = 'Filter rows containing missing values';

/** @internal */
export function filterMissingMarkup(bakMissing: boolean) {
  return `<label class="${cssClass('checkbox')}">
    <input type="checkbox" ${bakMissing ? 'checked="checked"' : ''}>
    <span class="${cssClass('filter-missing')}">${filterMissingText}</span>
  </label>`;
}

/** @internal */
export function filterMissingNumberMarkup(bakMissing: boolean, count: number) {
  return `<label class="${cssClass('checkbox')}">
    <input type="checkbox" ${bakMissing ? 'checked="checked"' : ''} ${count === 0 ? 'disabled' : ''}>
    <span class="${cssClass('filter-missing')} ${count === 0 ? cssClass('disabled') : ''}">Filter ${count} missing value rows</span>
  </label>`;
}

/** @internal */
export function findFilterMissing(node: HTMLElement) {
  return <HTMLInputElement>(<HTMLElement>node.getElementsByClassName(cssClass('filter-missing'))[0]!).previousElementSibling!;
}

/** @internal */
export function updateFilterMissingNumberMarkup(element: HTMLElement, count: number) {
  const checked = element.getElementsByTagName('input')![0];
  checked.disabled = count === 0;
  element.lastElementChild!.classList.toggle(cssClass('disabled'), count === 0);
  element.lastElementChild!.textContent = `Filter ${count} missing value rows`;
}
