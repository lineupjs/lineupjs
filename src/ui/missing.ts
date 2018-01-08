/** @internal */
export const filterMissingText = 'Filter out rows containing missing values';
/** @internal */
export const filterMissingMarkup = (bakMissing: boolean) => `<label><input class="lu_filter_missing" type="checkbox" ${bakMissing ? 'checked="checked"' : ''}>${filterMissingText}</label>`;
/** @internal */
export const filterMissingNumberMarkup = (bakMissing: boolean, count: number) => `<label ${count === 0 ? 'class="lu-disabled"' : ''}><input class="lu_filter_missing" type="checkbox" ${bakMissing ? 'checked="checked"' : ''} ${count === 0 ? 'disabled' : ''}>Filter out ${count} missing value rows</label>`;

/** @internal */
export function updateFilterMissingNumberMarkup(element: HTMLElement, count: number) {
  const checked = element.querySelector('input')!;
  if (count > 0) {
    element.classList.remove('lu-disabled');
    checked.disabled = false;
  }
  if (!checked.checked) {
    element.lastChild!.textContent = `Filter out ${count} remaining missing value rows`;
  }
}
