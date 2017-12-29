import StringColumn from '../../model/StringColumn';
import {stringFilter} from '../../dialogs/StringFilterDialog';

export default function summaryString(col: StringColumn, node: HTMLElement, interactive: boolean) {
  const old = node.dataset.summary;
  node.dataset.summary = 'string';
  if (!interactive) {
    const filter = col.getFilter() || '';
    node.textContent = filter === StringColumn.FILTER_MISSING ? '' : String(filter);
    return;
  }
  const base = stringFilter(col);
  if (old === 'string') {
    base.update(node);
    return;
  }
  // init
  node.innerHTML = base.template;
  base.init(node);
}
