import {Column, isMapAbleColumn, IDataRow, DEFAULT_COLOR} from '../model';
import {IImposer} from './interfaces';

export function colorOf(col: Column, row: IDataRow | null, imposer?: IImposer, valueHint?: number) {
  if (imposer && imposer.color) {
    return imposer.color(row, valueHint);
  }
  if (!row) {
    if (isMapAbleColumn(col)) {
      return col.getColorMapping().apply(valueHint != null ? valueHint : 0);
    }
    return DEFAULT_COLOR;
  }
  return col.getColor(row);
}
