/**
 * Created by sam on 04.11.2016.
 */

import {toolbar} from './annotations';
import Column from './Column';
import {IDataRow} from './interfaces';
import MapColumn, {IMapColumnDesc} from './MapColumn';
import {default as StringColumn, IStringDesc} from './StringColumn';

export declare type IStringMapColumnDesc = IStringDesc & IMapColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search', 'editPattern')
export default class StringMapColumn extends MapColumn<string> {
  private _alignment: 'left' | 'right' | 'center' = 'left';
  private _escape: boolean = true;
  private pattern: string | null = null;
  readonly patternTemplates: string[];

  constructor(id: string, desc: IStringMapColumnDesc) {
    super(id, desc);
    this.setWidthImpl(200); //by default 200
    this._alignment = <any>desc.alignment || 'left';
    this._escape = desc.escape !== false;
    this.pattern = desc.pattern || 'null';
    this.patternTemplates = desc.patternTemplates || [];
    this.setDefaultRenderer('map');
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
    return super.getValue(row).map(({key, value}) => ({
      key,
      value: StringColumn.prototype.replacePattern.call(this, value)
    }));
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
