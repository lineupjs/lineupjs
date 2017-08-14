import ADialog from './ADialog';
import Column from '../model/Column';
import ADataProvider from '../provider/ADataProvider';
import {Selection} from 'd3';

export interface IFilterDialog {
  new(column: Column, $header: d3.Selection<Column>, title: string, data: ADataProvider, idPrefix: string) : AFilterDialog<Column>;
}

abstract class AFilterDialog<T extends Column> extends ADialog {

  constructor(protected readonly column: T, attachment: Selection<T>, title: string) {
    super(attachment, title);
  }

  markFiltered(filtered: boolean = false) {
    this.attachment.classed('filtered', filtered);
  }
}

export const filterMissingText = 'Filter out rows containing missing values';
export const filterMissingMarkup = (bakMissing: boolean) => `<label><input class="lu_filter_missing" type="checkbox" ${bakMissing ? 'checked="checked"' : ''}>${filterMissingText}</label>`;

export default AFilterDialog;
