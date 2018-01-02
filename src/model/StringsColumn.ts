/**
 * Created by sam on 04.11.2016.
 */

import {toolbar} from './annotations';
import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import Column from './Column';
import {IDataRow} from './interfaces';
import {default as StringColumn, IStringDesc} from './StringColumn';

export declare type IStringsColumnDesc = IStringDesc & IArrayColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search', 'editPattern')
export default class StringsColumn extends ArrayColumn<string> {
  private _alignment: 'left' | 'right' | 'center' = 'left';
  private _escape: boolean = true;
  private pattern: string | null = null;
  readonly patternTemplates: string[];

  constructor(id: string, desc: IStringsColumnDesc) {
    super(id, desc);
    this.setWidthImpl(200); //by default 200
    this._alignment = <any>desc.alignment || 'left';
    this._escape = desc.escape !== false;
    this.pattern = desc.pattern || 'null';
    this.patternTemplates = desc.patternTemplates || [];
  }

  //readonly
  get alignment() {
    return this._alignment;
  }

  get escape() {
    return this._escape;
  }

  setPattern(pattern: string) {
    StringColumn.prototype.setPattern.call(this, pattern);
  }

  getPattern() {
    return this.pattern || '';
  }

  getValue(row: IDataRow) {
    return super.getValue(row).map((v) => StringColumn.prototype.replacePattern.call(this, v));
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    /* tslint:disable */
    if (this.pattern != (<any>this.desc).pattern) {
      r.pattern = this.pattern;
    }
    /* tslint:enable */
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    if (dump.pattern) {
      this.pattern = dump.pattern;
    }
    super.restore(dump, factory);
  }
}
