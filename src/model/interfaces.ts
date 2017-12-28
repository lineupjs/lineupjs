/**
 * a data row for rendering
 */
export interface IDataRow {
  /**
   * the value
   */
  v: any;
  /**
   * the underlying data index
   */
  dataIndex: number;
}


export interface IGroup {
  name: string;
  color: string;
  parent?: IGroupParent | null;
}

export interface IGroupParent extends IGroup {
  subGroups: (IGroupParent | IGroup)[];
}

export interface IGroupItem extends IDataRow {
  group: IGroup;
  relativeIndex: number;
  meta?: 'first' | 'last' | 'first last';
}

export interface IGroupData extends IGroup {
  rows: IDataRow[];
}

export function isGroup(item: IGroupData | IGroupItem): item is IGroupData {
  return item && (<IGroupData>item).name !== undefined; // use .name as separator
}
