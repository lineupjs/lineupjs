import SelectionColumn from '../../model/SelectionColumn';
import {IRankingHeaderContext} from '../interfaces';

export default class SelectionSummary {
  private ctx: IRankingHeaderContext;

  constructor(col: SelectionColumn, node: HTMLElement) {
    node.dataset.summary = 'selection';
    node.innerHTML = `<i class='lu-unchecked' title='(Un)Select All'></i>`;
    const button = (<HTMLElement>node.firstElementChild);
    button.onclick = (evt) => {
      evt.stopPropagation();
      if (!this.ctx) {
        return;
      }
      if (button.classList.contains('lu-unchecked')) {
        this.ctx.provider.selectAllOf(col.findMyRanker()!);
      } else {
        this.ctx.provider.setSelection([]);
      }
      button.classList.toggle('lu-unchecked');
      button.classList.toggle('lu-checked');
    };
  }

  update(ctx: IRankingHeaderContext) {
    this.ctx = ctx;
  }
}
