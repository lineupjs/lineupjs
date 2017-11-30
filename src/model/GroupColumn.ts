/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import {IGroupData} from '../ui/engine/interfaces';
import {FIRST_IS_NAN, missingGroup} from './missing';

export function createDesc(label = 'Group') {
  return {type: 'group', label};
}

export default class GroupColumn extends Column {
  private groupSortMethod: 'name'|'count' = 'name';

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

  setSortMethod(sortMethod: 'name'|'count') {
    if (this.groupSortMethod === sortMethod) {
      return;
    }
    this.fire([Column.EVENT_SORTMETHOD_CHANGED], this.groupSortMethod, this.groupSortMethod = sortMethod);
    // sort by me if not already sorted by me
    if (!this.isGroupSortedByMe().asc) {
      this.toggleMyGroupSorting();
    }
  }

  groupCompare(a: IGroupData, b: IGroupData) {
    switch(this.groupSortMethod) {
      case 'count':
        return a.rows.length - b.rows.length;
      default:
        if (a.name === missingGroup.name) {
          return b.name === missingGroup.name ? 0 : FIRST_IS_NAN;
        }
        if (b.name === missingGroup.name) {
          return - FIRST_IS_NAN;
        }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }
  }
}
