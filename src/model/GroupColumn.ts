import {Category, SupportType, toolbar, dialogAddons} from './annotations';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import {IDataRow, IGroup, ECompareValueType} from './interfaces';
import {missingGroup} from './missing';
import {IEventListener, ISequence} from '../internal';

export function createGroupDesc(label = 'Group Name') {
  return {type: 'group', label};
}

export enum EGroupSortMethod {
  name = 'name',
  count = 'count'
}

/**
 * emitted when the sort method property changes
 * @asMemberOf GroupColumn
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
  on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(<any>type, listener);
  }

  getLabel() {
    return '';
  }

  getValue() {
    return '';
  }

  getSortMethod() {
    return this.groupSortMethod;
  }

  setSortMethod(sortMethod: EGroupSortMethod) {
    if (this.groupSortMethod === sortMethod) {
      return;
    }
    this.fire(GroupColumn.EVENT_SORTMETHOD_CHANGED, this.groupSortMethod, this.groupSortMethod = sortMethod);
    // sort by me if not already sorted by me
    if (!this.isGroupSortedByMe().asc) {
      this.toggleMyGroupSorting();
    }
  }

  toCompareGroupValue(rows: ISequence<IDataRow>, group: IGroup) {
    if (this.groupSortMethod === 'count') {
      return rows.length;
    }
    return group.name === missingGroup.name ? null : group.name.toLowerCase();
  }

  toCompareGroupValueType() {
    return this.groupSortMethod === 'count' ? ECompareValueType.COUNT : ECompareValueType.STRING;
  }
}
