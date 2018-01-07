import {IDataRow, isCategoricalColumn} from '../model';
import Column from '../model/Column';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import ImpositionCompositeColumn from '../model/ImpositionCompositeColumn';
import {IImposer} from './interfaces';

/** @internal */
export function colorOf(col: Column, row: IDataRow | null, imposer?: IImposer) {
  if (imposer && imposer.color) {
    return imposer.color(row);
  }
  if (!row) {
    return col.color;
  }
  if (isCategoricalColumn(col)) {
    const c = col.getCategory(row);
    return c ? c.color : col.color;
  }
  if (col instanceof ImpositionCompositeColumn || col instanceof CompositeNumberColumn) {
    return col.getColor(row);
  }
  return col.color;
}
