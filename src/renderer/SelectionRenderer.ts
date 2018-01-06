import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import SelectionColumn from '../model/SelectionColumn';
import {default as IRenderContext, ICellRendererFactory} from './interfaces';
import {noop} from './utils';

export default class SelectionRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof SelectionColumn;
  }

  create(col: SelectionColumn) {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        n.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          col.toggleValue(d);
        };
      },
      render: noop
    };
  }

  createGroup(col: SelectionColumn) {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const selected = rows.reduce((act, r) => col.getValue(r) ? act + 1 : act, 0);
        const all = selected >= rows.length / 2;
        if (all) {
          n.classList.add('lu-group-selected');
        } else {
          n.classList.remove('lu-group-selected');
        }
        n.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          const value = n.classList.toggle('lu-group-selected');
          col.setValues(rows, value);
        };
      }
    };
  }

  createSummary(col: SelectionColumn, context: IRenderContext) {
    return {
      template: `<div title="(Un)Select All" data-icon="unchecked"></div>`,
      update: (node: HTMLElement) => {
        node.onclick = (evt) => {
          evt.stopPropagation();
          const icon = node.dataset.icon;
          if (icon === 'unchecked') {
            context.provider.selectAllOf(col.findMyRanker()!);
            node.dataset.icon = 'checked';
          } else {
            context.provider.setSelection([]);
            node.dataset.icon = 'unchecked';
          }
        };
      }
    };
  }
}
