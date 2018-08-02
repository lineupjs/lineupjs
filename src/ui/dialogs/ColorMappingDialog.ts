import ADialog from './ADialog';
import {IDialogContext} from './ADialog';
import {schemeCategory10, schemeSet1, schemeSet2, schemeSet3, schemeAccent, schemeDark2, schemePastel2, schemePastel1} from 'd3-scale-chromatic';
import {round, fixCSS} from '../../internal';
import {uniqueId} from '../../renderer/utils';
import {sequentialColors, divergentColors, IColorMappingFunction, createColorMappingFunction} from '../../model/ColorMappingFunction';
import {color} from 'd3-color';
import {IMapAbleColumn} from '../../model';

/** @internal */
export default class ColorMappingDialog extends ADialog {
  constructor(private readonly column: IMapAbleColumn, dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    const id = uniqueId('col');

    const current = this.column.getColorMapping();

    node.insertAdjacentHTML('beforeend', `<datalist id="${id}L">${schemeCategory10.map((d) => `<option value="${d}"></option>`).join('')}</datalist>`);
    node.insertAdjacentHTML('beforeend', `<datalist id="${id}LW"><option value="#FFFFFF"></option>${schemeCategory10.slice(0, -1).map((d) => `<option value="${d}"></option>`).join('')}</datalist>`);

    node.insertAdjacentHTML('beforeend', `<strong>Solid Color</strong>`);
    {
      for (const colors of [schemeCategory10, schemeAccent, schemeDark2, schemePastel1, schemePastel2, schemeSet1, schemeSet2, schemeSet3]) {
        node.insertAdjacentHTML('beforeend', `<div class="lu-color-line">
          ${colors.map((d) => `<div class="lu-checkbox-color"><input id="${id}${fixCSS(d)}" name="color" type="radio" value="${d}"><label for="${id}${fixCSS(d)}" style="background: ${d}"></label></div>`).join('')}
        </div>`);
      }
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox"><input id="${id}O" name="color" type="radio" value="custom:solid">
        <label for="${id}O"><input type="color" name="solid" list="${id}L"></label>
      </div>`);
    }
    node.insertAdjacentHTML('beforeend', `<strong>Sequential Color</strong>`);
    {
      for (const colors of sequentialColors) {
        node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}">
        <label for="${id}${colors.name}" style="${gradient(colors.apply, 9)}"></label>
      </div>`);
      }
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}S" name="color" type="radio" value="custom:sequential">
        <label for="${id}S"><input type="color" name="interpolate0" list="${id}LW"><input type="color" name="interpolate1" list="${id}LW"></label>
      </div>`);
    }
    node.insertAdjacentHTML('beforeend', `<strong>Diverging Color</strong>`);
    {
      for (const colors of divergentColors) {
        node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${color.name}" name="color" type="radio" value="${color.name}">
        <label for="${id}${color.name}" style="${gradient(colors.apply, 11)}"></label>
      </div>`);
      }
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}D" name="color" type="radio" value="custom:divergent">
        <label for="${id}D">
          <input type="color" name="diverging-1" list="${id}L">
          <input type="color" name="diverging0" list="${id}LW">
          <input type="color" name="diverging1" list="${id}L">
          </label>
      </div>`);
    }

    this.forEach('input[type=radio]', (d: HTMLInputElement) => {
      d.onchange = () => {
        if (!d.checked) {
          return;
        }
        if (!d.value.startsWith('custom:')) {
          this.column.setColorMapping(createColorMappingFunction(this.column.color, d.value));
          return;
        }
        // TODO
      };
    };
  }
}

function gradient(interpolate: (v: number)=>string, steps = 2) {
  if (steps <= 1) {
    return `background: ${interpolate(0)}`;
  }
  const stepSize = 1 / (steps - 1);
  let r = `background: linear-gradient(to right`;
  for (let i = 0; i < steps; ++i) {
    r += `, ${interpolate(i * stepSize)} ${round((i * stepSize) * 100, 2)}%`;
  }
  r += ')';
  return r;
}

function _steps(color: (v: number)=>string, count = 2) {
  if (count === 1) {
    return `background: ${color(0)}`;
  }
  let r = `background: linear-gradient(to right`;
  const stepSize = 1 / count;
  const half = stepSize / 2;
  for (let i = 0; i < count; ++i) {
    // stepped
    // first and last at border else center
    const shift = i === 0 ? 0 : (i === (count - 1) ? stepSize : half);
    const c = color(i * stepSize + shift);
    r += `, ${c} ${round((i * stepSize) * 100, 2)}%, ${c} ${round(((i + 1) * stepSize) * 100, 2)}%`;
  }
  r += ')';
  return r;
}
