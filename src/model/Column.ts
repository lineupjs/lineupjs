/**
 * Created by Samuel Gratzl on 06.08.2015.
 */

import {AEventDispatcher, similar} from '../utils';
import Ranking, {ISortCriteria} from './Ranking';
import {defaultGroup} from './Group';
import {isMissingValue} from './missing';
import {IGroupData} from '../ui/engine/interfaces';

/**
 * converts a given id to css compatible one
 * @param id
 * @return {string|void}
 */
export function fixCSS(id: string) {
  return id.replace(/[\s!#$%&'()*+,.\/:;<=>?@\[\\\]\^`{|}~]/g, '_'); //replace non css stuff to _
}

export interface IFlatColumn {
  readonly col: Column;
  readonly offset: number;
  readonly width: number;
}

export interface IColumnParent {
  remove(col: Column): boolean;

  insert(col: Column, index?: number): Column | null;

  insertAfter(col: Column, reference: Column): Column | null;

  findMyRanker(): Ranking | null;

  readonly fqid: string;

  indexOf(col: Column): number;

  at(index: number): Column;

  readonly fqpath: string;

}


export interface IColumnDesc {
  /**
   * label of the column
   */
  readonly label: string;
  /**
   * the column type
   */
  readonly type: string;

  /**
   * column description
   */
  readonly description?: string;

  /**
   * color of this column
   */
  readonly color?: string;
  /**
   * css class to append to elements of this column
   */
  readonly cssClass?: string;

  /**
   * default renderer to use
   */
  readonly rendererType?: string;

  /**
   * default group renderer to use
   */
  readonly groupRenderer?: string;
}

export interface IStatistics {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly count: number;
  readonly maxBin: number;
  readonly hist: { x: number; dx: number; y: number; }[];
  readonly missing: number;
}

export interface ICategoricalStatistics {
  readonly maxBin: number;
  readonly hist: { cat: string; y: number }[];
  readonly missing: number;
}

export interface IColumnMetaData {
  readonly label: string;
  readonly description: string;
  readonly color: string | null;
}


export interface IRendererInfo {

  /*
   Name of the current Renderer
   */
  renderer: string;

  groupRenderer: string;
  /*
   * Possible RendererList
   */
  renderers: { type: string, label: string }[];

  groupRenderers: { type: string, label: string }[];
}


/**
 * a column in LineUp
 */
export default class Column extends AEventDispatcher {
  /**
   * default color that should be used
   * @type {string}
   */
  static readonly DEFAULT_COLOR = '#C1C1C1';
  /**
   * magic variable for showing all columns
   * @type {number}
   */
  static readonly FLAT_ALL_COLUMNS = -1;
  /**
   * width of a compressed column
   * @type {number}
   */
  static readonly COMPRESSED_WIDTH = 16;

  static readonly EVENT_WIDTH_CHANGED = 'widthChanged';
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_LABEL_CHANGED = 'labelChanged';
  static readonly EVENT_METADATA_CHANGED = 'metaDataChanged';
  static readonly EVENT_COMPRESS_CHANGED = 'compressChanged';
  static readonly EVENT_ADD_COLUMN = 'addColumn';
  static readonly EVENT_REMOVE_COLUMN = 'removeColumn';
  static readonly EVENT_DIRTY = 'dirty';
  static readonly EVENT_DIRTY_HEADER = 'dirtyHeader';
  static readonly EVENT_DIRTY_VALUES = 'dirtyValues';
  static readonly EVENT_RENDERER_TYPE_CHANGED = 'rendererTypeChanged';
  static readonly EVENT_SORTMETHOD_CHANGED = 'sortMethodChanged';
  static readonly EVENT_GROUPING_CHANGED = 'groupingChanged';

  /**
   * the id of this column
   */
  private uid: string;

  /**
   * width of the column
   * @type {number}
   * @private
   */
  private width: number = 100;

  /**
   * parent column of this column, set when added to a ranking or combined column
   */
  parent: IColumnParent | null = null;

  private metadata: IColumnMetaData;

  /**
   * alternative to specifying a color is defining a css class that should be used
   */
  readonly cssClass: string;

  /**
   * whether this column is compressed i.e. just shown in a minimal version
   * @type {boolean}
   * @private
   */
  private compressed = false;


  private readonly rendererInfo: IRendererInfo;


  constructor(id: string, public readonly desc: IColumnDesc) {
    super();
    this.uid = fixCSS(id);
    this.rendererInfo = {
      renderer: this.desc.rendererType || this.desc.type,
      renderers: [],
      groupRenderer: this.desc.groupRenderer || this.desc.type,
      groupRenderers: []
    };

    this.cssClass = desc.cssClass || '';
    this.metadata = {
      label: desc.label || this.id,
      description: desc.description || '',
      color: desc.color || (this.cssClass !== '' ? null : Column.DEFAULT_COLOR)
    };
  }

  get id() {
    return this.uid;
  }

  assignNewId(idGenerator: () => string) {
    this.uid = fixCSS(idGenerator());
  }

  get label() {
    return this.metadata.label;
  }

  get description() {
    return this.metadata.description;
  }

  get color() {
    return this.metadata.color;
  }

  /**
   * return the css class to use for the header
   * @return {string}
   */
  get headerCssClass() {
    return this.desc.type;
  }

  /**
   * returns the fully qualified id i.e. path the parent
   * @returns {string}
   */
  get fqid() {
    return this.parent ? `${this.parent.fqid}_${this.id}` : this.id;
  }

  get fqpath() {
    return this.parent ? `${this.parent.fqpath}@${this.parent.indexOf(this)}` : '';
  }

  /**
   * list of events
   * fires:
   *  * widthChanged
   *  * filterChanged
   *  * labelChanged
   *  * metaDataChanged
   *  * compressChanged
   *  * addColumn, removeColumn ... for composite pattern
   *  * dirty, dirtyHeader, dirtyValues
   * @returns {string[]} the list of events
   */
  protected createEventList() {
    return super.createEventList().concat([Column.EVENT_WIDTH_CHANGED, Column.EVENT_FILTER_CHANGED,
      Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_COMPRESS_CHANGED,
      Column.EVENT_ADD_COLUMN, Column.EVENT_REMOVE_COLUMN, Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_SORTMETHOD_CHANGED,
      Column.EVENT_DIRTY, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_GROUPING_CHANGED]);
  }

  getWidth() {
    return this.width;
  }

  getActualWidth() {
    return this.compressed ? Column.COMPRESSED_WIDTH : this.getWidth();
  }

  /**
   * a column is hidden if it has no width
   * @return {boolean} whether the column is hidden
   */
  isHidden() {
    return this.width <= 0;
  }

  hide() {
    return this.setWidth(0);
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
   * @param {IFlatColumn} r the result array
   * @param {number} offset left offset
   * @param {number} _levelsToGo how many levels down
   * @param {number} _padding padding between columns
   * @returns {number} the used width by this column
   */
  flatten(r: IFlatColumn[], offset: number, _levelsToGo = 0, _padding = 0): number {
    const w = this.compressed ? Column.COMPRESSED_WIDTH : this.getWidth();
    r.push({col: this, offset, width: w});
    return w;
  }

  setWidth(value: number) {
    if (similar(this.width, value, 0.5)) {
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
    const events = this.color === value.color ?
      [Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY] :
      [Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY];
    const bak = this.getMetaData();
    //copy to avoid reference
    this.metadata = {
      label: value.label,
      color: value.color,
      description: value.description
    };

    this.fire(events, bak, this.getMetaData());
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
   * @param ascending ascending order?
   * @returns {boolean} was successful
   */
  sortByMe(ascending = false) {
    const r = this.findMyRanker();
    if (r) {
      return r.sortBy(this, ascending);
    }
    return false;
  }

  groupByMe() {
    const r = this.findMyRanker();
    if (r) {
      return r.groupBy(this.isGroupedBy() >= 0 ? null : this);
    }
    return false;
  }

  /**
   *
   * @return {number}
   */
  isGroupedBy(): number {
    const r = this.findMyRanker();
    if (!r) {
      return -1;
    }
    return r.getGroupCriteria().indexOf(this);
  }

  /**
   * toggles the sorting order of this column in the ranking
   * @returns {boolean} was successful
   */
  toggleMySorting() {
    const r = this.findMyRanker();
    if (r) {
      return r.toggleSorting(this);
    }
    return false;
  }

  private isSortedByMeImpl(selector: ((r: Ranking) => ISortCriteria[])): { asc: 'asc' | 'desc' | undefined, priority: string | undefined } {
    const ranker = this.findMyRanker();
    if (!ranker) {
      return {asc: undefined, priority: undefined};
    }
    const criterias = selector(ranker);
    const index = criterias.findIndex((c) => c.col === this);
    if (index < 0) {
      return {asc: undefined, priority: undefined};
    }
    return {
      asc: criterias[index].asc ? 'asc' : 'desc',
      priority: index.toString()
    };
  }

  isSortedByMe() {
    return this.isSortedByMeImpl((r) => r.getSortCriterias());
  }

  toggleMyGroupSorting() {
    const r = this.findMyRanker();
    if (r) {
      return r.toggleGroupSorting(this);
    }
    return false;
  }

  isGroupSortedByMe() {
    return this.isSortedByMeImpl((r) => r.getGroupSortCriteria());
  }

  /**
   * removes the column from the ranking
   * @returns {boolean} was successful
   */
  removeMe() {
    if (this.parent) {
      return this.parent.remove(this);
    }
    return false;
  }

  /**
   * inserts the given column after itself
   * @param col the column to insert
   * @returns {boolean} was successful
   */
  insertAfterMe(col: Column) {
    if (this.parent) {
      return this.parent.insertAfter(col, this) != null;
    }
    return false;
  }

  /**
   * finds the underlying ranking column
   * @returns {Ranking|null} my current ranking
   */
  findMyRanker(): Ranking | null {
    if (this.parent) {
      return this.parent.findMyRanker();
    }
    return null;
  }

  /**
   * dumps this column to JSON compatible format
   * @param toDescRef helper mapping function
   * @returns {any} dump of this column
   */
  dump(toDescRef: (desc: any) => any): any {
    const r: any = {
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
    if (this.getRendererType() !== this.desc.type) {
      r.rendererType = this.getRendererType();
    }
    return r;
  }

  /**
   * restore the column content from a dump
   * @param dump column dump
   * @param _factory helper for creating columns
   */
  restore(dump: any, _factory: (dump: any) => Column | null) {
    this.width = dump.width || this.width;
    this.metadata = {
      label: dump.label || this.label,
      color: dump.color || this.color,
      description: this.description
    };
    this.compressed = dump.compressed === true;
    if (dump.rendererType) {
      this.rendererInfo.renderer = dump.rendererType;
    }
    if (dump.groupRenderer) {
      this.rendererInfo.groupRenderer = dump.groupRenderer;
    }
  }

  /**
   * return the label of a given row for the current column
   * @param row the current row
   * @param index its row index
   * @return {string} the label of this column at the specified row
   */
  getLabel(row: any, index: number): string {
    return String(this.getValue(row, index));
  }

  /**
   * return the value of a given row for the current column
   * @param _row the current row
   * @param _index its row index
   * @return the value of this column at the specified row
   */
  getValue(_row: any, _index: number): any {
    return ''; //no value
  }

  isMissing(row: any, index: number) {
    return isMissingValue(this.getValue(row, index));
  }

  /**
   * compare function used to determine the order according to the values of the current column
   * @param _a first element
   * @param _b second element
   * @param _aIndex index of the first element
   * @param _bIndex index of the second element
   * @return {number}
   */
  compare(_a: any, _b: any, _aIndex: number, _bIndex: number) {
    return 0; //can't compare
  }

  /**
   * group the given row into a bin/group
   * @param _row
   * @param _index
   * @return {IGroup}
   */
  group(_row: any, _index: number) {
    return defaultGroup;
  }

  /**
   * compares groups
   * @param {IGroupData} a
   * @param {IGroupData} b
   * @return {number}
   */
  groupCompare(a: IGroupData, b: IGroupData) {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
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
   * @param _index the row index
   * @return {boolean}
   */
  filter(row: any, _index: number) {
    return row !== null;
  }

  /**
   * determines the renderer type that should be used to render this column. By default the same type as the column itself
   * @return {string}
   */
  getRendererType(): string {
    return this.rendererInfo.renderer;
  }

  getGroupRenderer(): string {
    return this.rendererInfo.groupRenderer;
  }

  setRendererType(renderer: string) {
    if (renderer === this.rendererInfo.renderer) {
      // nothing changes
      return;
    }
    this.fire([Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.rendererInfo.renderer, this.rendererInfo.renderer = renderer);
  }

  setGroupRenderer(renderer: string) {
    if (renderer === this.rendererInfo.groupRenderer) {
      // nothing changes
      return;
    }
    this.fire([Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.rendererInfo.groupRenderer, this.rendererInfo.groupRenderer = renderer);
  }

  getRendererList() {
    return this.rendererInfo.renderers;
  }

  getGroupRenderers() {
    return this.rendererInfo.groupRenderers;
  }

  protected setRendererList(renderers: { type: string, label: string }[], groupRenderers: { type: string, label: string }[] = []) {
    this.rendererInfo.renderers = renderers;
    this.rendererInfo.groupRenderers = groupRenderers;
  }


  /**
   * describe the column if it is a sorting criteria
   * @param toId helper to convert a description to an id
   * @return {string} json compatible
   */
  toSortingDesc(toId: (desc: any) => string): any {
    return toId(this.desc);
  }
}
