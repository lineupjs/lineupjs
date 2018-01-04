import Column from './Column';
import CompositeColumn, {isMultiLevelColumn} from './CompositeColumn';
import CompositeNumberColumn from './CompositeNumberColumn';
import {isCategoricalColumn} from './ICategoricalColumn';
import {isBoxPlotColumn, isNumberColumn} from './INumberColumn';
import StringColumn from './StringColumn';

export function findTypeLike<T>(col: Column, lookup: { [key: string]: T }): T | undefined {
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
  if (isNumberColumn(col)) {
    aliases.push('numberLike');
  }
  if (isCategoricalColumn(col)) {
    aliases.push('categoricalLike');
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
