import Column from '../../model/Column';
import ADialog from './ADialog';

export {filterMissingMarkup, filterMissingNumberMarkup} from '../missing';

abstract class AFilterDialog<T extends Column> extends ADialog {

  constructor(protected readonly column: T, attachment: HTMLElement, title: string) {
    super(attachment, title);
  }

  markFiltered(filtered: boolean = false) {
    this.attachment.classList.toggle('filtered', filtered);
  }
}

export default AFilterDialog;
