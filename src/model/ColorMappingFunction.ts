import {interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds, interpolateCool, interpolateCubehelixDefault, interpolateWarm, interpolatePlasma, interpolateMagma, interpolateViridis, interpolateInferno, interpolateYlOrRd, interpolateYlOrBr, interpolateBuGn, interpolateBuPu, interpolateGnBu, interpolateOrRd, interpolatePuBuGn, interpolatePuBu, interpolatePuRd, interpolateRdPu, interpolateYlGnBu, interpolateYlGn, interpolateRainbow, interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdBu, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral} from 'd3-scale-chromatic';
import {equal} from '../internal';
import {scaleLinear} from 'd3-scale';
import {IColorMappingFunction} from '.';
import {DEFAULT_COLOR, ITypedDump, ITypeFactory} from './interfaces';
import {IColorMappingFunctionConstructor} from './INumberColumn';

export class SequentialColorFunction implements IColorMappingFunction {
  public static readonly FUNCTIONS: {[key: string]: (v: number) => string} = {
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

  public readonly apply: (v: number) => string;

  constructor(public readonly name: string) {
    this.apply = SequentialColorFunction.FUNCTIONS[name] || interpolateBlues;
  }

  toJSON() {
    return this.name;
  }

  clone() {
    return this; // no clone needed since not parameterized
  }

  eq(other: IColorMappingFunction): boolean {
    return other instanceof SequentialColorFunction && other.name === this.name;
  }
}

export class DivergentColorFunction implements IColorMappingFunction {
  public static readonly FUNCTIONS: {[key: string]: (v: number) => string} = {
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

  public readonly apply: (v: number) => string;

  constructor(public readonly name: string) {
    this.apply = DivergentColorFunction.FUNCTIONS[name] || interpolateBlues;
  }

  toJSON() {
    return this.name;
  }

  clone() {
    return this; // no clone needed since not parameterized
  }

  eq(other: IColorMappingFunction): boolean {
    return other instanceof DivergentColorFunction && other.name === this.name;
  }
}


export class UnknownColorFunction implements IColorMappingFunction {
  constructor(public readonly apply: (v: number) => string) {
  }

  toJSON() {
    return this.apply.toString();
  }

  clone() {
    return this; // no clone needed since not parameterized
  }

  eq(other: IColorMappingFunction): boolean {
    return other instanceof UnknownColorFunction && other.apply === this.apply;
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
  public readonly base: IColorMappingFunction;
  public readonly steps: number;

  constructor(dump: ITypedDump, factory: ITypeFactory);
  constructor(base: IColorMappingFunction, steps: number)
  constructor(base: IColorMappingFunction | ITypedDump, steps: number | ITypeFactory) {
    if (typeof (<any>base).apply === 'function') {
      this.base = <IColorMappingFunction>base;
      this.steps = steps == null ? 5 : <number>steps;
    } else {
      const dump = <ITypedDump>base;
      this.base = (<ITypeFactory>steps).colorMappingFunction(dump.base);
      this.steps = dump.steps;
    }
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
    return new QuantizedColorFunction(this.base.clone(), this.steps);
  }

  eq(other: IColorMappingFunction): boolean {
    return other instanceof QuantizedColorFunction && other.base.eq(this.base) && other.steps === this.steps;
  }
}

export class CustomColorMappingFunction implements IColorMappingFunction {
  private readonly scale = scaleLinear<string>();
  public readonly entries: {value: number, color: string}[];

  constructor(dump: ITypedDump);
  constructor(entries: {value: number, color: string}[]);
  constructor(entries: ITypedDump | {value: number, color: string}[]) {
    this.entries = Array.isArray(entries) ? entries : entries.entries;
    this.scale
      .domain(this.entries.map((d) => d.value))
      .range(this.entries.map((d) => d.color))
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
    return new CustomColorMappingFunction(this.entries.slice());
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

export function colorMappingFunctions() {
  const types: any = {
    [DEFAULT_COLOR]: SolidColorFunction,
    quantized: QuantizedColorFunction,
    custom: CustomColorMappingFunction
  };
  for (const key of Object.keys(SequentialColorFunction.FUNCTIONS)) {
    types[key] = SequentialColorFunction;
  }
  for (const key of Object.keys(DivergentColorFunction.FUNCTIONS)) {
    types[key] = DivergentColorFunction;
  }
  return types;
}

export const DEFAULT_COLOR_FUNCTION = new SolidColorFunction(DEFAULT_COLOR);


/**
 * @internal
 */
export function createColorMappingFunction(types: {[type: string]: IColorMappingFunctionConstructor}, factory: ITypeFactory) {
  return (dump: ITypedDump | string | ((v: number) => string)): IColorMappingFunction => {
    if (!dump) {
      return DEFAULT_COLOR_FUNCTION;
    }
    if (typeof dump === 'function') {
      return new UnknownColorFunction(dump);
    }
    const typeName = typeof dump === 'string' ? dump : dump.type;
    const type = types[typeName];
    if (type) {
      return new type(dump, factory);
    }
    if (Array.isArray(dump)) {
      return new CustomColorMappingFunction(dump);
    }
    return new SolidColorFunction(dump.toString());
  };
}
