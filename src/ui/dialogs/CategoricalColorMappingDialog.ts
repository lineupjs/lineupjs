import {ICategoricalColumn, ICategory} from '../../model/ICategoricalColumn';
import ADialog, {IDialogContext} from './ADialog';
import {uniqueId} from './utils';
import {cssClass} from '../../styles';
import { DEFAULT_COLOR_FUNCTION, ReplacmentColorMappingFunction} from '../../model/CategoricalColorMappingFunction';
import CategoricalsColumn from '../../model/CategoricalsColumn';
import CategoricalMapColumn from '../../model/CategoricalMapColumn';
import {color} from 'd3-color';

/** @internal */
export default class CategoricalColorMappingDialog extends ADialog {

  constructor(private readonly column: ICategoricalColumn | CategoricalsColumn | CategoricalMapColumn, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
  }

  protected build(node: HTMLElement) {
    const id = uniqueId(this.dialog.idPrefix);
    const mapping = this.column.getColorMapping();
    node.insertAdjacentHTML('beforeend', `<div class="${cssClass('dialog-table')}">
        ${this.column.categories.map((d) => `
          <div class="${cssClass('dialog-color-table-entry')}">
            <input id="${id}${d.name}" data-cat="${d.name}" type="color" value="${color(mapping.apply(d))!.hex()}">
            <label for="${id}${d.name}">${d.label}</label>
          </div>`).join('')}
    </div>`);
  }

  reset() {
    const cats = this.column.categories;
    this.forEach('[data-cat]', (n: HTMLInputElement, i) => {
      n.value = color(cats[i]!.color)!.hex();
    });
    this.column.setColorMapping(DEFAULT_COLOR_FUNCTION);
  }

  submit() {
    const cats = this.column.categories;
    const map = new Map<ICategory, string>();
    this.forEach('input[data-cat]', (n: HTMLInputElement, i) => {
      const cat = cats[i];
      if (color(cat.color)!.hex() !== n.value) {
        map.set(cat, n.value);
      }
    });
    if (map.size === 0) {
      this.column.setColorMapping(DEFAULT_COLOR_FUNCTION);
    } else {
      this.column.setColorMapping(new ReplacmentColorMappingFunction(map));
    }
    return true;
  }
}
