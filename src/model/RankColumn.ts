import {Category, SupportType, toolbar} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IEventListener} from '../internal/AEventDispatcher';
import {IDataRow, IColumnDesc} from './interfaces';


/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createRankDesc(label: string = 'Rank') {
  return {type: 'rank', label};
}

/**
 * emitted when the filter property changes
 * @asMemberOf StringColumn
 * @event
 */
export declare function filterChanged(previous: string | RegExp | null, current: string | RegExp | null): void;
/**
 * a rank column
 */
@SupportType()
@toolbar('filterRank')
@Category('support')
export default class RankColumn extends Column {
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';


  private currentFilter = -1;

  constructor(id: string, desc: IColumnDesc) {
    super(id, desc);
    this.setDefaultWidth(50);
  }

  getLabel(row: IDataRow) {
    return String(this.getValue(row));
  }

  getRaw(row: IDataRow) {
    const ranking = this.findMyRanker();
    if (!ranking) {
      return -1;
    }
    const groups = ranking.getGroups();
    let offset = 0;
    for (const group of groups) {
      const rank = group.index2pos[row.i];
      if (typeof rank === 'number' && !isNaN(rank)) {
        return rank + 1 + offset; // starting with 1
      }
      offset += group.order.length;
    }
    return -1;
  }

  getValue(row: IDataRow) {
    const r = this.getRaw(row);
    return r === -1 ? null : r;
  }

  get frozen() {
    return this.desc.frozen !== false;
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    if (this.currentFilter > 0) {
      r.filter = this.currentFilter;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.filter) {
      this.currentFilter = dump.filter;
    }
  }

  filterRank(_row: IDataRow, relativeRank: number) {
    if (this.currentFilter === -1) {
      return true;
    }
    return relativeRank < this.currentFilter;
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: number | null) {
    if (filter === null) {
      filter = -1;
    }
    if (this.currentFilter === filter) {
      return;
    }
    this.fire([RankColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.currentFilter, this.currentFilter = filter);
  }

  protected createEventList() {
    return super.createEventList().concat([RankColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof RankColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(<any>type, listener);
  }


}
