export interface IStyleColumn {
  /**
   * column description
   */
  description: string;

  /**
   * color of this column
   * @deprecated not used anymore
   */
  color: string;

  /**
   * frozen column
   * @default isSupportType
   */
  frozen: boolean;

  /**
   * whether the column can be removed or not
   * @default false
   */
  fixed: boolean;

  /**
   * default renderer to use
   */
  renderer: string;

  /**
   * default group renderer to use
   */
  groupRenderer: string;

  /**
   * default summary renderer to use
   */
  summaryRenderer: string;

  /**
   * initial width of the column
   * @default 100 or 200 for strings
   */
  width: number;

  /**
   * is this column visible by default
   * @default true
   */
  visible: boolean;
}


export interface IColumnDesc extends Partial<IStyleColumn> {
  /**
   * label of the column
   */
  label: string;
  /**
   * the column type
   */
  type: string;
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

export declare type IGroupMeta = 'first' | 'last' | 'first last' | null;

export interface IGroupItem extends IDataRow {
  readonly group: Readonly<IGroup>;
  readonly relativeIndex: number;
  readonly meta: IGroupMeta;
}

export interface IGroupData extends Readonly<IGroup> {
  readonly rows: IDataRow[];
}

/** @internal */
export function isGroup(item: IGroupData | IGroupItem): item is IGroupData {
  return item && (<IGroupData>item).name !== undefined; // use .name as separator
}

/** @internal */
export function toGroupMeta(index: number, total: number): IGroupMeta {
  if (total === 1) {
    return 'first last';
  }
  if (index === 0) {
    return 'first';
  }
  if (index === total -1) {
    return 'last';
  }
  return null;
}
