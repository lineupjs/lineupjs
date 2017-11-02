import {IGroupData, IGroupItem, isGroup} from '../engine/interfaces';
import {GROUP_SPACING, leafMargins, levelOfDetailInner, levelOfDetailLeaf} from './lod';

const defaultItemHeight = 20;
const minItemHeight = 1;
const maxItemHeight = 20;
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
  const selected = items.reduce((a, d) => a + (selection.has(d.dataIndex) ? 1 : 0), 0);
  const unselected = items.length - selected;

  if (unselected <= 0) {
    // doesn't matter since all are selected anyhow
    return {height: defaultItemHeight, violation: ''};
  }
  const available = visibleHeight - groups * defaultAggrHeight - groups * GROUP_SPACING - selected * (defaultItemHeight + leafMargins.high);

  let height = available / unselected;
  const guess = levelOfDetailLeaf(height);
  const heightWithMargin = height - leafMargins[guess];
  if (guess !== levelOfDetailLeaf(heightWithMargin)) {
    // below the border to next change such that it is just below the threshold
    height = defaultItemHeight - 0.1;
  } else {
    height = heightWithMargin;
  }
  if (height < minItemHeight) {
    return {
      height: minItemHeight,
      violation: `Height of some items were smaller than their minimal allowed size, limiting to minimal size`
    };
  }
  if (height > maxItemHeight) {
    return {
      height: maxItemHeight,
      violation: `Height of some items were bigger than their maximal allowed size, limiting to maximal size`
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
