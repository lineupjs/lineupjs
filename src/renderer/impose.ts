import {IDataRow, isCategoricalColumn} from '../model';
import Column from '../model/Column';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import ImpositionCompositeColumn from '../model/ImpositionCompositeColumn';
import {IImposer} from './interfaces';


export function colorOf(col: Column, row: IDataRow | null, imposer?: IImposer) {
  if (imposer && imposer.color) {
    return imposer.color(row);
  }
  if (row && (col instanceof CompositeNumberColumn || isCategoricalColumn(col) || col instanceof ImpositionCompositeColumn)) {
    return col.getColor(row);
  }
  return col.color;
}
