import ADialog, {IDialogContext, IDialogOptions} from "./ADialog";

abstract class APopup extends ADialog {
  constructor(dialog: Readonly<IDialogContext>, options: Partial<IDialogOptions> = {}) {
    super(dialog, Object.assign({
      popup: false
    }, options));
  }

  protected submit() {
    return true;
  }

  protected reset() {

  }

  protected cancel() {

  }
}

export default APopup;
