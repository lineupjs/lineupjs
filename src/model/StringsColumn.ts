/**
 * Created by sam on 04.11.2016.
 */

import {toolbar} from './annotations';
import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import Column from './Column';
import {IDataRow} from './interfaces';
import {default as StringColumn, EAlignment, IStringDesc} from './StringColumn';

export declare type IStringsColumnDesc = IStringDesc & IArrayColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search', 'editPattern')
export default class StringsColumn extends ArrayColumn<string> {
  readonly alignment: EAlignment;
  readonly escape: boolean;
  private pattern: string;
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
    StringColumn.prototype.setPattern.call(this, pattern);
  }

  getPattern() {
    return this.pattern;
  }

  protected createEventList() {
    return super.createEventList().concat([StringColumn.EVENT_PATTERN_CHANGED]);
  }

  getValues(row: IDataRow) {
    return super.getValues(row).map((v) => StringColumn.prototype.replacePattern.call(this, v));
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
