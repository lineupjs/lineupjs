import {Category, toolbar} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IDataRow} from './interfaces';
import {patternFunction} from './internal';
import {FIRST_IS_MISSING} from './missing';
import ValueColumn, {IValueColumnDesc, dataLoaded} from './ValueColumn';
import {IEventListener} from '../internal/AEventDispatcher';

export enum EAlignment {
  left = 'left',
  center = 'center',
  right = 'right'
}

export interface IStringDesc {
  /**
   * column alignment: left, center, right
   * @default left
   */
  alignment?: EAlignment;

  /**
   * escape html tags
   */
  escape?: boolean;

  /**
   * replacement pattern, use use <code>${value}</code> for the current value, <code>${escapedValue}</code> for an url safe value and <code>${item}</code> for the whole item
   */
  pattern?: string;

  /**
   * optional list of pattern templates
   */
  patternTemplates?: string[];
}


export declare type IStringColumnDesc = IStringDesc & IValueColumnDesc<string>;


/**
 * emitted when the pattern property changes
 * @asMemberOf StringColumn
 * @event
 */
export declare function patternChanged(previous: string, current: string): void;

/**
 * emitted when the filter property changes
 * @asMemberOf StringColumn
 * @event
 */
export declare function filterChanged(previous: string | RegExp | null, current: string | RegExp | null): void;


/**
 * a string column with optional alignment
 */
@toolbar('search', 'filterString', 'editPattern')
@Category('string')
export default class StringColumn extends ValueColumn<string> {
  static readonly EVENT_PATTERN_CHANGED = 'patternChanged';
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';

  //magic key for filtering missing ones
  static readonly FILTER_MISSING = '__FILTER_MISSING';
  private currentFilter: string | RegExp | null = null;

  readonly alignment: EAlignment;
  readonly escape: boolean;
  private pattern: string;
  private patternFunction: Function | null = null;
  readonly patternTemplates: string[];

  constructor(id: string, desc: Readonly<IStringColumnDesc>) {
    super(id, desc);
    this.setDefaultWidth(200); //by default 200
    this.alignment = <any>desc.alignment || EAlignment.left;
    this.escape = desc.escape !== false;
    this.pattern = desc.pattern || '';
    this.patternTemplates = desc.patternTemplates || [];

    if (this.pattern) {
      this.setDefaultRenderer('link');
      this.setDefaultGroupRenderer('link');
    }
  }


  setPattern(pattern: string) {
    if (pattern === this.pattern) {
      return;
    }
    this.patternFunction = null; // reset cache
    this.fire([StringColumn.EVENT_PATTERN_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.pattern, this.pattern = pattern);
  }

  getPattern() {
    return this.pattern;
  }

  protected createEventList() {
    return super.createEventList().concat([StringColumn.EVENT_PATTERN_CHANGED, StringColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof StringColumn.EVENT_PATTERN_CHANGED, listener: typeof patternChanged | null): this;
  on(type: typeof StringColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(<any>type, listener);
  }

  getValue(row: IDataRow) {
    const v: any = super.getValue(row);
    if (!this.pattern) {
      return v == null ? '' : String(v);
    }
    if (!this.patternFunction) {
      this.patternFunction = patternFunction(this.pattern, 'item');
    }
    return this.patternFunction.call(this, v, row.v);
  }

  getLabel(row: IDataRow) {
    return this.getValue(row) || '';
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    if (this.currentFilter instanceof RegExp) {
      r.filter = `REGEX:${(<RegExp>this.currentFilter).source}`;
    } else {
      r.filter = this.currentFilter;
    }
    if (this.pattern !== (<any>this.desc).pattern) {
      r.pattern = this.pattern;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.filter && dump.filter.slice(0, 6) === 'REGEX:') {
      this.currentFilter = new RegExp(dump.filter.slice(6));
    } else {
      this.currentFilter = dump.filter || null;
    }
    if (dump.pattern) {
      this.pattern = dump.pattern;
    }
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: IDataRow) {
    if (!this.isFiltered()) {
      return true;
    }
    const r = this.getLabel(row);
    const filter = this.currentFilter;

    if (filter === StringColumn.FILTER_MISSING) { //filter empty
      return r != null && r.trim() !== '';
    }
    if (typeof filter === 'string' && filter.length > 0) {
      return r !== '' && r.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
    }
    if (filter instanceof RegExp) {
      return r !== '' && filter.test(r);
    }
    return true;
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: string | RegExp | null) {
    if (filter === '') {
      filter = null;
    }
    if (this.currentFilter === filter) {
      return;
    }
    this.fire([StringColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  compare(a: IDataRow, b: IDataRow) {
    const aValue = this.getValue(a);
    const bValue = this.getValue(b);
    if (aValue === '') {
      return bValue === '' ? 0 : FIRST_IS_MISSING; //same = 0
    }
    if (bValue === '') {
      return -FIRST_IS_MISSING;
    }
    return aValue.toLowerCase().localeCompare(bValue.toLowerCase());
  }
}

