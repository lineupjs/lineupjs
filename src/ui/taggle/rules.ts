import {IGroupData, IGroupItem, isGroup} from '../../model';
import {groupEndLevel, ITopNGetter} from '../../provider/internal';

export interface IRule {
  apply(data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>, topNGetter: ITopNGetter): IRuleInstance;

  levelOfDetail(item: IGroupData | IGroupItem, height: number): 'high' | 'low';
}

export interface IRuleInstance {
  item: number | ((item: IGroupItem) => number);
  group: number | ((group: IGroupData) => number);
  violation?: string;
}


export function spaceFillingRule(config: {groupHeight: number, rowHeight: number, groupPadding: number}) {
  function levelOfDetail(item: IGroupData | IGroupItem, height: number): 'high' | 'low' {
    const group = isGroup(item);
    const maxHeight = group ? config.groupHeight : config.rowHeight;
    if (height >= maxHeight * 0.9) {
      return 'high';
    }
    return 'low';
  }

  function itemHeight(data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>, topNGetter: ITopNGetter) {
    const visibleHeight = availableHeight - config.rowHeight - 5; // some padding for hover
    const items = <IGroupItem[]>data.filter((d) => !isGroup(d));
    const groups = data.length - items.length;
    const selected = items.reduce((a, d) => a + (selection.has(d.dataIndex) ? 1 : 0), 0);
    const unselected = items.length - selected;
    const groupSeparators = items.reduce((a, d) => a + groupEndLevel(d, topNGetter), 0);

    if (unselected <= 0) {
      // doesn't matter since all are selected anyhow
      return {height: config.rowHeight, violation: ''};
    }
    const available = visibleHeight - groups * config.groupHeight - groupSeparators * config.groupPadding - selected * config.rowHeight;

    const height = Math.floor(available / unselected); // round to avoid sub pixel issues
    if (height < 1) {
      return {
        height: 1,
        violation: `Not possible to fit all rows on the screen. Set filters or aggregate groups to make it fit again.`
      };
    }
    // clamp to max height
    if (height > config.rowHeight) {
      return {
        height: config.rowHeight,
        violation: ``
      };
    }
    return {height, violation: ''};
  }

  return <IRule>{
    apply: (data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>, topNGetter: ITopNGetter) => {

      const {violation, height} = itemHeight(data, availableHeight, selection, topNGetter);

      const item = (item: IGroupItem) => {
        if (selection.has(item.dataIndex)) {
          return config.rowHeight;
        }
        return height;
      };
      return {item, group: config.groupHeight, violation};
    },
    levelOfDetail
  };
}
