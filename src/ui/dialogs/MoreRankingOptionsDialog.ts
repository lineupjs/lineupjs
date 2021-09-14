import type { Ranking } from '../../model';
import type { IRankingHeaderContext } from '../interfaces';
import { dialogContext, IDialogContext } from './ADialog';
import RenameRankingDialog from './RenameRankingDialog';
import { cssClass } from '../../styles';
import { actionCSSClass } from '../header';
import APopup from './APopup';

/** @internal */
export default class MoreRankingOptionsDialog extends APopup {
  constructor(private readonly ranking: Ranking, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog, {
      autoClose: true,
    });
  }

  private addIcon(node: HTMLElement, title: string, onClick: (evt: MouseEvent) => void) {
    const sanitized = this.ctx.sanitize(title);
    node.insertAdjacentHTML(
      'beforeend',
      `<i title="${sanitized}" class="${actionCSSClass(title)}"><span>${sanitized}</span> </i>`
    );
    const i = node.lastElementChild as HTMLElement;
    i.onclick = (evt) => {
      evt.stopPropagation();
      onClick(evt);
    };
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('more-options'));
    this.addIcon(node, 'Rename', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      const dialog = new RenameRankingDialog(this.ranking, dialogContext(this.ctx, this.level + 1, evt as any));
      dialog.open();
    });
    this.addIcon(node, 'Remove', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.destroy('confirm');
      this.ctx.provider.removeRanking(this.ranking);
    });
  }
}
