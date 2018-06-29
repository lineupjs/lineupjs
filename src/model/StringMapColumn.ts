import {toolbar} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {IDataRow} from './interfaces';
import {patternFunction} from './internal';
import MapColumn, {IMapColumnDesc} from './MapColumn';
import {default as StringColumn, EAlignment, IStringDesc, patternChanged} from './StringColumn';
import {IEventListener} from '../internal/AEventDispatcher';

export declare type IStringMapColumnDesc = IStringDesc & IMapColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search', 'editPattern')
export default class StringMapColumn extends MapColumn<string> {
  static readonly EVENT_PATTERN_CHANGED = StringColumn.EVENT_PATTERN_CHANGED;

  readonly alignment: EAlignment;
  readonly escape: boolean;
  private pattern: string;
  private patternFunction: Function | null = null;
  readonly patternTemplates: string[];

  constructor(id: string, desc: Readonly<IStringMapColumnDesc>) {
    super(id, desc);
    this.setDefaultWidth(200); //by default 200
    this.alignment = <any>desc.alignment || EAlignment.left;
    this.escape = desc.escape !== false;
    this.pattern = desc.pattern || '';
    this.patternTemplates = desc.patternTemplates || [];
    this.setDefaultRenderer('map');
  }

  setPattern(pattern: string) {
    StringColumn.prototype.setPattern.call(this, pattern);
  }

  getPattern() {
    return this.pattern;
  }

  protected createEventList() {
    return super.createEventList().concat([StringColumn.EVENT_PATTERN_CHANGED]);
  }

  on(type: typeof StringColumn.EVENT_PATTERN_CHANGED, listener: typeof patternChanged | null): this;
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
    return super.getValue(row).map(({key, value}) => ({
      key,
      value: this.replacePattern(value, key, row)
    }));
  }

  private replacePattern(s: any, key: string, row: IDataRow) {
    if (!this.pattern) {
      return s == null ? '' : String(s);
    }
    if (!this.patternFunction) {
      this.patternFunction = patternFunction(this.pattern, 'item', 'key');
    }
    return this.patternFunction.call(this, s, row.v, key);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    if (this.pattern !== (<any>this.desc).pattern) {
      r.pattern = this.pattern;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    if (dump.pattern) {
      this.pattern = dump.pattern;
    }
    super.restore(dump, factory);
  }
}
