/**
 * Created by sam on 04.11.2016.
 */

import {toolbar} from './annotations';
import {IDataRow} from './interfaces';
import MapColumn, {IMapColumnDesc} from './MapColumn';
import {IStringDesc} from './StringColumn';

export declare type IStringMapColumnDesc = IStringDesc & IMapColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search')
export default class StringMapColumn extends MapColumn<string> {
  private _escape: boolean = true;

  constructor(id: string, desc: IStringMapColumnDesc) {
    super(id, desc);
    this.setWidthImpl(200); //by default 200
    this._escape = desc.escape !== false;
    this.setDefaultRenderer('map');
  }

  get escape() {
    return this._escape;
  }

  getValue(row: IDataRow) {
    return super.getValue(row).map(({key, value}) => ({key, value: String(value)}));
  }
}
