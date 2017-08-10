import ADialog from './ADialog';
import Column from '../model/Column';
import {IDataProvider} from '../provider/ADataProvider';
import {Selection} from 'd3';

export interface IFilterDialog {
  new(column: Column, $header: Selection<Column>, title: string, data: IDataProvider, idPrefix: string): AFilterDialog<Column>;
}

abstract class AFilterDialog<T extends Column> extends ADialog {

  constructor(protected readonly column: T, attachment: Selection<T>, title: string) {
    super(attachment, title);
  }

  markFiltered(filtered: boolean = false) {
    this.attachment.classed('filtered', filtered);
  }
}

export default AFilterDialog;
