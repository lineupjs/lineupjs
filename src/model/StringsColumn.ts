import {toolbar} from './annotations';
import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import {IDataRow} from './interfaces';
import {EAlignment, IStringDesc} from './StringColumn';
import {isMissingValue} from './missing';

export declare type IStringsColumnDesc = IStringDesc & IArrayColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('search')
export default class StringsColumn extends ArrayColumn<string> {
  readonly alignment: EAlignment;
  readonly escape: boolean;

  constructor(id: string, desc: Readonly<IStringsColumnDesc>) {
    super(id, desc);
    this.setDefaultWidth(200); //by default 200
    this.alignment = <any>desc.alignment || EAlignment.left;
    this.escape = desc.escape !== false;
  }

  getValues(row: IDataRow) {
    return super.getValues(row).map((v) => {
      return isMissingValue(v) ? '' : String(v);
    });
  }
}
