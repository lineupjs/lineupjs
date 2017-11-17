import {IGroupData, IGroupItem, isGroup} from '../engine/interfaces';
import {GROUP_SPACING, levelOfDetailInner, levelOfDetailLeaf} from './lod';

const defaultItemHeight = 18;
const minItemHeight = 1;
const maxItemHeight = defaultItemHeight;
const defaultAggrHeight = 40;
const paddingBottom = defaultItemHeight + 5;

export function levelOfDetail(item: IGroupData | IGroupItem, height: number): 'high' | 'medium' | 'low' {
  if (isGroup(item)) {
    return levelOfDetailInner(height);
  }
  return levelOfDetailLeaf(height);
}

export interface IRuleInstance {
  item: number | ((item: IGroupItem) => number);
  group: number | ((group: IGroupData) => number);
  violation?: string;
}

export interface IRule {
  name: string;

  apply(data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>): IRuleInstance;

  levelOfDetail(item: IGroupData | IGroupItem, height: number): 'high' | 'medium' | 'low';
}

function spacefillingItemHeight(data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>) {
  const visibleHeight = availableHeight - paddingBottom;
  const items = <IGroupItem[]>data.filter((d) => !isGroup(d));
  const groups = data.length - items.length;
  const lastItems = items.reduce((a, d) => a + (d.meta === 'last' || d.meta === 'first last' ? 1 : 0), 0);
  const selected = items.reduce((a, d) => a + (selection.has(d.dataIndex) ? 1 : 0), 0);
  const unselected = items.length - selected;
  const groupSeparators = groups + lastItems;

  if (unselected <= 0) {
    // doesn't matter since all are selected anyhow
    return {height: defaultItemHeight, violation: ''};
  }
  const available = visibleHeight - groups * defaultAggrHeight - groupSeparators * GROUP_SPACING - selected * defaultItemHeight;

  const height = available / unselected;
  if (height < minItemHeight) {
    return {
      height: minItemHeight,
      violation: `Not possible to fit all rows on the screen. Set filters or aggregate groups to make it fit again.`
    };
  }
  // clamp to max height
  if (height > maxItemHeight) {
    return {
      height: maxItemHeight,
      violation: ``
    };
  }
  return {height, violation: ''};
}


export const regular = {
  name: 'NotSpacefillingNotProportional',
  apply: () => ({item: defaultItemHeight, group: defaultAggrHeight}),
  levelOfDetail
};

export const spacefilling: IRule = {
  name: 'SpacefillingNotProportional',
  apply: (data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>) => {

    const {violation, height} = spacefillingItemHeight(data, availableHeight, selection);

    const item = (item: IGroupItem) => {
      if (selection.has(item.dataIndex)) {
        return defaultItemHeight;
      }
      return height;
    };
    return {item, group: defaultAggrHeight, violation};
  },
  levelOfDetail
};
