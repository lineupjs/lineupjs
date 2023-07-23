import { toolbar } from './annotations';
import ArrayColumn, { type IArrayColumnDesc } from './ArrayColumn';
import type { IDataRow } from './interfaces';
import { EAlignment, type IStringDesc } from './StringColumn';
import { isMissingValue } from './missing';
import { integrateDefaults } from './internal';

export declare type IStringsColumnDesc = IStringDesc & IArrayColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('rename', 'search')
export default class StringsColumn extends ArrayColumn<string> {
  readonly alignment: EAlignment;
  readonly escape: boolean;

  constructor(id: string, desc: Readonly<IStringsColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        width: 200,
      })
    );
    this.alignment = desc.alignment ?? EAlignment.left;
    this.escape = desc.escape !== false;
  }

  override getValues(row: IDataRow) {
    return super.getValues(row).map((v) => {
      return isMissingValue(v) ? '' : String(v);
    });
  }
}
