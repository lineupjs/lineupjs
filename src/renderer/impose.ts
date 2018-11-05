import {IDataRow} from '../model';
import Column from '../model/Column';
import {IImposer} from './interfaces';
import {isMapAbleColumn} from '../model/MappingFunction';

export function colorOf(col: Column, row: IDataRow | null, imposer?: IImposer, valueHint?: number) {
  if (imposer && imposer.color) {
    return imposer.color(row, valueHint);
  }
  if (!row) {
    if (isMapAbleColumn(col)) {
      return col.getColorMapping().apply(valueHint != null ? valueHint : 0);
    }
    return Column.DEFAULT_COLOR;
  }
  return col.getColor(row);
}
