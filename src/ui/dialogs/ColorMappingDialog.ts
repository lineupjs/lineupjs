import ADialog from './ADialog';
import {IDialogContext} from './ADialog';
import {schemeCategory10, schemeSet1, schemeSet2, schemeSet3, schemeAccent, schemeDark2, schemePastel2, schemePastel1} from 'd3-scale-chromatic';
import {round, fixCSS} from '../../internal';
import {uniqueId} from '../../renderer/utils';
import {sequentialColors, divergentColors, createColorMappingFunction, lookupD3Color, QuantizedColorFunction} from '../../model/ColorMappingFunction';
import Column, {IMapAbleColumn} from '../../model';

/** @internal */
export default class ColorMappingDialog extends ADialog {
  constructor(private readonly column: IMapAbleColumn, dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    node.classList.add('lu-dialog-color');
    const id = uniqueId('col');

    const current = this.column.getColorMapping();

    let h = `<datalist id="${id}L">${schemeCategory10.map((d) => `<option value="${d}"></option>`).join('')}</datalist>`;
    h += `<datalist id="${id}LW"><option value="#FFFFFF"></option>${schemeCategory10.slice(0, -1).map((d) => `<option value="${d}"></option>`).join('')}</datalist>`;

    h += `<strong>Quantization</strong>
    <div class="lu-checkbox">
      <input id="${id}KC" name="kind" type="radio" value="continuous" ${current.type !== 'quantized' ? 'checked': ''}>
      <label for="${id}CK">Continuous</label>
    </div>
    <div class="lu-checkbox">
      <input id="${id}KQ" name="kind" type="radio" value="quantized" ${current.type === 'quantized' ? 'checked': ''}>
      <label for="${id}KQ"><input type="number" id="${id}KQS" min="2" step="1" value="${current.type === 'quantized' ? current.steps : 2}"> steps</label>
    </div>`;

    h += `<strong data-toggle="${current.type === 'solid' ? 'open' : ''}">Solid Color</strong>`;
    h += `<div>`;
    {
      const refColor = current.type === 'solid' ? current.color : '';
      let has = false;
      const colorsets = [schemeCategory10, schemeAccent, schemeDark2, schemePastel1, schemePastel2, schemeSet1, schemeSet2, schemeSet3];
      for (const colors of colorsets) {
        has = has || colors.includes(refColor);
        h += `<div class="lu-color-line">
          ${colors.map((d) => `<div class="lu-checkbox-color">
              <input id="${id}${fixCSS(d)}" name="color" type="radio" value="${d}" ${d === refColor ? 'checked="checked"': ''}>
              <label for="${id}${fixCSS(d)}" style="background: ${d}"></label>
            </div>`).join('')}
        </div>`;
      }
      h += `<div class="lu-checkbox"><input id="${id}O" name="color" type="radio" value="custom:solid" ${refColor && !has ? 'checked="checked"' : ''}>
        <label for="${id}O"><input type="color" name="solid" list="${id}L" value="${current.type === 'solid' ? current.color : Column.DEFAULT_COLOR}"></label>
      </div>`;
    }
    h += '</div>';

    h += `<strong data-toggle="${current.type === 'sequential' ? 'open' : ''}">Sequential Color</strong>`;
    h += '<div>';
    {
      const name = current.type === 'sequential' ? current.name : '';
      for (const colors of sequentialColors) {
        h += `<div class="lu-checkbox lu-color-gradient"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}" ${colors.name === name ? 'checked="checked"' : ''}>
        <label for="${id}${colors.name}" data-c="${colors.name}" style="background: ${gradient(colors.apply, 9)}"></label>
      </div>`;
      }
      h += `<div class="lu-checkbox lu-color-gradient"><input id="${id}S" name="color" type="radio" value="custom:sequential">
        <label for="${id}S"><input type="color" name="interpolate0" list="${id}LW"><input type="color" name="interpolate1" list="${id}LW"></label>
      </div>`;
    }
    h += '</div>';
    h += `<strong data-toggle="${current.type === 'divergent' ? 'open' : ''}">Diverging Color</strong>`;
    h += '<div>';
    {
      const name = current.type === 'sequential' ? current.name : '';
      for (const colors of divergentColors) {
        h += `<div class="lu-checkbox lu-color-gradient"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}" ${colors.name === name ? 'checked="checked"' : ''}>
        <label for="${id}${colors.name}" data-c="${colors.name}" style="background: ${gradient(colors.apply, 11)}"></label>
      </div>`;
      }
      h += `<div class="lu-checkbox lu-color-gradient"><input id="${id}D" name="color" type="radio" value="custom:divergent">
        <label for="${id}D">
          <input type="color" name="diverging-1" list="${id}L">
          <input type="color" name="diverging0" list="${id}LW">
          <input type="color" name="diverging1" list="${id}L">
          </label>
      </div>`;
    }
    h += '</div>';

    node.insertAdjacentHTML('beforeend', h);

    const continuouos = this.findInput(`#${id}KC`);
    const quantized = this.findInput(`#${id}KQ`);
    const steps = this.findInput(`#${id}KQS`);

    continuouos.onchange = () => {
      if (continuouos.checked) {
        this.updateGradients(-1);
      }
    };
    quantized.onchange = steps.onchange = () => {
      if (!quantized.checked) {
        this.updateGradients(-1);
      } else {
        this.updateGradients(parseInt(steps.value, 10));
      }
    };

    const toggles = <HTMLElement[]>Array.from(node.querySelectorAll('strong[data-toggle]'));
    for (const toggle of toggles) {
      toggle.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        for (const t2 of toggles) {
          t2.dataset.toggle = t2.dataset.toggle === 'open' || toggle !== t2 ? '' : 'open';
        }
      };
    }

    this.forEach('input[name=color]', (d: HTMLInputElement) => {
      d.onchange = () => {
        if (!d.checked) {
          return;
        }
        if (d.value.startsWith('custom:')) {
          // TODO
          return;
        }
        const base = createColorMappingFunction(this.column.color, d.value);
        if (quantized.checked) {
          this.column.setColorMapping(new QuantizedColorFunction(base, parseInt(steps.value, 10)));
        } else {
          this.column.setColorMapping(base);
        }
      };
    });
  }

  private updateGradients(steps: number) {
    this.forEach(`label[data-c]`, (d: HTMLElement) => {
      const f = lookupD3Color.get(d.dataset.c!)!;
      d.style.background = steps < 0 ? gradient(f.apply, f.type === 'sequential' ? 9 : 11) : steppedGradient(f.apply, steps);
    });
  }
}

function gradient(interpolate: (v: number)=>string, steps = 2) {
  if (steps <= 1) {
    return `${interpolate(0)}`;
  }
  const stepSize = 1 / (steps - 1);
  let r = `linear-gradient(to right`;
  for (let i = 0; i < steps; ++i) {
    r += `, ${interpolate(i * stepSize)} ${round((i * stepSize) * 100, 2)}%`;
  }
  r += ')';
  return r;
}

function steppedGradient(color: (v: number)=>string, count = 2) {
  if (count === 1) {
    return `${color(0)}`;
  }
  let r = `linear-gradient(to right`;
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
