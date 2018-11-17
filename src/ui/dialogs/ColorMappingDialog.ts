import ADialog from './ADialog';
import {IDialogContext} from './ADialog';
import {schemeCategory10, schemeSet1, schemeSet2, schemeSet3, schemeAccent, schemeDark2, schemePastel2, schemePastel1} from 'd3-scale-chromatic';
import {round, fixCSS} from '../../internal';
import {uniqueId} from '../../renderer/utils';
import {sequentialColors, divergentColors, createColorMappingFunction, lookupInterpolatingColor, QuantizedColorFunction, asColorFunction, CustomColorMappingFunction} from '../../model/ColorMappingFunction';
import Column, {IMapAbleColumn} from '../../model';
import {cssClass} from '../../styles';

/** @internal */
export default class ColorMappingDialog extends ADialog {
  constructor(private readonly column: IMapAbleColumn, dialog: IDialogContext) {
    super(dialog);
  }

  protected build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-color'));
    const id = uniqueId('col');

    const current = this.column.getColorMapping();
    const entries = current.type === 'custom' ? current.entries : [];

    let h = '';
    h += `<datalist id="${id}L">${schemeCategory10.map((d) => `<option>${d}"</option>`).join('')}</datalist>`;
    h += `<datalist id="${id}LW"><option>#FFFFFF"</option>${schemeCategory10.slice(0, -1).map((d) => `<option>${d}</option>`).join('')}</datalist>`;

    h += `<strong>Quantization</strong>
    <div class="${cssClass('checkbox')}">
      <input id="${id}KC" name="kind" type="radio" value="continuous" ${current.type !== 'quantized' ? 'checked': ''}>
      <label for="${id}CK">Continuous</label>
    </div>
    <div class="${cssClass('checkbox')}">
      <input id="${id}KQ" name="kind" type="radio" value="quantized" ${current.type === 'quantized' ? 'checked': ''}>
      <label for="${id}KQ"><input type="number" id="${id}KQS" min="2" step="1" value="${current.type === 'quantized' ? current.steps : 5}">&nbsp; steps</label>
    </div>`;

    h += `<strong data-toggle="${current.type === 'solid' ? 'open' : ''}">Solid Color</strong>`;
    h += `<div>`;
    {
      const refColor = current.type === 'solid' ? current.color : '';
      let has = false;
      const colorsets = [schemeCategory10, schemeAccent, schemeDark2, schemePastel1, schemePastel2, schemeSet1, schemeSet2, schemeSet3];
      for (const colors of colorsets) {
        has = has || colors.includes(refColor);
        h += `<div class="${cssClass('color-line')}">
          ${colors.map((d) => `<div class="${cssClass('checkbox-color')}">
              <input id="${id}${fixCSS(d)}" name="color" type="radio" value="${d}" ${d === refColor ? 'checked="checked"': ''}>
              <label for="${id}${fixCSS(d)}" style="background: ${d}"></label>
            </div>`).join('')}
        </div>`;
      }
      h += `<div class="${cssClass('checkbox')}"><input id="${id}O" name="color" type="radio" value="custom:solid" ${refColor && !has ? 'checked="checked"' : ''}>
        <label for="${id}O"><input type="color" name="solid" list="${id}L" value="${current.type === 'solid' ? current.color : Column.DEFAULT_COLOR}" ${refColor && !has ? '' : 'disabled'}></label>
      </div>`;
    }
    h += '</div>';

