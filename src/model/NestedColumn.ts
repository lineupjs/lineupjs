import {IDataRow} from './interfaces';
import MultiLevelCompositeColumn from './MultiLevelCompositeColumn';

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createNestedDesc(label: string = 'Nested') {
  return {type: 'nested', label};
}

/**
 * a nested column is a composite column where the sorting order is determined by the nested ordering of the children
 * i.e., sort by the first child if equal sort by the second child,...
 */
export default class NestedColumn extends MultiLevelCompositeColumn {

  compare(a: IDataRow, b: IDataRow) {
    const c = this.children;
    for (const ci of c) {
      const ciResult = ci.compare(a, b);
      if (ciResult !== 0) {
        return ciResult;
      }
    }
    return 0;
  }

  getLabel(row: IDataRow) {
    return this.children.map((d) => d.getLabel(row)).join(';');
  }

  getValue(row: IDataRow) {
    return this.children.map((d) => d.getValue(row)).join(';');
  }
}
