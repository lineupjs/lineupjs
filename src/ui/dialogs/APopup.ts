import ADialog, { IDialogContext, IDialogOptions } from './ADialog';

abstract class APopup extends ADialog {
  constructor(dialog: Readonly<IDialogContext>, options: Partial<IDialogOptions> = {}) {
    super(
      dialog,
      Object.assign(
        {
          popup: true,
        },
        options
      )
    );
  }

  protected submit() {
    return true;
  }

  protected reset() {
    // dummy
  }

  protected cancel() {
    // dummy
  }
}

export default APopup;
