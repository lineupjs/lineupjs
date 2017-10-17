import ADialog from './ADialog';
import CompositeColumn from '../model/CompositeColumn';
import {createHeader, updateHeader} from '../ui/engine/header';
import {IRankingHeaderContext} from '../ui/engine/interfaces';

export default class CompositeChildrenDialog extends ADialog {

  constructor(private readonly column: CompositeColumn, header: HTMLElement, private ctx: IRankingHeaderContext) {
    super(header, '');
  }

  openDialog() {
    const popup = this.makePopup(`<div class="lu-sub-nested"></div>`);

    const wrapper = <HTMLDivElement>popup.querySelector('.lu-sub-nested')!;
    this.column.children.forEach((c) => {
      const n = createHeader(c, popup.ownerDocument, this.ctx);
      n.className = `lu-header ${c.cssClass ? ` ${c.cssClass}` : ''}${c.headerCssClass}${c.isFiltered() ? ' lu-filtered' : ''}`;
      updateHeader(n, c, this.ctx);
      wrapper.appendChild(n);
    });

    this.onButton(popup, {
      cancel: () => undefined,
      reset: () => undefined,
      submit: () => {
        return true;
      }
    });
  }
}
