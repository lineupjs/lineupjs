import {IGroupData, IGroupItem, isGroup} from './interfaces';
import {defaultPhases, IAnimationContext, IAnimationItem, IPhase} from 'lineupengine/src/animation';
import {IExceptionContext} from 'lineupengine/src/logic';

/**
 * Created by Samuel Gratzl on 25.10.2017.
 */


export interface IGroupLookUp {
  item2groupIndex: Map<number, number>;
  group2firstItemIndex: Map<string, number>;
}

function toGroupLookup(items: (IGroupItem | IGroupData)[]): IGroupLookUp {
  const item2groupIndex = new Map<number, number>();
  const group2firstItemIndex = new Map<string, number>();
  items.forEach((item, i) => {
    if (isGroup(item)) {
      item.rows.forEach((d) => item2groupIndex.set(d.dataIndex, i));
    } else if (item.relativeIndex === 0 && item.group) {
      group2firstItemIndex.set(item.group.name, i);
    }
  });
  return {item2groupIndex, group2firstItemIndex};
}

function toKey(item: IGroupItem | IGroupData) {
  if (isGroup(item)) {
    return item.name;
  }
  return (<IGroupItem>item).dataIndex.toString();
}

export function lineupAnimation(previous: IExceptionContext, previousData: (IGroupItem | IGroupData)[], currentData: (IGroupItem | IGroupData)[]): IAnimationContext {

  const previousKey = (index: number) => toKey(previousData[index]);
  const currentKey = (index: number) => toKey(currentData[index]);

  const phases: IPhase[] = [
    Object.assign({}, defaultPhases[0], {
      apply(item: Readonly<IAnimationItem>) {
        item.node.dataset.animation = item.mode;
        item.node.style.transform = `translate(0, ${item.previous.y - item.nodeY}px)`;
        item.node.style.opacity = item.mode === 'create_add' ? '0' : (item.mode === 'remove_delete' ? '1' : null);
      }
    }),
    Object.assign({}, defaultPhases[1], {
      apply(item: Readonly<IAnimationItem>) {
        // null for added/update sinc alredy at th eright position
        item.node.style.transform = item.mode.startsWith('remove') ? `translate(0, ${item.current.y - item.nodeY}px)` : null;
        item.node.style.height = item.current.height !== null ? `${item.current.height}px` : null;
        item.node.style.opacity = item.mode === 'create_add' ? '1' : (item.mode === 'remove_delete' ? '0' : null);
      }
    }),
    defaultPhases[defaultPhases.length - 1]
  ];

  return {previous, previousKey, currentKey, phases};
}
