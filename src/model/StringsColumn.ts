import {toolbar} from './annotations';
import ArrayColumn, {IArrayColumnDesc, spliceChanged} from './ArrayColumn';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {IDataRow} from './interfaces';
import {patternFunction} from './internal';
import StringColumn, {EAlignment, IStringDesc, patternChanged} from './StringColumn';
import {IEventListener} from '../internal/AEventDispatcher';

export declare type IStringsColumnDesc = IStringDesc & IArrayColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search', 'editPattern')
export default class StringsColumn extends ArrayColumn<string> {
  static readonly EVENT_PATTERN_CHANGED = StringColumn.EVENT_PATTERN_CHANGED;

  readonly alignment: EAlignment;
  readonly escape: boolean;
  private pattern: string;
  private patternFunction: Function | null = null;
  readonly patternTemplates: string[];

  constructor(id: string, desc: Readonly<IStringsColumnDesc>) {
    super(id, desc);
    this.setDefaultWidth(200); //by default 200
    this.alignment = <any>desc.alignment || EAlignment.left;
    this.escape = desc.escape !== false;
    this.pattern = desc.pattern || '';
    this.patternTemplates = desc.patternTemplates || [];
  }

  setPattern(pattern: string) {
    return StringColumn.prototype.setPattern.call(this, pattern);
  }

  getPattern() {
    return this.pattern;
  }

  protected createEventList() {
    return super.createEventList().concat([StringsColumn.EVENT_PATTERN_CHANGED]);
  }

  on(type: typeof StringColumn.EVENT_PATTERN_CHANGED, listener: typeof patternChanged | null): this;
  on(type: typeof ArrayColumn.EVENT_SPLICE_CHANGED, listener: typeof spliceChanged | null): this;
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

  getValues(row: IDataRow) {
    return super.getValues(row).map((v, i) => {
      if (!this.pattern) {
        return v == null ? '' : String(v);
      }
      if (!this.patternFunction) {
        this.patternFunction = patternFunction(this.pattern, 'item', 'index');
      }
      return this.patternFunction.call(this, v, row.v, i);
    });
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
