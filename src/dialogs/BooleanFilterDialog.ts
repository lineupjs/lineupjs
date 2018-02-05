import BooleanColumn from '../model/BooleanColumn';
import AFilterDialog from './AFilterDialog';

export default class BooleanFilterDialog extends AFilterDialog<BooleanColumn> {

  /**
   * opens a dialog for filtering a boolean column
   * @param column the column to filter
   * @param header the visual header element of this column
   * @param title optional title
   */
  constructor(column: BooleanColumn, header: HTMLElement, title = 'Filter') {
    super(column, header, title);
  }

  protected build():HTMLElement {
    const bak = this.column.getFilter();

    const popup = this.makePopup(`<label><input type="radio" name="boolean_check" value="null" ${bak === null ? 'checked="checked"' : ''}>No Filter</label><br>
     <label><input type="radio" name="boolean_check" value="true" ${bak === true ? 'checked="checked"' : ''}>True</label><br>
     <label><input type="radio" name="boolean_check" value="false" ${bak === false ? 'checked="checked"' : ''}>False</label>
    <br>`);

    const updateData = (filter: boolean | null) => {
      this.markFiltered((filter !== null));
      this.column.setFilter(filter);
    };

    function updateImpl() {
      //get value
      const isTrue = (<HTMLInputElement>popup.querySelector('input[type="radio"][value="true"]')).checked;
      const isFalse = (<HTMLInputElement>popup.querySelector('input[type="radio"][value="false"]')).checked;
      updateData(isTrue ? true : (isFalse ? false : null));
    }

    const radios = <HTMLInputElement[]>Array.from(popup.querySelectorAll('input[type="radio"]'));
    radios.forEach((r) => r.addEventListener('change', updateImpl));

    this.onButton(popup, {
      cancel: () => updateData(bak),
      reset: () => {
        const v = bak === null ? 'null' : String(bak);
        radios.forEach((r) => r.checked = r.value === v);
        updateData(null);
      },
      submit: () => {
        updateImpl();
        return true;
      }
    });

    return popup;
  }
}
