import ADialog, {IDialogContext} from './ADialog';

/** @internal */
export default class ChooseRankingDialog extends ADialog {

  constructor(private readonly items: HTMLElement[], dialog: IDialogContext) {
    super(dialog);
  }


  protected build(node: HTMLElement) {
    node.classList.add('lu-more-options', 'lu-choose-options');
    for (const item of this.items) {
      node.appendChild(item);
    }
  }
}
