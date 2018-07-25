import {suffix} from '../../internal/AEventDispatcher';
import debounce from '../../internal/debounce';
import CompositeColumn from '../../model/CompositeColumn';
import {createHeader, updateHeader} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';
import {clear} from '../../internal/utils';

/** @internal */
export default class CompositeChildrenDialog extends ADialog {

  private readonly id: string;

  constructor(private readonly column: CompositeColumn, dialog: IDialogContext, private ctx: IRankingHeaderContext) {
    super(dialog);
    this.id = `.dialog${Math.random().toString(36).slice(-8).substr(0, 3)}`;
  }

  destroy() {
    this.column.on(suffix(this.id, CompositeColumn.EVENT_ADD_COLUMN, CompositeColumn.EVENT_REMOVE_COLUMN), null);
    super.destroy();
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-sub-nested'));
    const createChildren = () => {
      this.column.children.forEach((c) => {
        const n = createHeader(c, this.ctx, {
          mergeDropAble: false,
          resizeable: false,
          level: this.dialog.level + 1,
          extraPrefix: 'sub'
        });
        n.className = cssClass('header');
        updateHeader(n, c);
        const summary = this.ctx.summaryRenderer(c, false);
        const summaryNode = this.ctx.asElement(summary.template);
        summaryNode.dataset.renderer = c.getSummaryRenderer();
        summaryNode.classList.add(cssClass('summary'), cssClass('renderer'));
        summary.update(summaryNode, this.ctx.statsOf(<any>c));
        n.appendChild(summaryNode);
        node.appendChild(n);
      });
    };
    createChildren();

    this.column.on(suffix(this.id, CompositeColumn.EVENT_ADD_COLUMN, CompositeColumn.EVENT_REMOVE_COLUMN), debounce(() => {
      if (!node.parentElement) {
        // already closed
        this.destroy();
        return;
      }
      clear(node);
      createChildren();
    }));
  }
}
