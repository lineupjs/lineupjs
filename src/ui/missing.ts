/** @internal */
export const filterMissingText = 'Filter out rows containing missing values';
/** @internal */
export const filterMissingMarkup = (bakMissing: boolean) => `<label class="lu-filter-missing"><input type="checkbox" ${bakMissing ? 'checked="checked"' : ''}>${filterMissingText}</label>`;
/** @internal */
export const filterMissingNumberMarkup = (bakMissing: boolean, count: number) => `<label class="lu-filter-missing" ${count === 0 ? 'class="lu-disabled"' : ''}><input type="checkbox" ${bakMissing ? 'checked="checked"' : ''} ${count === 0 ? 'disabled' : ''}>Filter out ${count} missing value rows</label>`;

export function findFilterMissing(node: HTMLElement) {
  return <HTMLInputElement>node.querySelector('.lu-filter-missing input');
}

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
