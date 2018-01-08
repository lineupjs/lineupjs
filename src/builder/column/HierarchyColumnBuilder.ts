import {IHierarchyColumnDesc, IPartialCategoryNode} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class HierarchyColumnBuilder extends ColumnBuilder<IHierarchyColumnDesc> {

  constructor(column: string) {
    super('hierarchy', column);
  }

  hierarchy(hierarchy: IPartialCategoryNode, hierarchySeparator?: string) {
    this.desc.hierarchy = hierarchy;
    if (hierarchySeparator) {
      this.desc.hierarchySeparator = hierarchySeparator;
    }
    return this;
  }
}

export function buildHierarchicalColumn(column: string, hierarchy?: IPartialCategoryNode) {
  const r = new HierarchyColumnBuilder(column);
  if (hierarchy) {
    r.hierarchy(hierarchy);
  }
  return r;
}
