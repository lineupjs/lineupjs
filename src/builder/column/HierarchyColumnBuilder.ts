import {IHierarchyColumnDesc, IPartialCategoryNode} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class HierarchyColumnBuilder extends ColumnBuilder<IHierarchyColumnDesc> {

  constructor(column: string) {
    super('hierarchy', column);
  }

  /**
   * specify the underlying hierarchy of this column
   * @param {IPartialCategoryNode} hierarchy
   * @param {string} hierarchySeparator specify the character to separate levels (default dot)
   */
  hierarchy(hierarchy: IPartialCategoryNode, hierarchySeparator?: string) {
    this.desc.hierarchy = hierarchy;
    if (hierarchySeparator) {
      this.desc.hierarchySeparator = hierarchySeparator;
    }
    return this;
  }

  build(data: any[]): IHierarchyColumnDesc {
    console.assert(Boolean(this.desc.hierarchy));
    return super.build(data);
  }
}

/**
 * build a hierarchical column builder
 * @param {string} column column which contains the associated data
 * @param {IPartialCategoryNode} hierarchy
 * @returns {HierarchyColumnBuilder}
 */
export function buildHierarchicalColumn(column: string, hierarchy?: IPartialCategoryNode) {
  const r = new HierarchyColumnBuilder(column);
  if (hierarchy) {
    r.hierarchy(hierarchy);
  }
  return r;
}
