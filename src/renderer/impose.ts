import {IDataRow} from '../model';
import Column from '../model/Column';
import {IImposer} from './interfaces';
import {isMapAbleColumn} from '../model/MappingFunction';

/** @internal */
export function colorOf(col: Column, row: IDataRow | null, imposer?: IImposer, valueHint?: number) {
  if (imposer && imposer.color) {
    return imposer.color(row, valueHint);
  }
  if (!row) {
    if (isMapAbleColumn(col) && valueHint != null) {
      return col.getColorMapping().apply(valueHint);
    }
    return col.color;
  }
  return col.getColor(row);
}
