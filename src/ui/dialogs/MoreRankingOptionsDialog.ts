import {Ranking} from '../../model';
import {IRankingHeaderContext} from '../interfaces';
import {dialogContext, IDialogContext} from './ADialog';
import RenameRankingDialog from './RenameRankingDialog';
import {cssClass} from '../../styles';
import {actionCSSClass} from '../header';
import APopup from './APopup';

/** @internal */
export default class MoreRankingOptionsDialog extends APopup {

  constructor(private readonly ranking: Ranking, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);
  }

  private addIcon(node: HTMLElement, title: string, onClick: (evt: MouseEvent)=>void) {
    node.insertAdjacentHTML('beforeend', `<i title="${title}" class="${actionCSSClass(title)}"><span>${title}</span> </i>`);
    const i = <HTMLElement>node.lastElementChild;
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
      const dialog = new RenameRankingDialog(this.ranking, dialogContext(this.ctx, this.level + 1, <any>evt));
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
