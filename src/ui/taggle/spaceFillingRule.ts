import {IGroupData, IGroupItem, isGroup} from '../../model';
import {IRule} from './interfaces';

export default function spaceFillingRule(config: { groupHeight: number, rowHeight: number, groupPadding: number }) {
  function levelOfDetail(item: IGroupData | IGroupItem, height: number): 'high' | 'low' {
    const group = isGroup(item);
    const maxHeight = group ? config.groupHeight : config.rowHeight;
    if (height >= maxHeight * 0.9) {
      return 'high';
    }
    return 'low';
  }

  function itemHeight(data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>) {
    const visibleHeight = availableHeight - config.rowHeight - 5; // some padding for hover
    const items = <IGroupItem[]>data.filter((d) => !isGroup(d));
    const groups = data.length - items.length;
    const lastItems = items.reduce((a, d) => a + (d.meta === 'last' || d.meta === 'first last' ? 1 : 0), 0);
    const selected = items.reduce((a, d) => a + (selection.has(d.i) ? 1 : 0), 0);
    const unselected = items.length - selected;
    const groupSeparators = groups + lastItems;

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
    apply: (data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>) => {

      const {violation, height} = itemHeight(data, availableHeight, selection);

      const item = (item: IGroupItem) => {
        if (selection.has(item.i)) {
          return config.rowHeight;
        }
        return height;
      };
      return {item, group: config.groupHeight, violation};
    },
    levelOfDetail
  };
}
