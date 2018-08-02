import {schemeCategory10, schemeSet1, schemeSet2, schemeSet3, schemeAccent, schemeDark2, schemePastel2, schemePastel1, interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds, interpolateCool, interpolateCubehelixDefault, interpolateWarm, interpolatePlasma, interpolateMagma, interpolateViridis, interpolateInferno, interpolateYlOrRd, interpolateYlOrBr, interpolateBuGn, interpolateBuPu, interpolateGnBu, interpolateOrRd, interpolatePuBuGn, interpolatePuBu, interpolatePuRd, interpolateRdPu, interpolateYlGnBu, interpolateYlGn, interpolateRainbow, interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdBu, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral} from 'd3-scale-chromatic';
import {IMapAbleDesc} from './MappingFunction';
import Column from './Column';


export interface IColorMappingFunction {
  apply(v: number): string;

  dump(): any;

  restore(dump: any): void;

  clone(): IColorMappingFunction;

  eq(other: IColorMappingFunction): boolean;
}

export class D3ColorFunction implements IColorMappingFunction {
  constructor(public readonly name: string, public readonly apply: (v: number)=>string) {

  }

  dump() {
    return this.name;
  }

  restore() {
    // dummy
  }

  clone() {
    return this; // no clone needed since not parameterized
  }

  eq(other: IColorMappingFunction): boolean {
    return other === this;
  }
}

export class SolidColorFunction implements IColorMappingFunction {
  constructor(public readonly color: string) {

  }

  apply() {
    return this.color;
  }

  dump() {
    return this.color;
  }

  restore() {
    // dummy
  }

  clone() {
    return this; // no clone needed since not parameterized
  }

  eq(other: IColorMappingFunction): boolean {
    return other instanceof SolidColorFunction && other.color === this.color;
  }
}

export const DEFAULT_COLOR_FUNCTION = new SolidColorFunction(Column.DEFAULT_COLOR);

const d3InterpolateColors: D3ColorFunction[] = [];
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
    d3InterpolateColors.push(new D3ColorFunction(key, lookup[key]));
  }
}

export function createColorMappingFunction(color: string | null, dump: any): IColorMappingFunction {
  return DEFAULT_COLOR_FUNCTION;
}


export function restoreColorMapping(color: string | null, desc: IMapAbleDesc): IColorMappingFunction {
  if (desc.colorMapping) {
    return createColorMappingFunction(color, desc.colorMapping);
  }
  return new SolidColorFunction(color || Column.DEFAULT_COLOR);
}
