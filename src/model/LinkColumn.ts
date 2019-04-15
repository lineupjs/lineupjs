import {Category, toolbar, dialogAddons} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import {IDataRow, IGroup, IValueColumnDesc} from './interfaces';
import {patternFunction} from './internal';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {IEventListener, ISequence} from '../internal';
import {IStringDesc, EAlignment} from './StringColumn';
import StringColumn from './StringColumn';

export interface ILinkDesc extends IStringDesc {
  /**
   * replacement pattern, use use <code>${value}</code> for the current value, <code>${escapedValue}</code> for an url safe value and <code>${item}</code> for the whole item
   */
  pattern?: string;

  /**
   * optional list of pattern templates
   */
  patternTemplates?: string[];
}

export interface ILink {
  alt: string;
  href: string;
}

export declare type ILinkColumnDesc = ILinkDesc & IValueColumnDesc<string | ILink>;

/**
 * emitted when the filter property changes
 * @asMemberOf LinkColumn
 * @event
 */
export declare function filterChanged_LC(previous: string | RegExp | null, current: string | RegExp | null): void;


/**
 * emitted when the grouping property changes
 * @asMemberOf LinkColumn
 * @event
 */
export declare function groupingChanged_LC(previous: (RegExp | string)[][], current: (RegExp | string)[][]): void;

/**
 * emitted when the pattern property changes
 * @asMemberOf LinkColumn
 * @event
 */
export declare function patternChanged_LC(previous: string, current: string): void;

/**
 * a string column with optional alignment
 */
@toolbar('search', 'groupBy', 'filterString', 'editPattern')
@dialogAddons('group', 'groupString')
@Category('string')
export default class LinkColumn extends ValueColumn<string | ILink> {
  static readonly EVENT_FILTER_CHANGED = StringColumn.EVENT_FILTER_CHANGED;
  static readonly EVENT_GROUPING_CHANGED = StringColumn.EVENT_GROUPING_CHANGED;
  static readonly EVENT_PATTERN_CHANGED = 'patternChanged';

  private pattern: string;
  private patternFunction: Function | null = null;
  readonly patternTemplates: string[];

  private currentFilter: string | RegExp | null = null;
  private currentGroupCriteria: (RegExp | string)[] = [];

  readonly alignment: EAlignment;
  readonly escape: boolean;

  constructor(id: string, desc: Readonly<ILinkColumnDesc>) {
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
    this.fire([LinkColumn.EVENT_PATTERN_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY_CACHES, Column.EVENT_DIRTY], this.pattern, this.pattern = pattern);
  }

  getPattern() {
    return this.pattern;
  }

  protected createEventList() {
    return super.createEventList().concat([LinkColumn.EVENT_PATTERN_CHANGED, LinkColumn.EVENT_GROUPING_CHANGED, LinkColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof LinkColumn.EVENT_PATTERN_CHANGED, listener: typeof patternChanged_LC | null): this;
  on(type: typeof LinkColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_LC | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  on(type: typeof LinkColumn.EVENT_GROUPING_CHANGED, listener: typeof groupingChanged_LC | null): this;
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
    return super.on(<any>type, listener);
  }

  getValue(row: IDataRow) {
    const l = this.getLink(row);
    return l == null ? null : l.href;
  }

  getLink(row: IDataRow): ILink | null {
    const v: string | null | ILink = super.getValue(row);
    return this.transformValue(v, row);
  }

  private transformValue(v: any, row: IDataRow) {
    if (v == null || v === '') {
      return null;
    }
    if (typeof v === 'string') {
      if (!this.pattern) {
        return {
          alt: v,
          href: v
        };
      }
      if (!this.patternFunction) {
        this.patternFunction = patternFunction(this.pattern, 'item');
      }
      return {
        alt: v,
        href: this.patternFunction.call(this, v, row.v)
      };
    }
    return v;
  }

  getLabel(row: IDataRow) {
    const l = this.getLink(row);
    return l == null ? '' : l.alt;
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = StringColumn.prototype.dump.call(this, toDescRef);
    if (this.pattern !== (<any>this.desc).pattern) {
      r.pattern = this.pattern;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    StringColumn.prototype.restore.call(this, dump, factory);
    if (dump.pattern) {
      this.pattern = dump.pattern;
    }
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: IDataRow) {
    return StringColumn.prototype.filter.call(this, row);
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: string | RegExp | null) {
    return StringColumn.prototype.setFilter.call(this, filter);
  }

  clearFilter() {
    return StringColumn.prototype.clearFilter.call(this);
  }

  getGroupCriteria() {
    return this.currentGroupCriteria.slice();
  }

  setGroupCriteria(value: (string | RegExp)[]) {
    return StringColumn.prototype.setGroupCriteria.call(this, value);
  }

  toCompareValue(a: IDataRow) {
    return StringColumn.prototype.toCompareValue.call(this, a);
  }

  toCompareValueType() {
    return StringColumn.prototype.toCompareValueType.call(this);
  }

  toCompareGroupValue(rows: ISequence<IDataRow>, group: IGroup) {
    return StringColumn.prototype.toCompareGroupValue.call(this, rows, group);
  }

  toCompareGroupValueType() {
    return StringColumn.prototype.toCompareGroupValueType.call(this);
  }

  group(row: IDataRow): IGroup {
    return StringColumn.prototype.group.call(this, row);
  }
}

