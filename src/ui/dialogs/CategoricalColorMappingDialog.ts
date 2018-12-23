import {ICategoricalColumn, CategoricalsColumn, CategoricalMapColumn, ICategory} from '../../model';
import ADialog, {IDialogContext} from './ADialog';
import {uniqueId} from './utils';
import {cssClass} from '../../styles';
import {color} from 'd3-color';
import {schemeCategory10, schemeAccent, schemeDark2, schemePastel1, schemePastel2, schemeSet1, schemeSet2, schemeSet3} from 'd3-scale-chromatic';
import {DEFAULT_COLOR_FUNCTION, ReplacmentColorMappingFunction} from '../../model/CategoricalColorMappingFunction';

const sets: {[key: string]: ReadonlyArray<string>} = {schemeCategory10, schemeAccent, schemeDark2, schemePastel1, schemePastel2, schemeSet1, schemeSet2, schemeSet3};

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
      <div class="${cssClass('dialog-color-table-entry')}">
        <select id="${id}Chooser">
          <option value="">Apply Color Scheme...</option>
          <option value="schemeCategory10">D3 Category 10 (${schemeCategory10.length})</option>
          <option value="schemeSet1">Set 1 (${schemeSet1.length})</option>
          <option value="schemeSet2">Set 2 (${schemeSet2.length})</option>
          <option value="schemeSet3">Set 3 (${schemeSet3.length})</option>
          <option value="schemeAccent">Accent (${schemeAccent.length})</option>
          <option value="schemeDark2">Dark2 (${schemeDark2.length})</option>
          <option value="schemePastel1">Pastel 1 (${schemePastel1.length})</option>
          <option value="schemePastel2">Pastel 2 (${schemePastel2.length})</option>
        </select>
      </div>
      ${this.column.categories.map((d) => `
        <label class="${cssClass('checkbox')} ${cssClass('dialog-color-table-entry')}">
          <input data-cat="${d.name}" type="color" value="${color(mapping.apply(d))!.hex()}">
          <span>${d.label}</span>
        </label>`).join('')}
    </div>`);

    this.findInput('select').onchange = (evt) => {
      const scheme = sets[(<HTMLInputElement>evt.currentTarget).value];
      if (!scheme) {
        return;
      }
      this.forEach('[data-cat]', (n: HTMLInputElement, i) => {
        n.value = scheme[i % scheme.length];
      });
    };
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
