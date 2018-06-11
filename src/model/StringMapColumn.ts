import {toolbar} from './annotations';
import Column from './Column';
import {IDataRow} from './interfaces';
import {patternFunction} from './internal';
import MapColumn, {IMapColumnDesc} from './MapColumn';
import {default as StringColumn, EAlignment, IStringDesc} from './StringColumn';

export declare type IStringMapColumnDesc = IStringDesc & IMapColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search', 'editPattern')
export default class StringMapColumn extends MapColumn<string> {
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
