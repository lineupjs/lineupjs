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
export const filterMissingNumberMarkup = (bakMissing: boolean, count: number) => `<label><input class="lu_filter_missing" type="checkbox" ${bakMissing ? 'checked="checked"' : ''}>Filter out ${count} missing value rows</label>`;

export default AFilterDialog;