    h += `<strong data-toggle="${current.type === 'sequential' || (current.type === 'custom' && entries.length === 2) ? 'open' : ''}">Sequential Color</strong>`;
    h += '<div>';
    {
      const name = current.type === 'sequential' ? current.name : '';
      for (const colors of sequentialColors) {
        h += `<div class="${cssClass('checkbox')} ${cssClass('color-gradient')}"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}" ${colors.name === name ? 'checked="checked"' : ''}>
        <label for="${id}${colors.name}" data-c="${colors.name}" style="background: ${gradient(colors.apply, 9)}"></label>
      </div>`;
      }
      const isCustom = entries.length === 2;
      h += `<div class="${cssClass('checkbox')} ${cssClass('color-gradient')}">
        <input id="${id}S" name="color" type="radio" value="custom:sequential" ${isCustom ? 'checked': ''}>
        <label for="${id}S" class="${cssClass('color-custom')}">
          <input type="color" name="interpolate0" list="${id}LW" ${!isCustom ? 'disabled': `value="${entries[0].color}"`}>
          <input type="color" name="interpolate1" list="${id}LW" ${!isCustom ? 'disabled': `value="${entries[entries.length - 1].color}"`}>
        </label>
      </div>`;
    }
    h += '</div>';
    h += `<strong data-toggle="${current.type === 'divergent' || (current.type === 'custom' && entries.length === 3) ? 'open' : ''}">Diverging Color</strong>`;
    h += '<div>';
    {
      const name = current.type === 'sequential' ? current.name : '';
      for (const colors of divergentColors) {
        h += `<div class="${cssClass('checkbox')} ${cssClass('color-gradient')}"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}" ${colors.name === name ? 'checked="checked"' : ''}>
        <label for="${id}${colors.name}" data-c="${colors.name}" style="background: ${gradient(colors.apply, 11)}"></label>
      </div>`;
      }
      const isCustom = entries.length === 3;
      h += `<div class="${cssClass('checkbox')} ${cssClass('color-gradient')}"><input id="${id}D" name="color" type="radio" value="custom:divergent" ${isCustom ? 'checked': ''}>
        <label for="${id}D" class="${cssClass('custom-color')}">
          <input type="color" name="divergingm1" list="${id}L" ${!isCustom ? 'disabled': `value="${entries[0].color}"`}>
          <input type="color" name="diverging0" list="${id}LW" ${!isCustom ? 'disabled': `value="${entries[1].color}"`}>
          <input type="color" name="diverging1" list="${id}L" ${!isCustom ? 'disabled': `value="${entries[2].color}"`}>
          </label>
      </div>`;
    }
    h += '</div>';

    node.insertAdjacentHTML('beforeend', h);

    this.interactive(node, id);
  }

  private interactive(node: HTMLElement, id: string) {
    const continuouos = this.findInput(`#${id}KC`);
    const quantized = this.findInput(`#${id}KQ`);
    const steps = this.findInput(`#${id}KQS`);
    const toggles = <HTMLElement[]>Array.from(node.querySelectorAll('strong[data-toggle]'));

    continuouos.onchange = () => {
      if (continuouos.checked) {
        this.updateGradients(-1);
      }
    };
    quantized.onchange = steps.onchange = () => {
      if (!quantized.checked) {
        this.updateGradients(-1);
        return;
      }
      if (toggles[0].dataset.toggle === 'open') {
        // auto open sequential
        toggles[0].dataset.toggle = '';
        toggles[1].dataset.toggle = 'open';
      }
      this.updateGradients(parseInt(steps.value, 10));
    };

    for (const toggle of toggles) {
      toggle.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        for (const t2 of toggles) {
          t2.dataset.toggle = t2.dataset.toggle === 'open' || toggle !== t2 ? '' : 'open';
        }
      };
    }

    const customs: HTMLElement[] = [];

    const toColor = (input: HTMLInputElement) => {
      switch (input.value) {
        case 'custom:solid':
          return asColorFunction((<HTMLInputElement>node.querySelector('input[name=solid]')!).value);
        case 'custom:sequential':
          const s0 = (<HTMLInputElement>node.querySelector('input[name=interpolate0]')!).value;
          const s1 = (<HTMLInputElement>node.querySelector('input[name=interpolate1]')!).value;
          return new CustomColorMappingFunction([{color: s0, value: 0}, {color: s1, value: 1}]);
        case 'custom:diverging':
          const dm1 = (<HTMLInputElement>node.querySelector('input[name=divergentm1]')!).value;
          const d0 = (<HTMLInputElement>node.querySelector('input[name=divergent0]')!).value;
          const d1 = (<HTMLInputElement>node.querySelector('input[name=divergent1]')!).value;
          return new CustomColorMappingFunction([{color: dm1, value: 0}, {color: d0, value: 0.5}, {color: d1, value: 1}]);
      }
      return createColorMappingFunction(input.value);
    };

    this.forEach('input[name=color]', (d: HTMLInputElement) => {
      if (d.value.startsWith('custom:')) {
        customs.push(d);
      }
      d.onchange = () => {
        if (!d.checked) {
          return;
        }
        // disable customs
        for (const custom of customs) {
          Array.from(custom.nextElementSibling!.querySelectorAll('input')).forEach((s) => s.disabled = custom !== d);
        }
        const base = toColor(d);
        if (quantized.checked && base.type !== 'solid') {
          this.column.setColorMapping(new QuantizedColorFunction(base, parseInt(steps.value, 10)));
        } else {
          this.column.setColorMapping(base);
        }
      };
    });

    // upon changing custom parameter trigger an update
    this.forEach('label > input[type=color]', (d: HTMLInputElement) => {
      d.onchange = () => {
        const item = (<HTMLInputElement>d.parentElement!.previousElementSibling!);
        item.onchange!.call(item, null);
      };
    });
  }

  private updateGradients(steps: number) {
    this.forEach(`label[data-c]`, (d: HTMLElement) => {
      const f = lookupInterpolatingColor.get(d.dataset.c!)!;
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
