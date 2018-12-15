import {IOrderedGroup} from './Group';
import Column from './Column';
import {ISequence} from '../internal/interable';

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

export declare type IGroupMeta = 'first' | 'last' | 'first last' | 'inner' | 'first top' | null;

export interface IGroupItem {
  readonly dataIndex: number;
  readonly group: Readonly<IOrderedGroup>;
  readonly relativeIndex: number;
  readonly meta: IGroupMeta;
}

export interface IGroupData extends Readonly<IOrderedGroup> {
  readonly meta: IGroupMeta;
}

export function isGroup(item: IGroupData | IGroupItem): item is IGroupData {
  return item && (<IGroupItem>item).group == null; // use .group as separator
}

export enum ECompareValueType {
  BINARY,
  COUNT, // count max to the number of rows
  UINT8,
  UINT16,
  UINT32,
  INT8,
  INT16,
  INT32,
  FLOAT,
  FLOAT_ASC,
  DOUBLE,
  DOUBLE_ASC,
  STRING
}

export interface IValueCacheLookup {
  (col: Column): any | undefined;
}

export interface IGroupValueCacheLookup {
  (col: Column): ISequence<any> | undefined;
}
