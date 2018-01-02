/**
 * Created by sam on 04.11.2016.
 */

import {toolbar} from './annotations';
import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import Column from './Column';
import {IDataRow} from './interfaces';
import {IStringDesc} from './StringColumn';

export declare type IStringsColumnDesc = IStringDesc & IArrayColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search')
export default class StringsColumn extends ArrayColumn<string> {
  private _alignment: 'left' | 'right' | 'center' = 'left';
  private _escape: boolean = true;

  constructor(id: string, desc: IStringsColumnDesc) {
    super(id, desc);
    this.setWidthImpl(200); //by default 200
    this._alignment = <any>desc.alignment || 'left';
    this._escape = desc.escape !== false;
  }

  //readonly
  get alignment() {
    return this._alignment;
  }

  get escape() {
    return this._escape;
  }

  getValue(row: IDataRow) {
    return super.getValue(row).map(String);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.alignment = this.alignment;
    r.escape = this.escape;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    this._alignment = dump.alignment || this._alignment;
    this._escape = dump._escape !== null ? dump._escape : this._escape;
  }
}
