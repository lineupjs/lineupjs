/**
 * Created by sam on 04.11.2016.
 */

import MultiLevelCompositeColumn from './MultiLevelCompositeColumn';

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'Nested') {
  return {type: 'nested', label: label};
}

/**
 * a nested column is a composite column where the sorting order is determined by the nested ordering of the children
 * i.e., sort by the first child if equal sort by the second child,...
 */
export default class NestedColumn extends MultiLevelCompositeColumn {

  compare(a: any, b: any) {
    const c = this.children;
    for (let ci of c) {
      let ci_result = ci.compare(a, b);
      if (ci_result !== 0) {
        return ci_result;
      }
    }
    return 0;
  }

  getLabel(row: any) {
    return this.children.map((d) => d.getLabel(row)).join(';');
  }

  getValue(row: any) {
    return this.children.map((d) => d.getValue(row)).join(';');
  }
}
