import { debounce, clear, suffix } from '../../internal';
import { CompositeColumn } from '../../model';
import { createHeader, updateHeader } from '../header';
import type { IRankingHeaderContext } from '../interfaces';
import type { IDialogContext } from './ADialog';
import { cssClass, engineCssClass } from '../../styles';
import APopup from './APopup';

/** @internal */
export default class CompositeChildrenDialog extends APopup {
  private readonly id: string;

  constructor(private readonly column: CompositeColumn, dialog: IDialogContext, private ctx: IRankingHeaderContext) {
    super(dialog);
    this.id = `.dialog${Math.random().toString(36).slice(-8).substring(0, 3)}`;
  }

  cleanUp(action: 'cancel' | 'confirm' | 'handled') {
    super.cleanUp(action);
    this.column.on(suffix(this.id, CompositeColumn.EVENT_ADD_COLUMN, CompositeColumn.EVENT_REMOVE_COLUMN), null);
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-sub-nested'));
    const createChildren = () => {
      this.column.children.forEach((c) => {
        const n = createHeader(c, this.ctx, {
          mergeDropAble: false,
          resizeable: false,
          level: this.dialog.level + 1,
          extraPrefix: 'sub',
        });
        n.className = cssClass('header');
        updateHeader(n, c);
        const summary = this.ctx.summaryRenderer(c, false);
        const summaryNode = this.ctx.asElement(summary.template);
        summaryNode.dataset.renderer = c.getSummaryRenderer();
        summaryNode.classList.add(cssClass('summary'), cssClass('renderer'), cssClass('th-summary'));

        const r = summary.update(summaryNode);
        if (r) {
          summaryNode.classList.add(engineCssClass('loading'));
          r.then(() => {
            summaryNode.classList.remove(engineCssClass('loading'));
          });
        }
        n.appendChild(summaryNode);
        node.appendChild(n);
      });
    };
    createChildren();

    this.column.on(
      suffix(this.id, CompositeColumn.EVENT_ADD_COLUMN, CompositeColumn.EVENT_REMOVE_COLUMN),
      debounce(() => {
        if (!node.parentElement) {
          // already closed
          this.destroy();
          return;
        }
        clear(node);
        createChildren();
      })
    );
  }
}
