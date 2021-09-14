import type {
  ICategoricalColumn,
  CategoricalsColumn,
  CategoricalMapColumn,
  ICategory,
  ICategoricalColorMappingFunction,
} from '../../model';
import ADialog, { IDialogContext } from './ADialog';
import { uniqueId } from './utils';
import { cssClass } from '../../styles';
import { color } from 'd3-color';
import {
  schemeCategory10,
  schemeAccent,
  schemeDark2,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
} from 'd3-scale-chromatic';
import {
  DEFAULT_CATEGORICAL_COLOR_FUNCTION,
  ReplacementColorMappingFunction,
} from '../../model/CategoricalColorMappingFunction';

const sets: { [key: string]: ReadonlyArray<string> } = {
  schemeCategory10,
  schemeAccent,
  schemeDark2,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
};

/** @internal */
export default class CategoricalColorMappingDialog extends ADialog {
  private readonly before: ICategoricalColorMappingFunction;

  constructor(
    private readonly column: ICategoricalColumn | CategoricalsColumn | CategoricalMapColumn,
    dialog: IDialogContext
  ) {
    super(dialog, {
      livePreview: 'colorMapping',
    });

    this.before = column.getColorMapping().clone();
  }

  protected build(node: HTMLElement) {
    const id = uniqueId(this.dialog.idPrefix);
    const mapping = this.column.getColorMapping();
    node.insertAdjacentHTML(
      'beforeend',
      `<div class="${cssClass('dialog-table')}">
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
      ${this.column.categories
        .map(
          () => `
        <label class="${cssClass('checkbox')} ${cssClass('dialog-color-table-entry')}">
          <input data-cat="" type="color" value="">
          <span> </span>
        </label>`
        )
        .join('')}
    </div>`
    );
    const categories = this.column.categories;
    Array.from(node.querySelectorAll(`label.${cssClass('checkbox')}.${cssClass('dialog-color-table-entry')}`)).forEach(
      (n, i) => {
        const cat = categories[i];
        (n.firstElementChild as HTMLElement).dataset.cat = cat.name;
        (n.firstElementChild as HTMLInputElement).value = color(mapping.apply(cat))!.formatHex();
        n.lastElementChild.textContent = cat.label;
      }
    );

    this.findInput('select').onchange = (evt) => {
      const scheme = sets[(evt.currentTarget as HTMLInputElement).value];
      if (!scheme) {
        return;
      }
      this.forEach('[data-cat]', (n: HTMLInputElement, i) => {
        n.value = scheme[i % scheme.length];
      });
      if (this.showLivePreviews()) {
        this.submit();
      }
    };

    this.enableLivePreviews('input[type=color]');
  }

  reset() {
    const cats = this.column.categories;
    this.forEach('[data-cat]', (n: HTMLInputElement, i) => {
      n.value = color(cats[i]!.color)!.formatHex();
    });
  }

  submit() {
    const cats = this.column.categories;
    const map = new Map<ICategory, string>();
    this.forEach('input[data-cat]', (n: HTMLInputElement, i) => {
      const cat = cats[i];
      if (color(cat.color)!.formatHex() !== n.value) {
        map.set(cat, n.value);
      }
    });
    if (map.size === 0) {
      this.column.setColorMapping(DEFAULT_CATEGORICAL_COLOR_FUNCTION);
    } else {
      this.column.setColorMapping(new ReplacementColorMappingFunction(map));
    }
    return true;
  }

  cancel() {
    this.column.setColorMapping(this.before);
  }
}
