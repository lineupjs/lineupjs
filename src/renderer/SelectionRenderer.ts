import {Column, SelectionColumn, IDataRow, IOrderedGroup} from '../model';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
import {IDataProvider} from '../provider';
import {cssClass} from '../styles';
import {everyIndices} from '../model/internal';

/** @internal */
export default class SelectionRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof SelectionColumn;
  }

  create(col: SelectionColumn, ctx: IRenderContext) {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        n.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) {
            const ranking = col.findMyRanker()!.id;
            if (rangeSelection(ctx.provider, ranking, d.i, i, event.ctrlKey)) {
              return;
            }
          }

          col.toggleValue(d);
        };
      }
    };
  }

  createGroup(col: SelectionColumn, context: IRenderContext) {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        let selected = 0;
        let unselected = 0;
        const total = group.order.length;
        everyIndices(group.order, (i) => {
          const s = context.provider.isSelected(i);
          if (s) {
            selected++;
          } else {
            unselected++;
          }
          if (selected * 2 > total || unselected * 2 > total) {
            // more than half already, can abort already decided
            return false;
          }
          return true;
        });
        const all = selected * 2 > length;
        if (all) {
          n.classList.add(cssClass('group-selected'));
        } else {
          n.classList.remove(cssClass('group-selected'));
        }
        n.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          const value = n.classList.toggle(cssClass('group-selected'));
          col.setValues(group.order, value);
        };
      }
    };
  }

  createSummary(col: SelectionColumn, context: IRenderContext) {
    const unchecked = cssClass('icon-unchecked');
    const checked = cssClass('icon-checked');
    return {
      template: `<div title="(Un)Select All" class="${unchecked}"></div>`,
      update: (node: HTMLElement) => {
        node.onclick = (evt) => {
          evt.stopPropagation();
          const isunchecked = node.classList.contains(unchecked);
          if (isunchecked) {
            context.provider.selectAllOf(col.findMyRanker()!);
            node.classList.remove(unchecked);
            node.classList.add(checked);
          } else {
            context.provider.setSelection([]);
            node.classList.remove(checked);
            node.classList.add(unchecked);
          }
        };
      }
    };
  }
}

/** @internal */
export function rangeSelection(provider: IDataProvider, rankingId: string, dataIndex: number, relIndex: number, ctrlKey: boolean) {
  const ranking = provider.getRankings().find((d) => d.id === rankingId);
  if (!ranking) { // no known reference
    return false;
  }
  const selection = provider.getSelection();
  if (selection.length === 0 || selection.includes(dataIndex)) {
    return false; // no other or deselect
  }
  const order = ranking.getOrder();
  const lookup = new Map(Array.from(order).map((d, i) => <[number, number]>[d, i]));
  const distances = selection.map((d) => {
    const index = (lookup.has(d) ? lookup.get(d)! : Infinity);
    return {s: d, index, distance: Math.abs(relIndex - index)};
  });
  const nearest = distances.sort((a, b) => a.distance - b.distance)[0]!;
  if (!isFinite(nearest.distance)) {
    return false; // all outside
  }
  if (!ctrlKey) {
    selection.splice(0, selection.length);
    selection.push(nearest.s);
  }
  if (nearest.index < relIndex) {
    for (let i = nearest.index + 1; i <= relIndex; ++i) {
      selection.push(order[i]);
    }
  } else {
    for (let i = relIndex; i <= nearest.index; ++i) {
      selection.push(order[i]);
    }
  }
  provider.setSelection(selection);
  return true;
}
