/**
 * Created by Samuel Gratzl on 04.10.2017.
 */
import Column from './Column';
import {isCategoricalColumn} from './CategoricalColumn';
import {isNumberColumn} from './NumberColumn';
import {isBoxPlotColumn} from './BoxPlotColumn';
import StringColumn from './StringColumn';
import {isMultiLevelColumn} from './CompositeColumn';
import CompositeColumn from './CompositeColumn';
import CompositeNumberColumn from './CompositeNumberColumn';


export function findTypeLike<T>(col: Column, lookup: { [key: string]: T }): T|undefined {
  const type = col.desc.type;
  // direct hit
  if (lookup[type] !== undefined) {
    return lookup[type];
  }
  const aliases = typeAliases(col);
  const valid = aliases.find((a) => lookup[a] !== undefined);
  return valid ? lookup[valid] : undefined;
}

function typeAliases(col: Column) {
  const aliases = ['default'];
  if (isCategoricalColumn(col)) {
    aliases.push('categoricalLike');
  }
  if (isNumberColumn(col)) {
    aliases.push('numberLike');
  }
  if (isBoxPlotColumn(col)) {
    aliases.push('boxplotLike');
  }
  if (col instanceof StringColumn) {
    aliases.push('stringLike');
  }
  if (isMultiLevelColumn(col)) {
    aliases.push('multiLevelLike');
  }
  if (col instanceof CompositeColumn) {
    aliases.push('compositeLike');
  }
  if (col instanceof CompositeNumberColumn) {
    aliases.push('compositeNumberLike');
  }
  return aliases.reverse(); // more specific first
}
