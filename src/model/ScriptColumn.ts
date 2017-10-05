/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import CompositeNumberColumn, {ICompositeNumberDesc} from './CompositeNumberColumn';
import {isNumberColumn} from './NumberColumn';

const DEFAULT_SCRIPT = 'max(values)';

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'script') {
  return {type: 'script', label, script: DEFAULT_SCRIPT};
}


function wrapWithContext(code: string) {
  let clean = code.trim();
  if (!clean.startsWith('return')) {
    clean = `return (${clean});`;
  }
  return `
  const max = function(arr) { return Math.max.apply(Math, arr); };
  const min = function(arr) { return Math.min.apply(Math, arr); };
  const extent = function(arr) { return [min(arr), max(arr)]; };
  const clamp = function(v, minValue, maxValue) { return v < minValue ? minValue : (v > maxValue ? maxValue : v); };
  const normalize = function(v, minMax, max) {
    if (Array.isArray(minMax)) {
      minMax = minMax[0];
      max = minMax[1];
    }
    return (v - minMax) / (max - minMax);
  };
  const denormalize = function(v, minMax, max) {
    if (Array.isArray(minMax)) {
      minMax = minMax[0];
      max = minMax[1];
    }
    return v * (max - minMax) + minMax;
  };
  const linear = function(v, source, target) {
    target = target || [0, 1];
    return denormalize(normalize(v, source), target);
  };
  const v = (function custom() {
    ${clean}
  })();

  return typeof v === 'number' ? v : NaN`;
}

export interface IScriptDesc extends ICompositeNumberDesc {
  /**
   * the function to use, it has two parameters: children (current children) and values (their row values)
   * @default 'return Math.max.apply(Math,values)'
   */
  script?: string;
}

export declare type IScriptColumnDesc = IScriptDesc & ICompositeNumberDesc;


export default class ScriptColumn extends CompositeNumberColumn {
  static readonly EVENT_SCRIPT_CHANGED = 'scriptChanged';
  static readonly DEFAULT_SCRIPT = DEFAULT_SCRIPT;

  private script = ScriptColumn.DEFAULT_SCRIPT;
  private f: Function | null = null;

  constructor(id: string, desc: IScriptColumnDesc) {
    super(id, desc);
    this.script = desc.script || this.script;
  }

  protected createEventList() {
    return super.createEventList().concat([ScriptColumn.EVENT_SCRIPT_CHANGED]);
  }

  setScript(script: string) {
    if (this.script === script) {
      return;
    }
    this.f = null;
    this.fire([ScriptColumn.EVENT_SCRIPT_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.script, this.script = script);
  }

  getScript() {
    return this.script;
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.script = this.script;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    this.script = dump.script || this.script;
    super.restore(dump, factory);
  }

  protected compute(row: any, index: number) {
    if (this.f == null) {
      this.f = new Function('children', 'values', 'raws', 'col', 'row', 'index', wrapWithContext(this.script));
    }
    const children = this._children;
    const values = this._children.map((d) => d.getValue(row, index));
    const raws = <number[]>this._children.map((d) => isNumberColumn(d) ? d.getRawNumber(row, index) : null);
    const col = new ColumnContext(children.map((c, i) => new ColumnWrapper(c, values[i], raws[i])));
    return this.f.call(this, children, values, raws, col, row, index);
  }

  /**
   * describe the column if it is a sorting criteria
   * @param toId helper to convert a description to an id
   * @return {string} json compatible
   */
  toSortingDesc(toId: (desc: any) => string): any {
    return {
      code: this.script,
      operands: this._children.map((c) => c.toSortingDesc(toId))
    };
  }
}

class ColumnWrapper {
  constructor(private readonly c: Column, public readonly v: any, public readonly raw: number) {

  }

  get type() {
    return this.c.desc.type;
  }

  get name() {
    return this.c.getMetaData().label;
  }

  get id() {
    return this.c.id;
  }
}

class ColumnContext {
  private readonly lookup = new Map<string, ColumnWrapper>();

  constructor(private readonly children: ColumnWrapper[]) {
    children.forEach((c) => {
      this.lookup.set(`ID@${c.id}`, c);
      this.lookup.set(`NAME@${c.name}`, c);
    });
  }

  byName(name: string) {
    return this.lookup.get(`NAME@${name}`);
  }

  byID(id: string) {
    return this.lookup.get(`ID@${id}`);
  }

  byIndex(index: number) {
    return this.children[index];
  }

  get length() {
    return this.children.length;
  }
}
