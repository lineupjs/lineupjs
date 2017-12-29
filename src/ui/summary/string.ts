import StringColumn from '../../model/StringColumn';
import {stringFilter} from '../dialogs/StringFilterDialog';

export default class StringSummary {
  readonly update: () => void;

  constructor(col: StringColumn, node: HTMLElement, interactive: boolean) {
    node.dataset.summary = 'string';
    if (!interactive) {
      this.update = () => {
        const filter = col.getFilter() || '';
        node.textContent = filter === StringColumn.FILTER_MISSING ? '' : String(filter);
      };
      this.update();
      return;
    }
    const base = stringFilter(col);
    node.innerHTML = base.template;
    base.init(node);

    this.update = () => base.update(node);
  }
}
