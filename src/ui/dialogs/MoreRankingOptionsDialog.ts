import Ranking from '../../model/Ranking';
import {IRankingHeaderContext} from '../interfaces';
import {dialogContext} from '../toolbar';
import ADialog, {IDialogContext} from './ADialog';
import RenameRankingDialog from './RenameRankingDialog';

/** @internal */
export default class MoreRankingOptionsDialog extends ADialog {

  constructor(private readonly ranking: Ranking, dialog: IDialogContext, private readonly ctx: IRankingHeaderContext) {
    super(dialog);
  }

  private addIcon(node: HTMLElement, title: string, onClick: (evt: MouseEvent)=>void) {
    node.insertAdjacentHTML('beforeend', `<i title="${title}" class="lu-action"><span>${title}</span> </i>`);
    const i = <HTMLElement>node.lastElementChild;
    i.onclick = (evt) => {
      evt.stopPropagation();
      onClick(evt);
    };
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-more-options');
    this.addIcon(node, 'Rename', (evt) => {
      const dialog = new RenameRankingDialog(this.ranking, dialogContext(this.ctx, this.level + 1, <any>evt));
      dialog.open();
    });
    this.addIcon(node, 'Remove', () => {
      this.destroy();
      this.ctx.provider.removeRanking(this.ranking);
    });
  }
}
