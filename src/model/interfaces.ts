import type Column from './Column';
import type Ranking from './Ranking';
import type CompositeColumn from './CompositeColumn';
import type { IColorMappingFunction, IMappingFunction } from './INumberColumn';
import type { ICategoricalColorMappingFunction, ICategory } from './ICategoricalColumn';
import type { IScriptMappingFunctionType } from './MappingFunction';

export interface IColumnConstructor {
  new (id: string, desc: Readonly<IColumnDesc> & any, factory: ITypeFactory): Column;
}

export interface IStyleColumn {
  /**
   * column description
   */
  description: string;

  /**
   * column summary line (subtitle)
   */
  summary: string;
  /**
   * whether to render the description as HTML (unsafe)
   * @default false
   */
  summaryAsHTML?: boolean;

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
   * whether to render the label as HTML (unsafe)
   * @default false
   */
  labelAsHTML?: boolean;

  /**
   * the column type
   */
  type: string;
}

export interface IValueColumnDesc<T> extends IColumnDesc {
  /**
   * is the data lazy loaded and not yet available
   * @default false
   */
  lazyLoaded?: boolean;

  /**
   * value accessor of this column
   * @param row the current row
   * @param desc the description of this column
   */
  accessor?(row: IDataRow, desc: Readonly<IValueColumnDesc<T>>): T;
}

export interface IFlatColumn {
  readonly col: Column;
  readonly offset: number;
  readonly width: number;
}

export interface IColumnParent {
  remove(col: Column): boolean;

  insert(col: Column, index?: number): Column | null;

  insertBefore(col: Column, reference: Column): Column | null;

  insertAfter(col: Column, reference: Column): Column | null;

  move(col: Column, index?: number): Column | null;

  moveBefore(col: Column, reference: Column): Column | null;
  moveAfter(col: Column, reference: Column): Column | null;

  findMyRanker(): Ranking | null;

  readonly fqid: string;

  indexOf(col: Column): number;

  at(index: number): Column;

  readonly fqpath: string;
}

export interface IColumnMetaData {
  label: string;
  summary: string;
  description: string;
}

export declare type ICompareValue = string | number | null;

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

export declare type IndicesArray = (ReadonlyArray<number> | UIntTypedArray) & ArrayLike<number>;

export interface IOrderedGroup extends IGroup {
  order: IndicesArray;
}

export const defaultGroup: IGroup = {
  name: 'Default',
  color: 'gray',
};

export const othersGroup: IGroup = {
  name: 'Others',
  color: 'gray',
};

export interface IGroupParent extends IGroup {
  subGroups: (Readonly<IGroupParent> | Readonly<IGroup>)[];
}

export interface IGroupItem {
  readonly dataIndex: number;
  readonly group: Readonly<IOrderedGroup>;
  readonly relativeIndex: number;
}

export declare type IGroupData = Readonly<IOrderedGroup>;

export function isGroup(item: IGroupData | IGroupItem): item is IGroupData {
  return item && (item as IGroupItem).group == null; // use .group as separator
}

export declare type UIntTypedArray = Uint8Array | Uint16Array | Uint32Array;

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
  STRING,
}

export interface ITypedDump {
  readonly type: string;
  [key: string]: any;
}

export interface IColumnDump {
  id: string;
  width?: number;
  desc: any;
  label?: string;
  summary?: string;
  renderer?: string;
  /**
   * @deprecated
   */
  rendererType?: string;
  groupRenderer?: string;
  summaryRenderer?: string;

  // type specific
  [key: string]: any;
}

export interface IRankingDump {
  /**
   * columsn of this ranking
   */
  columns?: IColumnDump[];

  /**
   * sort criteria
   */
  sortCriteria?: { asc: boolean; sortBy: string }[];

  /**
   * group sort criteria
   */
  groupSortCriteria?: { asc: boolean; sortBy: string }[];

  /**
   * uids of group columns
   */
  groupColumns?: string[];

  /**
   * compatibility
   * @deprecated
   */
  sortColumn?: { sortBy: string; asc: boolean };
}

export interface ITypeFactory {
  (dump: IColumnDump): Column;

  colorMappingFunction(dump?: ITypedDump | string | ((v: number) => string)): IColorMappingFunction;
  mappingFunction(dump?: ITypedDump | IScriptMappingFunctionType): IMappingFunction;
  categoricalColorMappingFunction(
    dump: ITypedDump | undefined,
    categories: ICategory[]
  ): ICategoricalColorMappingFunction;
}

export interface IMultiLevelColumn extends CompositeColumn {
  getCollapsed(): boolean;

  setCollapsed(value: boolean): void;

  /**
   * whether to show nested summaries or not
   */
  isShowNestedSummaries(): boolean;
}

export function isMultiLevelColumn(col: Column): col is IMultiLevelColumn {
  return typeof (col as IMultiLevelColumn).getCollapsed === 'function';
}

export interface ISortCriteria {
  readonly col: Column;
  readonly asc: boolean;
}
