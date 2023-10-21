import NumberColumn from './NumberColumn';
import type { IEventListener } from '../internal';
import { SortByDefault, toolbar } from './annotations';
import Column, {
  dirty,
  dirtyCaches,
  dirtyHeader,
  dirtyValues,
  groupRendererChanged,
  labelChanged,
  metaDataChanged,
  rendererTypeChanged,
  summaryRendererChanged,
  visibilityChanged,
  widthChanged,
} from './Column';
import type { addColumn, moveColumn, removeColumn } from './CompositeColumn';
import type CompositeColumn from './CompositeColumn';
import CompositeNumberColumn, { type ICompositeNumberDesc } from './CompositeNumberColumn';
import type { IColumnDump, IDataRow, ITypeFactory } from './interfaces';
import { noNumberFilter, restoreNumberFilter } from './internalNumber';
import {
  type IColorMappingFunction,
  type IMapAbleColumn,
  type IMapAbleDesc,
  type IMappingFunction,
  type INumberFilter,
  isNumberColumn,
} from './INumberColumn';
import { restoreMapping } from './MappingFunction';
import { integrateDefaults } from './internal';
import { restoreTypedValue, restoreValue } from './diff';

const DEFAULT_SCRIPT = `let s = 0;
col.forEach((c) => s += c.v);
return s / col.length`;

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createScriptDesc(label = 'script') {
  return { type: 'script', label, script: DEFAULT_SCRIPT };
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

interface IColumnWrapper {
  v: any;
  raw: number | null;
  type: string;
  name: string;
  id: string;
}

/**
 * wrapper class for simpler column accessing
 */
class ColumnWrapper implements IColumnWrapper {
  constructor(
    private readonly c: Column,
    public readonly v: any,
    public readonly raw: number | null
  ) {}

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

class LazyColumnWrapper implements IColumnWrapper {
  constructor(
    private readonly c: Column,
    private readonly row: IDataRow
  ) {}

  get type() {
    return this.c.desc.type;
  }

  get name() {
    return this.c.getMetaData().label;
  }

  get id() {
    return this.c.id;
  }

  get v() {
    return this.c.getValue(this.row);
  }

  get raw() {
    return isNumberColumn(this.c) ? this.c.getRawNumber(this.row) : null;
  }
}

/**
 * helper context for accessing columns within a scripted columns
 */
class ColumnContext {
  private readonly lookup = new Map<string, IColumnWrapper>();
  private _all: ColumnContext | null = null;

  constructor(
    private readonly children: IColumnWrapper[],
    private readonly allFactory?: () => ColumnContext
  ) {
    children.forEach((c) => {
      this.lookup.set(`ID@${c.id}`, c);
      this.lookup.set(`ID@${c.id.toLowerCase()}`, c);
      this.lookup.set(`NAME@${c.name}`, c);
      this.lookup.set(`NAME@${c.name.toLowerCase()}`, c);
    });
  }

  /**
   * get a column by name
   * @param {string} name
   * @return {IColumnWrapper}
   */
  byName(name: string) {
    return this.lookup.get(`NAME@${name}`);
  }

  /**
   * get a column by id
   * @param {string} id
   * @return {IColumnWrapper}
   */
  byID(id: string) {
    return this.lookup.get(`ID@${id}`);
  }

  /**
   * get a column by index
   * @param {number} index
   * @return {IColumnWrapper}
   */
  byIndex(index: number) {
    return this.children[index];
  }

  forEach(callback: (c: IColumnWrapper, index: number) => void) {
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

export interface IScriptDesc extends ICompositeNumberDesc, IMapAbleDesc {
  /**
   * the function to use, it has two parameters: children (current children) and values (their row values)
   * @default 'return Math.max.apply(Math,values)'
   */
  script?: string;
}

export declare type IScriptColumnDesc = IScriptDesc;

/**
 * emitted when the script property changes
 * @asMemberOf ScriptColumn
 * @event
 */
export declare function scriptChanged(previous: string, current: string): void;

/**
 * emitted when the mapping property changes
 * @asMemberOf ScriptColumn
 * @event
 */
export declare function mappingChanged(previous: IMappingFunction, current: IMappingFunction): void;
/**
 * emitted when the color mapping property changes
 * @asMemberOf ScriptColumn
 * @event
 */
export declare function colorMappingChanged(previous: IColorMappingFunction, current: IColorMappingFunction): void;

/**
 * emitted when the filter property changes
 * @asMemberOf ScriptColumn
 * @event
 */
export declare function filterChanged(previous: INumberFilter | null, current: INumberFilter | null): void;

/**
 * column combiner which uses a custom JavaScript function to combined the values
 * The script itself can be any valid JavaScript code. It will be embedded in a function.
 * Therefore the last statement has to return a value.
 *
 * In case of a single line statement the code piece statement `return` will be automatically prefixed.
 *
 * The function signature is: <br>` any, index: number, children: Column[], values: any[], raws: (number|null)[]) => number`
 *  <dl>
 *    <dt>param: ```
 *    <dd>the row in the dataset to compute the value for</dd>
 *    <dt>param: ``
 *    <dd>the index of the row</dd>
 *    <dt>param: `code></dt>
 *    <dd>the list of LineUp columns that are part of this ScriptColumn</dd>
 *    <dt>param: `values`</dt>
 *    <dd>the computed value of each column (see `children`) for the current row</dd>
 *    <dt>param: `raws`</dt>
 *    <dd>similar to `values`. Numeric columns return by default the normalized value, this array gives access to the original "raw" values before mapping is applied</dd>
 *    <dt>returns:</dt>
 *    <dd>the computed number <strong>in the range [0, 1] or NaN</strong></dd>
 *  </dl>
 *
 * In addition to the standard JavaScript functions and objects (Math, ...) a couple of utility functions are available: </p>
 * <dl>
 *    <dt>`max(arr: number[]) => number`</dt>
 *    <dd>computes the maximum of the given array of numbers</dd>
 *    <dt>`min(arr: number[]) => number`</dt>
 *    <dd>computes the minimum of the given array of numbers</dd>
 *    <dt>`extent(arr: number[]) => [number, number]`</dt>
 *    <dd>computes both minimum and maximum and returning an array with the first element the minimum and the second the maximum</dd>
 *    <dt>`clamp(v: number, min: number, max: number) => number`</dt>
 *    <dd>ensures that the given value is within the given min/max value</dd>
 *    <dt>`normalize(v: number, min: number, max: number) => number`</dt>
 *    <dd>normalizes the given value `(v - min) / (max - min)`</dd>
 *    <dt>`denormalize(v: number, min: number, max: number) => number`</dt>
 *    <dd>inverts a normalized value `v * (max - min) + min`</dd>
 *    <dt>`linear(v: number, input: [number, number], output: [number, number]) => number`</dt>
 *    <dd>performs a linear mapping from input domain to output domain both given as an array of [min, max] values. `denormalize(normalize(v, input[0], input[1]), output[0], output[1])`</dd>
 *  </dl>
 */
@toolbar('script', 'filterNumber', 'colorMapped', 'editMapping')
@SortByDefault('descending')
export default class ScriptColumn extends CompositeNumberColumn implements IMapAbleColumn {
  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;
  static readonly EVENT_COLOR_MAPPING_CHANGED = NumberColumn.EVENT_COLOR_MAPPING_CHANGED;
  static readonly EVENT_SCRIPT_CHANGED = 'scriptChanged';
  static readonly DEFAULT_SCRIPT = DEFAULT_SCRIPT;

  private script = ScriptColumn.DEFAULT_SCRIPT;
  private f: (children, values: number[], raws: any[], col: ColumnContext, row: any, index: number) => number | null =
    null;
  private mapping: IMappingFunction;
  private original: IMappingFunction;
  private colorMapping: IColorMappingFunction;
  /**
   * currently active filter
   * @type {{min: number, max: number}}
   * @private
   */
  private currentFilter: INumberFilter = noNumberFilter();

  constructor(id: string, desc: Readonly<IScriptColumnDesc>, factory: ITypeFactory) {
    super(
      id,
      integrateDefaults(desc, {
        renderer: 'number',
        groupRenderer: 'boxplot',
        summaryRenderer: 'histogram',
      })
    );
    this.script = desc.script || this.script;
    this.mapping = restoreMapping(desc, factory);
    this.original = this.mapping.clone();
    this.colorMapping = factory.colorMappingFunction(desc.colorMapping || desc.color);
  }

  protected override createEventList() {
    return super
      .createEventList()
      .concat([
        ScriptColumn.EVENT_SCRIPT_CHANGED,
        ScriptColumn.EVENT_COLOR_MAPPING_CHANGED,
        ScriptColumn.EVENT_MAPPING_CHANGED,
      ]);
  }

  override on(type: typeof ScriptColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChanged | null): this;
  override on(type: typeof ScriptColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChanged | null): this;
  override on(type: typeof ScriptColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  override on(type: typeof ScriptColumn.EVENT_SCRIPT_CHANGED, listener: typeof scriptChanged | null): this;
  override on(type: typeof CompositeColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  override on(type: typeof CompositeColumn.EVENT_ADD_COLUMN, listener: typeof addColumn | null): this;
  override on(type: typeof CompositeColumn.EVENT_MOVE_COLUMN, listener: typeof moveColumn | null): this;
  override on(type: typeof CompositeColumn.EVENT_REMOVE_COLUMN, listener: typeof removeColumn | null): this;
  override on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  override on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  override on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  override on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  override on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  override on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  override on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  override on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  override on(
    type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED,
    listener: typeof groupRendererChanged | null
  ): this;
  override on(
    type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED,
    listener: typeof summaryRendererChanged | null
  ): this;
  override on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  override on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  override on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  setScript(script: string) {
    if (this.script === script) {
      return;
    }
    this.f = null;
    this.fire(
      [ScriptColumn.EVENT_SCRIPT_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY],
      this.script,
      (this.script = script)
    );
  }

  getScript() {
    return this.script;
  }

  override toJSON() {
    const r = super.toJSON();
    r.script = this.script;
    r.filter = this.getFilter();
    r.map = this.mapping.toJSON();
    r.colorMapping = this.colorMapping.toJSON();
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);

    this.script = restoreValue(dump.script, this.script, changed, [
      ScriptColumn.EVENT_SCRIPT_CHANGED,
      Column.EVENT_DIRTY_VALUES,
      Column.EVENT_DIRTY_CACHES,
      Column.EVENT_DIRTY,
    ]);
    if (dump.map || dump.domain) {
      const v = restoreMapping(dump as unknown as IMapAbleDesc, factory);
      const current = this.mapping.toJSON();
      const target = restoreValue(v.toJSON(), current, changed, [
        ScriptColumn.EVENT_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ]);
      if (target !== current) {
        this.mapping = v;
      }
    }
    this.colorMapping = restoreTypedValue(
      dump.colorMapping,
      this.colorMapping,
      factory.colorMappingFunction.bind(factory),
      changed,
      [
        ScriptColumn.EVENT_COLOR_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ]
    );
    this.currentFilter = restoreValue(
      dump.filter ? restoreNumberFilter(dump.filter) : undefined,
      this.currentFilter,
      changed,
      [ScriptColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY]
    );
    return changed;
  }

  protected override compute(row: IDataRow) {
    if (this.f == null) {
      // eslint-disable-next-line no-new-func
      this.f = new Function('children', 'values', 'raws', 'col', 'row', 'index', wrapWithContext(this.script)) as any;
    }
    const children = this._children;
    const values = this._children.map((d) => d.getValue(row));
    const raws = this._children.map((d) => (isNumberColumn(d) ? d.getRawNumber(row) : null)) as number[];
    const col = new ColumnContext(
      children.map((c, i) => new ColumnWrapper(c, values[i], raws[i])),
      () => {
        const cols = this.findMyRanker()!.flatColumns; // all except myself
        return new ColumnContext(cols.map((c) => new LazyColumnWrapper(c, row)));
      }
    );
    return this.f.call(this, children, values, raws, col, row.v, row.i);
  }

  override getExportValue(row: IDataRow, format: 'text' | 'json'): any {
    if (format === 'json') {
      return {
        value: this.getRawNumber(row),
        children: this.children.map((d) => d.getExportValue(row, format)),
      };
    }
    return super.getExportValue(row, format);
  }

  getRange() {
    return this.mapping.getRange(this.getNumberFormat());
  }

  getOriginalMapping() {
    return this.original.clone();
  }

  getMapping() {
    return this.mapping.clone();
  }

  setMapping(mapping: IMappingFunction) {
    if (this.mapping.eq(mapping)) {
      return;
    }
    this.fire(
      [
        ScriptColumn.EVENT_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ],
      this.mapping.clone(),
      (this.mapping = mapping)
    );
  }

  override getColor(row: IDataRow) {
    return NumberColumn.prototype.getColor.call(this, row);
  }

  getColorMapping() {
    return this.colorMapping.clone();
  }

  setColorMapping(mapping: IColorMappingFunction) {
    if (this.colorMapping.eq(mapping)) {
      return;
    }
    this.fire(
      [
        ScriptColumn.EVENT_COLOR_MAPPING_CHANGED,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_CACHES,
        Column.EVENT_DIRTY,
      ],
      this.colorMapping.clone(),
      (this.colorMapping = mapping)
    );
  }

  override isFiltered() {
    return NumberColumn.prototype.isFiltered.call(this);
  }

  getFilter(): INumberFilter {
    return NumberColumn.prototype.getFilter.call(this);
  }

  setFilter(value: INumberFilter | null) {
    NumberColumn.prototype.setFilter.call(this, value);
  }

  override filter(row: IDataRow) {
    return NumberColumn.prototype.filter.call(this, row);
  }

  override clearFilter() {
    return NumberColumn.prototype.clearFilter.call(this);
  }
}
