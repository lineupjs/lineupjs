import ADialog from './ADialog';
import {IDialogContext} from './ADialog';
import {schemeCategory10, schemeSet1, schemeSet2, schemeSet3, schemeAccent, schemeDark2, schemePastel2, schemePastel1, interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds, interpolateCool, interpolateCubehelixDefault, interpolateWarm, interpolatePlasma, interpolateMagma, interpolateViridis, interpolateInferno, interpolateYlOrRd, interpolateYlOrBr, interpolateBuGn, interpolateBuPu, interpolateGnBu, interpolateOrRd, interpolatePuBuGn, interpolatePuBu, interpolatePuRd, interpolateRdPu, interpolateYlGnBu, interpolateYlGn, interpolateRainbow, interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdBu, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral} from 'd3-scale-chromatic';
import {round, fixCSS} from '../../internal';
import {uniqueId} from '../../renderer/utils';

/** @internal */
export default class ColorPicker extends ADialog {

  constructor(dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
  }

  protected build(node: HTMLElement) {
    colors(node);
  }

}

export function colors(node: HTMLElement) {
  const id = uniqueId('col');
  node.insertAdjacentHTML('beforeend', `<datalist id="${id}C">${schemeCategory10.map((d) => `<option value="${d}"></option>`).join('')}</datalist>`);

  node.insertAdjacentHTML('beforeend', `<strong>Solid Color</strong>`);
  {
    for (const colors of [schemeCategory10, schemeAccent, schemeDark2, schemePastel1, schemePastel2, schemeSet1, schemeSet2, schemeSet3]) {
      node.insertAdjacentHTML('beforeend', `<div class="lu-color-line">
        ${colors.map((d) => `<div class="lu-checkbox-color"><input id="${id}0${fixCSS(d)}" name="color" type="radio" value="${d}"><label for="${id}0${fixCSS(d)}" style="background: ${d}"></label></div>`).join('')}
      </div>`);
    }
    node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox"><input id="${id}0C" name="color" type="radio" value="solid:custom">
      <label for="${id}0C"><input type="color" name="solid" list="${id}C"></label>
    </div>`);
  }
  node.insertAdjacentHTML('beforeend', `<strong>Sequential Color</strong>`);
  {
    for (const colors of [interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds]) {
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}">
      <label for="${id}${colors.name}" style="${gradient(colors, 4)}"></label>
    </div>`);
    }
    for (const colors of [interpolateViridis, interpolateInferno, interpolateMagma, interpolatePlasma, interpolateWarm, interpolateCool, interpolateCubehelixDefault]) {
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}">
      <label for="${id}${colors.name}" style="${gradient(colors, 9)}"></label>
    </div>`);
    }
    for (const colors of [interpolateBuGn, interpolateBuPu, interpolateGnBu, interpolateOrRd, interpolatePuBuGn, interpolatePuBu, interpolatePuRd, interpolateRdPu, interpolateYlGnBu, interpolateYlGn, interpolateYlOrBr, interpolateYlOrRd]) {
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}">
      <label for="${id}${colors.name}" style="${gradient(colors, 4)}"></label>
    </div>`);
    }

    for (const colors of [interpolateRainbow]) {
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}">
      <label for="${id}${colors.name}" style="${gradient(colors, 9)}"></label>
    </div>`);
    }
    node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}0C" name="color" type="radio" value="solid">
      <label for="${id}0C"><input type="color" name="interpolate0" list="${id}C"><input type="color" name="interpolate1" list="${id}C"></label>
    </div>`);
  }
  node.insertAdjacentHTML('beforeend', `<strong>Diverging Color</strong>`);
  {
    for (const colors of [interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdBu, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral]) {
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${colors.name}" name="color" type="radio" value="${colors.name}">
      <label for="${id}${colors.name}" style="${gradient(colors, 11)}"></label>
    </div>`);
    }
    node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}0C" name="color" type="radio" value="solid">
      <label for="${id}0C">
        <input type="color" name="diverging-1" list="${id}C">
        <input type="color" name="diverging0" list="${id}C">
        <input type="color" name="diverging1" list="${id}C">
        </label>
    </div>`);
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

function steps(color: (v: number)=>string, count = 2) {
  if (count === 1) {
    return `background: ${color(0)}`;
  }
  let r = `background: linear-gradient(to right`;
  const stepSize = 1 / count;
  for (let i = 0; i < count; ++i) {
    // stepped
    r += `, ${color(i * stepSize)} ${round((i * stepSize) * 100, 2)}%, ${color(i * stepSize)} ${round(((i + 1) * stepSize) * 100, 2)}%`;
  }
  r += ')';
  return r;
}
