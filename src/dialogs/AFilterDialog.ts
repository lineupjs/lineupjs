import ADialog from './ADialog';
import Column from '../model/Column';
import {IDataProvider} from '../provider/ADataProvider';

export interface IFilterDialog {
  new(column: Column, header: HTMLElement, title: string, data: IDataProvider, idPrefix: string): AFilterDialog<Column>;
}

abstract class AFilterDialog<T extends Column> extends ADialog {

  constructor(protected readonly column: T, attachment: HTMLElement, title: string) {
    super(attachment, title);
  }

  markFiltered(filtered: boolean = false) {
    this.attachment.classList.toggle('filtered', filtered);
  }
}

export const filterMissingText = 'Filter out rows containing missing values';
export const filterMissingMarkup = (bakMissing: boolean) => `<label><input class="lu_filter_missing" type="checkbox" ${bakMissing ? 'checked="checked"' : ''}>${filterMissingText}</label>`;
export const filterMissingNumberMarkup = (bakMissing: boolean, count: number) => `<label ${count===0 ? 'class="lu-disabled"': ''}><input class="lu_filter_missing" type="checkbox" ${bakMissing ? 'checked="checked"' : ''} ${count===0 ? 'disabled': ''}>Filter out ${count} missing value rows</label>`;

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

export default AFilterDialog;
