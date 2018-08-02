import {interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds, interpolateCool, interpolateCubehelixDefault, interpolateWarm, interpolatePlasma, interpolateMagma, interpolateViridis, interpolateInferno, interpolateYlOrRd, interpolateYlOrBr, interpolateBuGn, interpolateBuPu, interpolateGnBu, interpolateOrRd, interpolatePuBuGn, interpolatePuBu, interpolatePuRd, interpolateRdPu, interpolateYlGnBu, interpolateYlGn, interpolateRainbow, interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdBu, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral} from 'd3-scale-chromatic';
import {IMapAbleDesc} from './MappingFunction';
import Column from './Column';

export declare type IColorMappingType = 'solid'|'sequential'|'divergent'|'custom'|'quantized';

export interface IColorMappingFunction {
  apply(v: number): string;

  dump(): any;

  restore(dump: any): void;

  clone(): IColorMappingFunction;

  eq(other: IColorMappingFunction): boolean;

  type: IColorMappingType;
}

export class D3ColorFunction implements IColorMappingFunction {
  constructor(public readonly name: string, public readonly type: IColorMappingType, public readonly apply: (v: number)=>string) {

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

  get type(): IColorMappingType {
    return 'solid';
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

const cache = new Map<string, SolidColorFunction>();

/**
 * @internal
 */
export function asColorFunction(color: string) {
  if (cache.has(color)) {
    return cache.get(color)!;
  }
  const s = new SolidColorFunction(color);
  cache.set(color, s);
  return s;
}

/**
 * @internal
 */
export const DEFAULT_COLOR_FUNCTION = asColorFunction(Column.DEFAULT_COLOR);

/**
 * @internal
 */
export const sequentialColors: D3ColorFunction[] = [];

/**
 * @internal
 */
export const divergentColors: D3ColorFunction[] = [];
{
  const sequential: { [key: string]: (v: number)=>string } = {
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
    interpolateInferno
  };
  const divergent: { [key: string]: (v: number)=>string } = {
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
  for (const key of Object.keys(sequential)) {
    sequentialColors.push(new D3ColorFunction(key, 'sequential', sequential[key]));
  }
  for (const key of Object.keys(divergent)) {
    divergentColors.push(new D3ColorFunction(key, 'divergent', divergent[key]));
  }
}

/**
 * @internal
 */
export function createColorMappingFunction(color: string | null, dump: any): IColorMappingFunction {
  if (!dump) {
    return color ? asColorFunction(color) : DEFAULT_COLOR_FUNCTION;
  }
  if (typeof dump === 'string') {
    const s = sequentialColors.find((d) => d.name === dump);
    if (s) {
      return s;
    }
    const d = divergentColors.find((d) => d.name === dump);
    if (d) {
      return d;
    }
    return asColorFunction(dump);
  }
  // TODO restore custom stuff
  return DEFAULT_COLOR_FUNCTION;
}

/**
 * @internal
 */
export function restoreColorMapping(color: string | null, desc: IMapAbleDesc): IColorMappingFunction {
  if (desc.colorMapping) {
    return createColorMappingFunction(color, desc.colorMapping);
  }
  return color ? asColorFunction(color) : DEFAULT_COLOR_FUNCTION;
}
