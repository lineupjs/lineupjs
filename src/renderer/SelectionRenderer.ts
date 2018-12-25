import {Column, SelectionColumn, IDataRow, IOrderedGroup} from '../model';
import {IRenderContext, ICellRendererFactory} from './interfaces';
import {cssClass} from '../styles';
import {everyIndices} from '../model/internal';
import {rangeSelection} from '../provider/utils';

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

        n.classList.toggle(cssClass('group-selected'), selected * 2 > total);
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
