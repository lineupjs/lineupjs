export interface IColumnDesc {
  /**
   * label of the column
   */
  label: string;
  /**
   * the column type
   */
  type: string;

  /**
   * column description
   */
  description?: string;

  /**
   * color of this column
   */
  color?: string;

  /**
   * frozen column
   * @default isSupportType
   */
  frozen?: boolean;

  /**
   * default renderer to use
   */
  renderer?: string;

  /**
   * default group renderer to use
   */
  groupRenderer?: string;

  summaryRenderer?: string;

  width?: number;

  visible?: boolean;
}


/**
 * a data row for rendering
 */
export interface IDataRow {
  /**
   * the value
   */
  readonly v: any;
  /**
   * the underlying data index
   */
  readonly i: number;
}


export interface IGroup {
  name: string;
  color: string;
  parent?: Readonly<IGroupParent> | null;
}

export interface IGroupParent extends IGroup {
  subGroups: (Readonly<IGroupParent> | Readonly<IGroup>)[];
}

export interface IGroupItem extends IDataRow {
  readonly group: IGroup;
  readonly relativeIndex: number;
  readonly meta?: 'first' | 'last' | 'first last';
}

export interface IGroupData extends Readonly<IGroup> {
  readonly rows: IDataRow[];
}

export function isGroup(item: IGroupData | IGroupItem): item is IGroupData {
  return item && (<IGroupData>item).name !== undefined; // use .name as separator
}
