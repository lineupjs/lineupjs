import ADialog from './ADialog';
import {IDialogContext} from './ADialog';
import {schemeCategory10, schemeSet1, schemeSet2, schemeSet3, schemeAccent, schemeDark2, schemePastel2, schemePastel1, interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds, interpolateCool, interpolateCubehelixDefault, interpolateWarm, interpolatePlasma, interpolateMagma, interpolateViridis, interpolateInferno, interpolateYlOrRd, interpolateYlOrBr, interpolateBuGn, interpolateBuPu, interpolateGnBu, interpolateOrRd, interpolatePuBuGn, interpolatePuBu, interpolatePuRd, interpolateRdPu, interpolateYlGnBu, interpolateYlGn, interpolateRainbow, interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdBu, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral} from 'd3-scale-chromatic';
import {round, fixCSS} from '../../internal';
import {uniqueId} from '../../renderer/utils';


const byName = new Map<string, (v: number)=>string>();
const byFunction = new Map<(v: number)=>string, string>();
{
  const lookup: { [key: string]: (v: number)=>string } = {
    interpolateBlues,
    interpolateGreens,
    interpolateGreys,
    interpolateOranges,
    interpolatePurples,
    interpolateReds,
    interpolateCool,
    interpolateCubehelixDefault,
    interpolateWarm,
    interpolatePlasma,
    interpolateMagma,
    interpolateViridis,
    interpolateInferno,
    interpolateYlOrRd,
    interpolateYlOrBr,
    interpolateBuGn,
    interpolateBuPu,
    interpolateGnBu,
    interpolateOrRd,
    interpolatePuBuGn,
    interpolatePuBu,
    interpolatePuRd,
    interpolateRdPu,
    interpolateYlGnBu,
    interpolateYlGn,
    interpolateRainbow,
    interpolateBrBG,
    interpolatePRGn,
    interpolatePiYG,
    interpolatePuOr,
    interpolateRdBu,
    interpolateRdGy,
    interpolateRdYlBu,
    interpolateRdYlGn,
    interpolateSpectral
  };

  for (const key of Object.keys(lookup)) {
    const v = lookup[key];
    byName.set(key, v);
    byFunction.set(v, key);
  }
}

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
  node.insertAdjacentHTML('beforeend', `<datalist id="${id}L">${schemeCategory10.map((d) => `<option value="${d}"></option>`).join('')}</datalist>`);
  node.insertAdjacentHTML('beforeend', `<datalist id="${id}LW"><option value="#FFFFFF"></option>${schemeCategory10.slice(0, -1).map((d) => `<option value="${d}"></option>`).join('')}</datalist>`);

  node.insertAdjacentHTML('beforeend', `<strong>Solid Color</strong>`);
  {
    for (const colors of [schemeCategory10, schemeAccent, schemeDark2, schemePastel1, schemePastel2, schemeSet1, schemeSet2, schemeSet3]) {
      node.insertAdjacentHTML('beforeend', `<div class="lu-color-line">
        ${colors.map((d) => `<div class="lu-checkbox-color"><input id="${id}${fixCSS(d)}" name="color" type="radio" value="${d}"><label for="${id}${fixCSS(d)}" style="background: ${d}"></label></div>`).join('')}
      </div>`);
    }
    node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox"><input id="${id}O" name="color" type="radio" value="solid:custom">
      <label for="${id}O"><input type="color" name="solid" list="${id}L"></label>
    </div>`);
  }
  node.insertAdjacentHTML('beforeend', `<strong>Sequential Color</strong>`);
  {
    for (const colors of [interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds]) {
      const name = byFunction.get(colors)!;
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${name}" name="color" type="radio" value="${name}">
      <label for="${id}${name}" style="${gradient(colors, 4)}"></label>
    </div>`);
    }
    for (const colors of [interpolateViridis, interpolateInferno, interpolateMagma, interpolatePlasma, interpolateWarm, interpolateCool, interpolateCubehelixDefault]) {
      const name = byFunction.get(colors)!;
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${name}" name="color" type="radio" value="${name}">
      <label for="${id}${name}" style="${gradient(colors, 9)}"></label>
    </div>`);
    }
    for (const colors of [interpolateBuGn, interpolateBuPu, interpolateGnBu, interpolateOrRd, interpolatePuBuGn, interpolatePuBu, interpolatePuRd, interpolateRdPu, interpolateYlGnBu, interpolateYlGn, interpolateYlOrBr, interpolateYlOrRd]) {
      const name = byFunction.get(colors)!;
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${name}" name="color" type="radio" value="${name}">
      <label for="${id}${name}" style="${gradient(colors, 4)}"></label>
    </div>`);
    }

    for (const colors of [interpolateRainbow]) {
      const name = byFunction.get(colors)!;
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${name}" name="color" type="radio" value="${name}">
      <label for="${id}${name}" style="${gradient(colors, 9)}"></label>
    </div>`);
    }
    node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}S" name="color" type="radio" value="solid">
      <label for="${id}S"><input type="color" name="interpolate0" list="${id}LW"><input type="color" name="interpolate1" list="${id}LW"></label>
    </div>`);
  }
  node.insertAdjacentHTML('beforeend', `<strong>Diverging Color</strong>`);
  {
    for (const colors of [interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdBu, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral]) {
      const name = byFunction.get(colors)!;
      node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}${name}" name="color" type="radio" value="${name}">
      <label for="${id}${name}" style="${gradient(colors, 11)}"></label>
    </div>`);
    }
    node.insertAdjacentHTML('beforeend', `<div class="lu-checkbox lu-color-gradient"><input id="${id}D" name="color" type="radio" value="solid">
      <label for="${id}D">
        <input type="color" name="diverging-1" list="${id}L">
        <input type="color" name="diverging0" list="${id}LW">
        <input type="color" name="diverging1" list="${id}L">
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
