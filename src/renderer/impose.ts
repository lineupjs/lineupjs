import Column from '../model/Column';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import {isCategoricalColumn} from '../model';
import {IDataRow} from '../model/interfaces';
import {IImposer} from './IRenderContext';
import ImpositionCompositeColumn from '../model/ImpositionCompositeColumn';

export {IImposer} from './IRenderContext';

export function colorOf(col: Column, row: IDataRow|null, imposer?: IImposer) {
  if (imposer && imposer.color) {
    return imposer.color(row);
  }
  if (row && (col instanceof CompositeNumberColumn || isCategoricalColumn(col) || col instanceof ImpositionCompositeColumn)) {
    return col.getColor(row);
  }
  return col.color;
}
