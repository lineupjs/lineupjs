import {interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds, interpolateCool, interpolateCubehelixDefault, interpolateWarm, interpolatePlasma, interpolateMagma, interpolateViridis, interpolateInferno, interpolateYlOrRd, interpolateYlOrBr, interpolateBuGn, interpolateBuPu, interpolateGnBu, interpolateOrRd, interpolatePuBuGn, interpolatePuBu, interpolatePuRd, interpolateRdPu, interpolateYlGnBu, interpolateYlGn, interpolateRainbow, interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdBu, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral} from 'd3-scale-chromatic';
import {equal} from '../internal';
import {scaleLinear} from 'd3-scale';
import {IColorMappingFunction, IMapAbleDesc} from '.';
import {DEFAULT_COLOR} from './interfaces';

export class InterpolatingColorFunction implements IColorMappingFunction {
  constructor(public readonly name: string, public readonly type: 'sequential'|'divergent', public readonly apply: (v: number)=>string) {

  }

  toJSON() {
    return this.name;
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

  toJSON() {
    return this.color;
  }

  clone() {
    return this; // no clone needed since not parameterized
  }

  eq(other: IColorMappingFunction): boolean {
    return other instanceof SolidColorFunction && other.color === this.color;
  }
}

export class QuantizedColorFunction implements IColorMappingFunction {
  constructor(public readonly base: IColorMappingFunction, public readonly steps: number) {

  }

  apply(v: number) {
    return this.base.apply(quantize(v, this.steps));
  }

  toJSON() {
    return {
      type: 'quantized',
      base: this.base.toJSON(),
      steps: this.steps
    };
  }

  clone(): QuantizedColorFunction {
    return this; // no clone needed since not parameterized
  }

  eq(other: IColorMappingFunction): boolean {
    return other instanceof QuantizedColorFunction && other.base.eq(this.base) && other.steps === this.steps;
  }
}

export class CustomColorMappingFunction implements IColorMappingFunction {
  private readonly scale = scaleLinear<string>();

  constructor(public readonly entries: {value: number, color: string}[]) {
    this.scale
      .domain(entries.map((d) => d.value))
      .range(entries.map((d) => d.color))
      .clamp(true);
  }

  apply(v: number) {
    return this.scale(v);
  }

  toJSON() {
    return {
      type: 'custom',
      entries: this.entries
    };
  }

  clone() {
    return new CustomColorMappingFunction(this.entries);
  }

  eq(other: IColorMappingFunction): boolean {
    return other instanceof CustomColorMappingFunction && equal(this.entries, other.entries);
  }
}

/**
 * @internal
 */
export function quantize(v: number, steps: number) {
  const perStep = 1 / steps;
  if (v <= perStep) {
    return 0;
  }
  if (v >= (1 - perStep)) {
    return 1;
  }
  for (let acc = 0; acc < 1; acc += perStep) {
    if (v < acc) {
      return acc - perStep / 2; // center
    }
  }
  return v;
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

export const DEFAULT_COLOR_FUNCTION = asColorFunction(DEFAULT_COLOR);

/**
 * @internal
 */
export const sequentialColors: InterpolatingColorFunction[] = [];

/**
 * @internal
 */
export const divergentColors: InterpolatingColorFunction[] = [];

/**
 * @internal
 */
export const lookupInterpolatingColor = new Map<string, InterpolatingColorFunction>();

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
    interpolateRainbow
  };
  const divergent: { [key: string]: (v: number)=>string } = {
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
    sequentialColors.push(new InterpolatingColorFunction(key, 'sequential', sequential[key]));
  }
  for (const key of Object.keys(divergent)) {
    divergentColors.push(new InterpolatingColorFunction(key, 'divergent', divergent[key]));
  }

  for (const col of sequentialColors) {
    lookupInterpolatingColor.set(col.name, col);
  }
  for (const col of divergentColors) {
    lookupInterpolatingColor.set(col.name, col);
  }
}

/**
 * @internal
 */
export function createColorMappingFunction(dump: any): IColorMappingFunction {
  if (!dump) {
    return DEFAULT_COLOR_FUNCTION;
  }
  if (typeof dump === 'string') {
    const s = lookupInterpolatingColor.get(dump);
    if (s) {
      return s;
    }
    return asColorFunction(dump);
  }
  if (typeof dump === 'function') {
    return new InterpolatingColorFunction('custom', 'sequential', dump);
  }
  if (dump.base && dump.steps) {
    return new QuantizedColorFunction(createColorMappingFunction(dump.base), dump.steps);
  }
  if (Array.isArray(dump)) {
    return new CustomColorMappingFunction(dump);
  }
  return DEFAULT_COLOR_FUNCTION;
}

/**
 * @internal
 */
export function restoreColorMapping2(desc: IMapAbleDesc): IColorMappingFunction {
  if (desc.colorMapping) {
    return createColorMappingFunction(desc.colorMapping);
  }
  return DEFAULT_COLOR_FUNCTION;
}
