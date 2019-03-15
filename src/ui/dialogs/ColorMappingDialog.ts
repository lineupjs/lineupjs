import ADialog, {IDialogContext} from './ADialog';
import {schemeCategory10, schemeSet1, schemeSet2, schemeSet3, schemeAccent, schemeDark2, schemePastel2, schemePastel1} from 'd3-scale-chromatic';
import {round} from '../../internal';
import {uniqueId} from '../../renderer/utils';
import {QuantizedColorFunction, CustomColorMappingFunction, SolidColorFunction, SequentialColorFunction, DivergentColorFunction} from '../../model/ColorMappingFunction';
import {IMapAbleColumn, DEFAULT_COLOR} from '../../model';
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
    const entries = current instanceof CustomColorMappingFunction ? current.entries : [];

    let h = '';
    h += `<datalist id="${id}L">${schemeCategory10.map((d) => `<option>${d}"</option>`).join('')}</datalist>`;
    h += `<datalist id="${id}LW"><option>#FFFFFF"</option>${schemeCategory10.slice(0, -1).map((d) => `<option>${d}</option>`).join('')}</datalist>`;

    h += `<strong>Quantization</strong>
    <label class="${cssClass('checkbox')}">
      <input name="kind" type="radio" id="${id}KC" value="continuous" ${!(current instanceof QuantizedColorFunction) ? 'checked': ''}>
      <span>Continuous</span>
    </label>
    <label class="${cssClass('checkbox')}">
      <input name="kind" type="radio" id="${id}KQ" value="quantized" ${current instanceof QuantizedColorFunction ? 'checked': ''}>
      <span><input type="number" id="${id}KQS" min="2" step="1" value="${current instanceof QuantizedColorFunction ? current.steps : 5}">&nbsp; steps</span>
    </label>`;

    h += `<strong data-toggle="${current instanceof SolidColorFunction ? 'open' : ''}">Solid Color</strong>`;
    h += `<div>`;
    {
      const refColor = current instanceof SolidColorFunction ? current.color : '';
      let has = false;
      const colorsets = [schemeCategory10, schemeAccent, schemeDark2, schemePastel1, schemePastel2, schemeSet1, schemeSet2, schemeSet3];
      for (const colors of colorsets) {
        has = has || colors.includes(refColor);
        h += `<div class="${cssClass('color-line')}">
          ${colors.map((d) => `<label class="${cssClass('checkbox-color')}">
              <input name="color" type="radio" value="${d}" ${d === refColor ? 'checked="checked"': ''}>
              <span style="background: ${d}"></span>
            </label>`).join('')}
        </div>`;
      }
      h += `<label class="${cssClass('checkbox')} ${cssClass('color-gradient')}"><input name="color" type="radio" value="custom:solid" ${refColor && !has ? 'checked="checked"' : ''}>
        <span class="${cssClass('color-custom')}"><input type="color" name="solid" list="${id}L" value="${current instanceof SolidColorFunction ? current.color : DEFAULT_COLOR}" ${refColor && !has ? '' : 'disabled'}></span>
      </label>`;
    }
    h += '</div>';

    h += `<strong data-toggle="${current instanceof SequentialColorFunction || (current instanceof CustomColorMappingFunction && entries.length === 2) ? 'open' : ''}">Sequential Color</strong>`;
    h += '<div>';
    {
      const name = current instanceof SequentialColorFunction ? current.name : '';
      for (const colors of Object.keys(SequentialColorFunction.FUNCTIONS)) {
        h += `<label class="${cssClass('checkbox')} ${cssClass('color-gradient')}"><input name="color" type="radio" value="${colors}" ${colors === name ? 'checked="checked"' : ''}>
        <span data-c="${colors}" style="background: ${gradient(SequentialColorFunction.FUNCTIONS[colors], 9)}"></span>
      </label>`;
      }
      const isCustom = entries.length === 2;
      h += `<label class="${cssClass('checkbox')} ${cssClass('color-gradient')}">
        <input name="color" type="radio" value="custom:sequential" ${isCustom ? 'checked': ''}>
        <span class="${cssClass('color-custom')}">
          <input type="color" name="interpolate0" list="${id}LW" ${!isCustom ? 'disabled': `value="${entries[0].color}"`}>
          <input type="color" name="interpolate1" list="${id}LW" ${!isCustom ? 'disabled': `value="${entries[entries.length - 1].color}"`}>
        </span>
      </label>`;
    }
    h += '</div>';
    h += `<strong data-toggle="${current instanceof DivergentColorFunction || (current instanceof CustomColorMappingFunction && entries.length === 3) ? 'open' : ''}">Diverging Color</strong>`;
    h += '<div>';
    {
      const name = current instanceof SequentialColorFunction ? current.name : '';
      for (const colors of Object.keys(DivergentColorFunction.FUNCTIONS)) {
        h += `<label class="${cssClass('checkbox')} ${cssClass('color-gradient')}"><input name="color" type="radio" value="${colors}" ${colors === name ? 'checked="checked"' : ''}>
        <span data-c="${colors}" style="background: ${gradient(DivergentColorFunction.FUNCTIONS[colors], 11)}"></span>
      </label>`;
      }
      const isCustom = entries.length === 3;
      h += `<label class="${cssClass('checkbox')} ${cssClass('color-gradient')}">
        <input name="color" type="radio" value="custom:divergent" ${isCustom ? 'checked' : ''}>
        <span class="${cssClass('color-custom')}">
          <input type="color" name="divergingm1" list="${id}L" ${!isCustom ? 'disabled': `value="${entries[0].color}"`}>
          <input type="color" name="diverging0" list="${id}LW" ${!isCustom ? 'disabled': `value="${entries[1].color}"`}>
          <input type="color" name="diverging1" list="${id}L" ${!isCustom ? 'disabled': `value="${entries[2].color}"`}>
        </span>
      </label>`;
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
          return new SolidColorFunction((<HTMLInputElement>node.querySelector('input[name=solid]')!).value);
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
      if (input.value in SequentialColorFunction.FUNCTIONS) {
        return new SequentialColorFunction(input.value);
      }
      if (input.value in DivergentColorFunction.FUNCTIONS) {
        return new DivergentColorFunction(input.value);
      }
      return new SolidColorFunction(input.value);
    };

    const updateColor = (d: HTMLInputElement) => {
      if (!d.checked) {
        return;
      }
      // disable customs
      for (const custom of customs) {
        Array.from(custom.nextElementSibling!.getElementsByTagName('input')).forEach((s) => s.disabled = custom !== d);
      }
      const base = toColor(d);
      if (quantized.checked && !(base instanceof SolidColorFunction)) {
        this.column.setColorMapping(new QuantizedColorFunction(base, parseInt(steps.value, 10)));
      } else {
        this.column.setColorMapping(base);
      }
    };

    const updateSelectedColor = () => {
      const selected = this.findInput(`input[name=color]:checked`);
      if (selected) {
        updateColor(selected);
      }
    };

    this.forEach('input[name=color]', (d: HTMLInputElement) => {
      if (d.value.startsWith('custom:')) {
        customs.push(d);
      }
      d.onchange = () => updateColor(d);
    });

    // upon changing custom parameter trigger an update
    this.forEach(`.${cssClass('color-custom')} input[type=color]`, (d: HTMLInputElement) => {
      d.onchange = () => {
        const item = (<HTMLInputElement>d.parentElement!.previousElementSibling!);
        updateColor(item);
      };
    });

    continuouos.onchange = () => {
      if (continuouos.checked) {
        this.updateGradients(-1);
        updateSelectedColor();
      }
    };
    quantized.onchange = steps.onchange = () => {
      if (!quantized.checked) {
        this.updateGradients(-1);
        updateSelectedColor();
        return;
      }
      if (toggles[0].dataset.toggle === 'open') {
        // auto open sequential
        toggles[0].dataset.toggle = '';
        toggles[1].dataset.toggle = 'open';
      }
      this.updateGradients(parseInt(steps.value, 10));
      updateSelectedColor();
    };
  }

  private updateGradients(steps: number) {
    this.forEach(`span[data-c]`, (d: HTMLElement) => {
      const key = d.dataset.c!;
      const s = SequentialColorFunction.FUNCTIONS[key];
      if (s) {
        d.style.background = steps < 0 ? gradient(s, 9) : steppedGradient(s, steps);
        return;
      }
      const di = DivergentColorFunction.FUNCTIONS[key];
      if (di) {
        d.style.background = steps < 0 ? gradient(di, 11) : steppedGradient(di, steps);
        return;
      }
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
