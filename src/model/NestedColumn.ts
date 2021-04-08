import type { IDataRow, ECompareValueType } from './interfaces';
import MultiLevelCompositeColumn, { IMultiLevelCompositeColumnDesc } from './MultiLevelCompositeColumn';
import { concat } from '../internal';
import { toolbar } from './annotations';

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createNestedDesc(label = 'Nested', showNestedSummaries = true): IMultiLevelCompositeColumnDesc {
  return { type: 'nested', label, showNestedSummaries };
}

/**
 * a nested column is a composite column where the sorting order is determined by the nested ordering of the children
 * i.e., sort by the first child if equal sort by the second child,...
 */
@toolbar('rename', 'clone', 'sort', 'sortBy')
export default class NestedColumn extends MultiLevelCompositeColumn {
  toCompareValue(row: IDataRow) {
    return concat(this.children.map((d) => d.toCompareValue(row)));
  }

  toCompareValueType(): ECompareValueType[] {
    return concat(this.children.map((d) => d.toCompareValueType()));
  }

  getLabel(row: IDataRow) {
    return this.children.map((d) => d.getLabel(row)).join(';');
  }

  getValue(row: IDataRow) {
    return this.children.map((d) => d.getValue(row)).join(';');
  }
}
