import SelectionColumn from '../../model/SelectionColumn';
import {IRankingHeaderContext} from '../interfaces';

export default function summarySelection(col: SelectionColumn, node: HTMLElement, _interactive: boolean, ctx: IRankingHeaderContext) {
  const provider = ctx.provider;
  const old = node.dataset.summary;
  node.dataset.summary = 'selection';
  if (old !== 'selection') {
    //init
    node.innerHTML = `<i class='lu-unchecked' title='(Un)Select All'></i>`;
  }
  const button = (<HTMLElement>node.firstElementChild);
  button.onclick = (evt) => {
    evt.stopPropagation();
    if (button.classList.contains('lu-unchecked')) {
      provider.selectAllOf(col.findMyRanker()!);
    } else {
      provider.setSelection([]);
    }
    button.classList.toggle('lu-unchecked');
    button.classList.toggle('lu-checked');
  };
}
