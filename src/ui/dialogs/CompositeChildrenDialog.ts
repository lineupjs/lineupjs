import {suffix} from '../../internal/AEventDispatcher';
import debounce from '../../internal/debounce';
import Column from '../../model/Column';
import CompositeColumn from '../../model/CompositeColumn';
import {createHeader, updateHeader} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import ADialog from './ADialog';

export default class CompositeChildrenDialog extends ADialog {

  private readonly id: string;

  constructor(private readonly column: CompositeColumn, attachment: HTMLElement, private ctx: IRankingHeaderContext) {
    super(attachment, {
      hideOnMoveOutside: true
    });
    this.id = `.dialog${Math.random().toString(36).slice(-8).substr(0, 3)}`;
  }

  destroy() {
    this.column.on(suffix(this.id, Column.EVENT_ADD_COLUMN, Column.EVENT_REMOVE_COLUMN), null);
    super.destroy();
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-sub-nested');
    this.column.children.forEach((c) => {
      const n = createHeader(c, this.ctx, {
        mergeDropAble: false,
        resizeable: false
      });
      n.className = `lu-header${c.cssClass ? ` ${c.cssClass}` : ''}${c.isFiltered() ? ' lu-filtered' : ''}`;
      updateHeader(n, c);
      node.appendChild(n);
    });

    this.column.on(suffix(this.id, Column.EVENT_ADD_COLUMN, Column.EVENT_REMOVE_COLUMN), debounce(() => {
      if (!node.parentElement) {
        // already closed
        this.destroy();
        return;
      }
      node.innerHTML = '';
      this.column.children.forEach((c) => {
        const n = createHeader(c, this.ctx, {
          mergeDropAble: false,
          resizeable: false
        });
        n.className = `lu-header${c.cssClass ? ` ${c.cssClass}` : ''}${c.isFiltered() ? ' lu-filtered' : ''}`;
        updateHeader(n, c);
        // TODO summary
        node.appendChild(n);
      });
    }));
  }
}
