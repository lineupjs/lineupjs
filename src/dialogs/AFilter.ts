import ADialog from './ADialog';
import Column from '../model/Column';
import {Selection} from 'd3';


abstract class AFilter extends ADialog {

  constructor(attachment: Selection<Column>, title: string) {
    super(attachment, title);
  }

  markFiltered(filtered = false) {
    this.attachment.classed('filtered', filtered);
  }
}

export default AFilter;
