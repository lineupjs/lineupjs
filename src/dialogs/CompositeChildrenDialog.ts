import ADialog from './ADialog';
import CompositeColumn from '../model/CompositeColumn';
import {createHeader, updateHeader} from '../ui/header';
import {IRankingHeaderContext} from '../ui/interfaces';
import debounce from '../internal/debounce';
import Column from '../model/Column';
import {suffix} from '../internal/AEventDispatcher';

export default class CompositeChildrenDialog extends ADialog {

  constructor(private readonly column: CompositeColumn, header: HTMLElement, private ctx: IRankingHeaderContext) {
    super(header, '');
  }

  openDialog() {
    const popup = this.makePopup(`<div class="lu-sub-nested"></div>`);

    const wrapper = <HTMLDivElement>popup.querySelector('.lu-sub-nested')!;
    this.column.children.forEach((c) => {
      const n = createHeader(c, popup.ownerDocument, this.ctx, {
        mergeDropAble: false,
        resizeable: false
      });
      n.className = `lu-header${c.cssClass ? ` ${c.cssClass}` : ''}${c.isFiltered() ? ' lu-filtered' : ''}`;
      updateHeader(n, c, this.ctx);
      wrapper.appendChild(n);
    });

    const id = `.dialog${Math.random().toString(36).slice(-8).substr(0, 3)}`;

    const stopListening = () => {
      this.column.on(suffix(id, Column.EVENT_ADD_COLUMN, Column.EVENT_REMOVE_COLUMN), null);
    };

    this.column.on(suffix(id, Column.EVENT_ADD_COLUMN, Column.EVENT_REMOVE_COLUMN), debounce(() => {
      if (!popup.parentElement) {
        // already closed
        stopListening();
        return;
      }
      wrapper.innerHTML = '';
      this.column.children.forEach((c) => {
        const n = createHeader(c, popup.ownerDocument, this.ctx, {
          mergeDropAble: false,
          resizeable: false
        });
        n.className = `lu-header ${c.cssClass ? ` ${c.cssClass}` : ''}${c.headerCssClass}${c.isFiltered() ? ' lu-filtered' : ''}`;
        updateHeader(n, c, this.ctx);
        wrapper.appendChild(n);
      });
    }));

    this.onButton(popup, {
      cancel: () => stopListening(),
      reset: () => undefined,
      submit: () => {
        stopListening();
        return true;
      }
    });
  }
}
