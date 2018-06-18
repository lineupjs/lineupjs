import {Category, SupportType, toolbar, dialogAddons} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IGroupData} from './interfaces';
import {FIRST_IS_NAN, missingGroup} from './missing';
import {IEventListener} from '../internal/AEventDispatcher';

export function createGroupDesc(label = 'Group Name') {
  return {type: 'group', label};
}

export enum EGroupSortMethod {
  name = 'name',
  count ='count'
}

/**
 * emitted when the sort method property changes
 * @asMemberOf Column
 * @event
 */
export declare function sortMethodChanged(previous: EGroupSortMethod, current: EGroupSortMethod): void;


@SupportType()
@toolbar('sortGroupBy')
@dialogAddons('sortGroup', 'sortGroups')
@Category('support')
export default class GroupColumn extends Column {
  static readonly EVENT_SORTMETHOD_CHANGED = 'sortMethodChanged';

  private groupSortMethod: EGroupSortMethod = EGroupSortMethod.name;

  get frozen() {
    return this.desc.frozen !== false;
  }

  protected createEventList() {
    return super.createEventList().concat([GroupColumn.EVENT_SORTMETHOD_CHANGED]);
  }

  on(type: typeof GroupColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChanged | null): this;
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

  getLabel() {
    return '';
  }

  getValue() {
    return '';
  }

  compare() {
    return 0; //can't compare
  }

  getSortMethod() {
    return this.groupSortMethod;
  }

  setSortMethod(sortMethod: EGroupSortMethod) {
    if (this.groupSortMethod === sortMethod) {
      return;
    }
    this.fire([GroupColumn.EVENT_SORTMETHOD_CHANGED], this.groupSortMethod, this.groupSortMethod = sortMethod);
    // sort by me if not already sorted by me
    if (!this.isGroupSortedByMe().asc) {
      this.toggleMyGroupSorting();
    }
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    switch (this.groupSortMethod) {
      case 'count':
        return a.rows.length - b.rows.length;
      default:
        if (a.name === missingGroup.name) {
          return b.name === missingGroup.name ? 0 : FIRST_IS_NAN;
        }
        if (b.name === missingGroup.name) {
          return -FIRST_IS_NAN;
        }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }
  }
}
