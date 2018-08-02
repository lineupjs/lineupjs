import {IDataRow} from '../model';
import Column from '../model/Column';
import {IImposer} from './interfaces';

/** @internal */
export function colorOf(col: Column, row: IDataRow | null, imposer?: IImposer) {
  if (imposer && imposer.color) {
    return imposer.color(row);
  }
  if (!row) {
    return col.color;
  }
  return col.getColor(row);
}
