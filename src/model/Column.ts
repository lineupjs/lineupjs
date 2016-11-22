/**
 * Created by Samuel Gratzl on 06.08.2015.
 */

import {AEventDispatcher} from '../utils';
import Ranking from './Ranking';

/**
 * converts a given id to css compatible one
 * @param id
 * @return {string|void}
 */
export function fixCSS(id) {
  return id.replace(/[\s!#$%&'\(\)\*\+,\.\/:;<=>\?@\[\\\]\^`\{\|}~]/g, '_'); //replace non css stuff to _
}

export interface IFlatColumn {
  col: Column;
  offset: number;
  width: number;
}

export interface IColumnParent {
  remove(col: Column): boolean;
  insert(col: Column, index?: number): Column;
  insertAfter(col: Column, reference: Column): Column;
  findMyRanker(): Ranking;
  fqid: string;

  indexOf(col: Column): number;
  at(index: number): Column;
  fqpath: string;
}

export interface IColumnDesc {
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
   * css class to append to elements of this column
   */
  cssClass?: string;
}

export interface IStatistics {
  min: number;
  max: number;
  mean: number;
  count: number;
  maxBin: number;
  hist: { x: number; dx: number; y: number;}[];
}

export interface ICategoricalStatistics {
  maxBin: number;
  hist: { cat: string; y: number }[];
}

export interface IColumnMetaData {
  label: string;
  description: string;
  color: string;
}

/**
 * a column in LineUp
 */
export default class Column extends AEventDispatcher {
  /**
   * default color that should be used
   * @type {string}
   */
  static DEFAULT_COLOR = '#C1C1C1';
  /**
   * magic variable for showing all columns
   * @type {number}
   */
  static FLAT_ALL_COLUMNS = -1;
  /**
   * width of a compressed column
   * @type {number}
   */
  static COMPRESSED_WIDTH = 16;

  static EVENT_WIDTH_CHANGED = 'widthChanged';
  static EVENT_FILTER_CHANGED = 'filterChanged';
  static EVENT_LABEL_CHANGED = 'labelChanged';
  static EVENT_METADATA_CHANGED = 'metaDataChanged';
  static EVENT_COMPRESS_CHANGED = 'compressChanged';
  static EVENT_ADD_COLUMN = 'addColumn';
  static EVENT_REMOVE_COLUMN = 'removeColumn';
  static EVENT_DIRTY = 'dirty';
  static EVENT_DIRTY_HEADER = 'dirtyHeader';
  static EVENT_DIRTY_VALUES = 'dirtyValues';

  id: string;

  /**
   * width of the column
   * @type {number}
   * @private
   */
  private width: number = 100;

  parent: IColumnParent = null;

  label: string;
  description: string;
  color: string;
  /**
   * alternative to specifying a color is defining a css class that should be used
   */
  cssClass: string;

  /**
   * whether this column is compressed i.e. just shown in a minimal version
   * @type {boolean}
   * @private
   */
  private compressed = false;

  constructor(id: string, public desc: IColumnDesc) {
    super();
    this.id = fixCSS(id);
    this.label = this.desc.label || this.id;
    this.description = this.desc.description || '';
    this.cssClass = (<any>this.desc).cssClass || '';
    this.color = (<any>this.desc).color || (this.cssClass !== '' ? null : Column.DEFAULT_COLOR);
  }

  get headerCssClass() {
    return this.desc.type;
  }

  assignNewId(idGenerator: () => string) {
    this.id = fixCSS(idGenerator());
  }

  init(callback: (desc: IColumnDesc) => Promise<IStatistics>): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * returns the fully qualified id i.e. path the parent
   * @returns {string}
   */
  get fqid() {
    return this.parent ? this.parent.fqid + '_' + this.id : this.id;
  }

  get fqpath() {
    return this.parent ? this.parent.fqpath + '@' + this.parent.indexOf(this) : '';
  }

  /**
   * fires:
   *  * widthChanged
   *  * filterChanged
   *  * labelChanged
   *  * metaDataChanged
   *  * compressChanged
   *  * addColumn, removeColumn ... for composite pattern
   *  * dirty, dirtyHeader, dirtyValues
   * @returns {string[]}
   */
  protected createEventList() {
    return super.createEventList().concat([Column.EVENT_WIDTH_CHANGED, Column.EVENT_FILTER_CHANGED,
      Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_COMPRESS_CHANGED,
      Column.EVENT_ADD_COLUMN, Column.EVENT_REMOVE_COLUMN,
      Column.EVENT_DIRTY, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES]);
  }

  getWidth() {
    return this.width;
  }

  isHidden() {
    return this.width <= 0;
  }

  setCompressed(value: boolean) {
    if (this.compressed === value) {
      return;
    }
    this.fire([Column.EVENT_COMPRESS_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.compressed, this.compressed = value);
  }

  getCompressed() {
    return this.compressed;
  }

  /**
   * visitor pattern for flattening the columns
   * @param r the result array
   * @param offset left offeset
   * @param levelsToGo how many levels down
   * @param padding padding between columns
   * @returns {number} the used width by this column
   */
  flatten(r: IFlatColumn[], offset: number, levelsToGo = 0, padding = 0): number {
    const w = this.compressed ? Column.COMPRESSED_WIDTH : this.getWidth();
    r.push({col: this, offset: offset, width: w});
    return w;
  }

  setWidth(value: number) {
    if (this.width === value) {
      return;
    }
    this.fire([Column.EVENT_WIDTH_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.width, this.width = value);
  }

  setWidthImpl(value: number) {
    this.width = value;
  }

  setMetaData(value: IColumnMetaData) {
    if (value.label === this.label && this.color === value.color && this.description === value.description) {
      return;
    }
    var events = this.color === value.color ?
      [Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY] :
      [Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY];
    this.fire(events, this.getMetaData(), {
      label: this.label = value.label,
      color: this.color = value.color,
      description: this.description = value.description
    });
  }

  getMetaData(): IColumnMetaData {
    return {
      label: this.label,
      color: this.color,
      description: this.description
    };
  }

  /**
   * triggers that the ranking is sorted by this column
   * @param ascending
   * @returns {any}
   */
  sortByMe(ascending = false) {
    var r = this.findMyRanker();
    if (r) {
      return r.sortBy(this, ascending);
    }
    return false;
  }

  /**
   * toggles the sorting order of this column in the ranking
   * @returns {any}
   */
  toggleMySorting() {
    var r = this.findMyRanker();
    if (r) {
      return r.toggleSorting(this);
    }
    return false;
  }

  /**
   * removes the column from the ranking
   * @returns {boolean}
   */
  removeMe() {
    if (this.parent) {
      return this.parent.remove(this);
    }
    return false;
  }

  /**
   * inserts the given column after itself
   * @param col
   * @returns {boolean}
   */
  insertAfterMe(col: Column) {
    if (this.parent) {
      return this.parent.insertAfter(col, this) != null;
    }
    return false;
  }

  /**
   * finds the underlying ranking column
   * @returns {Ranking}
   */
  findMyRanker(): Ranking {
    if (this.parent) {
      return this.parent.findMyRanker();
    }
    return null;
  }

  /**
   * dumps this column to JSON compatible format
   * @param toDescRef
   * @returns {any}
   */
  dump(toDescRef: (desc: any) => any): any {
    var r: any = {
      id: this.id,
      desc: toDescRef(this.desc),
      width: this.width,
      compressed: this.compressed
    };
    if (this.label !== (this.desc.label || this.id)) {
      r.label = this.label;
    }
    if (this.color !== ((<any>this.desc).color || Column.DEFAULT_COLOR) && this.color) {
      r.color = this.color;
    }
    return r;
  }

  /**
   * restore the column content from a dump
   * @param dump
   * @param factory
   */
  restore(dump: any, factory: (dump: any) => Column) {
    this.width = dump.width || this.width;
    this.label = dump.label || this.label;
    this.color = dump.color || this.color;
    this.compressed = dump.compressed === true;
  }

  /**
   * return the label of a given row for the current column
   * @param row
   * @return {string}
   */
  getLabel(row: any): string {
    return '' + this.getValue(row);
  }

  /**
   * return the value of a given row for the current column
   * @param row
   * @return
   */
  getValue(row: any): any {
    return ''; //no value
  }

  /**
   * compare function used to determine the order according to the values of the current column
   * @param a
   * @param b
   * @return {number}
   */
  compare(a: any, b: any) {
    return 0; //can't compare
  }

  /**
   * flag whether any filter is applied
   * @return {boolean}
   */
  isFiltered() {
    return false;
  }

  /**
   * predicate whether the current row should be included
   * @param row
   * @return {boolean}
   */
  filter(row: any) {
    return row !== null;
  }
}
