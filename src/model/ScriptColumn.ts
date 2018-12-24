import {toolbar} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import CompositeColumn, {addColumn, filterChanged, moveColumn, removeColumn} from './CompositeColumn';
import CompositeNumberColumn, {ICompositeNumberDesc} from './CompositeNumberColumn';
import {IDataRow} from './interfaces';
import {isNumberColumn} from './INumberColumn';
import {IEventListener} from '../internal';

const DEFAULT_SCRIPT = `let s = 0;
col.forEach((c) => s += c.v);
return s / col.length`;

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createScriptDesc(label: string = 'script') {
  return {type: 'script', label, script: DEFAULT_SCRIPT};
}


function wrapWithContext(code: string) {
  let clean = code.trim();
  if (!clean.includes('return')) {
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


/**
 * wrapper class for simpler column accessing
 */
class ColumnWrapper {
  constructor(private readonly c: Column, public readonly v: any, public readonly raw: number | null) {

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

/**
 * helper context for accessing columns within a scripted columns
 */
class ColumnContext {
  private readonly lookup = new Map<string, ColumnWrapper>();
  private _all: ColumnContext | null = null;

  constructor(private readonly children: ColumnWrapper[], private readonly allFactory?: () => ColumnContext) {
    children.forEach((c) => {
      this.lookup.set(`ID@${c.id}`, c);
      this.lookup.set(`NAME@${c.name}`, c);
    });
  }

  /**
   * get a column by name
   * @param {string} name
   * @return {ColumnWrapper}
   */
  byName(name: string) {
    return this.lookup.get(`NAME@${name}`);
  }

  /**
   * get a column by id
   * @param {string} id
   * @return {ColumnWrapper}
   */
  byID(id: string) {
    return this.lookup.get(`ID@${id}`);
  }

  /**
   * get a column by index
   * @param {number} index
   * @return {ColumnWrapper}
   */
  byIndex(index: number) {
    return this.children[index];
  }

  forEach(callback: ((c: ColumnWrapper, index: number) => void)) {
    return this.children.forEach(callback);
  }

  /**
   * number of columns
   * @return {number}
   */
  get length() {
    return this.children.length;
  }

  /**
   * get the all context, i.e one with all columns of this ranking
   * @return {ColumnContext}
   */
  get all() {
    if (this._all == null) {
      this._all = this.allFactory ? this.allFactory() : null;
    }
    return this._all!;
  }
}


export interface IScriptDesc extends ICompositeNumberDesc {
  /**
   * the function to use, it has two parameters: children (current children) and values (their row values)
   * @default 'return Math.max.apply(Math,values)'
   */
  script?: string;
}

export declare type IScriptColumnDesc = IScriptDesc & ICompositeNumberDesc;

/**
 * emitted when the script property changes
 * @asMemberOf ScriptColumn
 * @event
 */
declare function scriptChanged(previous: string, current: string): void;


/**
 * column combiner which uses a custom JavaScript function to combined the values
 * The script iteslf can be any valid JavaScript code. It will be embedded in a function.
 * Therefore the last statement has to return a value.
 *
 * In case of a single line statement the code piece statement <code>return</code> will be automatically prefixed.
 *
 * The function signature is: <br><code>(row: any, index: number, children: Column[], values: any[], raws: (number|null)[]) => number</code>
 *  <dl>
 *    <dt>param: <code>row</code></dt>
 *    <dd>the row in the dataset to compute the value for</dd>
 *    <dt>param: <code>index</code></dt>
 *    <dd>the index of the row</dd>
 *    <dt>param: <code>children</code></dt>
 *    <dd>the list of LineUp columns that are part of this ScriptColumn</dd>
 *    <dt>param: <code>values</code></dt>
 *    <dd>the computed value of each column (see <code>children</code>) for the current row</dd>
 *    <dt>param: <code>raws</code></dt>
 *    <dd>similar to <code>values</code>. Numeric columns return by default the normalized value, this array gives access to the original "raw" values before mapping is applied</dd>
 *    <dt>returns:</dt>
 *    <dd>the computed number <strong>in the range [0, 1] or NaN</strong></dd>
 *  </dl>
 *
 * In addition to the standard JavaScript functions and objects (Math, ...) a couple of utility functions are available: </p>
 * <dl>
 *    <dt><code>max(arr: number[]) => number</code></dt>
 *    <dd>computes the maximum of the given array of numbers</dd>
 *    <dt><code>min(arr: number[]) => number</code></dt>
 *    <dd>computes the minimum of the given array of numbers</dd>
 *    <dt><code>extent(arr: number[]) => [number, number]</code></dt>
 *    <dd>computes both minimum and maximum and returning an array with the first element the minimum and the second the maximum</dd>
 *    <dt><code>clamp(v: number, min: number, max: number) => number</code></dt>
 *    <dd>ensures that the given value is within the given min/max value</dd>
 *    <dt><code>normalize(v: number, min: number, max: number) => number</code></dt>
 *    <dd>normalizes the given value <code>(v - min) / (max - min)</code></dd>
 *    <dt><code>denormalize(v: number, min: number, max: number) => number</code></dt>
 *    <dd>inverts a normalized value <code>v * (max - min) + min</code></dd>
 *    <dt><code>linear(v: number, input: [number, number], output: [number, number]) => number</code></dt>
 *    <dd>performs a linear mapping from input domain to output domain both given as an array of [min, max] values. <code>denormalize(normalize(v, input[0], input[1]), output[0], output[1])</code></dd>
 *  </dl>
 */
@toolbar('script')
export default class ScriptColumn extends CompositeNumberColumn {
  static readonly EVENT_SCRIPT_CHANGED = 'scriptChanged';
  static readonly DEFAULT_SCRIPT = DEFAULT_SCRIPT;

  private script = ScriptColumn.DEFAULT_SCRIPT;
  private f: Function | null = null;

  constructor(id: string, desc: Readonly<IScriptColumnDesc>) {
    super(id, desc);
    this.script = desc.script || this.script;

    this.setDefaultRenderer('number');
    this.setDefaultGroupRenderer('number');
    this.setDefaultSummaryRenderer('number');
  }

  protected createEventList() {
    return super.createEventList().concat([ScriptColumn.EVENT_SCRIPT_CHANGED]);
  }

  on(type: typeof ScriptColumn.EVENT_SCRIPT_CHANGED, listener: typeof scriptChanged | null): this;
  on(type: typeof CompositeColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof CompositeColumn.EVENT_ADD_COLUMN, listener: typeof addColumn | null): this;
  on(type: typeof CompositeColumn.EVENT_MOVE_COLUMN, listener: typeof moveColumn | null): this;
  on(type: typeof CompositeColumn.EVENT_REMOVE_COLUMN, listener: typeof removeColumn | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  setScript(script: string) {
    if (this.script === script) {
      return;
    }
    this.f = null;
    this.fire([ScriptColumn.EVENT_SCRIPT_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], this.script, this.script = script);
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

  protected compute(row: IDataRow) {
    if (this.f == null) {
      this.f = new Function('children', 'values', 'raws', 'col', 'row', 'index', wrapWithContext(this.script));
    }
    const children = this._children;
    const values = this._children.map((d) => d.getValue(row));
    const raws = <number[]>this._children.map((d) => isNumberColumn(d) ? d.getRawNumber(row) : null);
    const col = new ColumnContext(children.map((c, i) => new ColumnWrapper(c, values[i], raws[i])), () => {
      const cols = this.findMyRanker()!.flatColumns;
      return new ColumnContext(cols.map((c) => new ColumnWrapper(c, c.getValue(row), isNumberColumn(c) ? c.getRawNumber(row) : null)));
    });
    return this.f.call(this, children, values, raws, col, row.v, row.i);
  }

  getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    if (format === 'json') {
      return {
        value: this.getRawNumber(row),
        children: this.children.map((d) => d.getExportValue(row, format))
      };
    }
    return super.getExportValue(row, format);
  }
}
