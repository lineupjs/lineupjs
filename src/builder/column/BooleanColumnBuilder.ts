import {IBooleanColumnDesc} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class BooleanColumnBuilder extends ColumnBuilder<IBooleanColumnDesc> {

  constructor(column: string) {
    super('boolean', column);
  }

  trueMarker(marker: string) {
    this.desc.trueMarker = marker;
    return this;
  }

  falseMarker(marker: string) {
    this.desc.falseMarker = marker;
    return this;
  }
}

/**
 * builds a boolean column builder
 * @param {string} column column which contains the associated data
 * @returns {BooleanColumnBuilder}
 */
export function buildBooleanColumn(column: string) {
  return new BooleanColumnBuilder(column);
}
