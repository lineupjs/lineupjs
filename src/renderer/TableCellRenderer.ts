import {IDataRow, IGroup, isMissingValue} from '../model';
import ArrayColumn from '../model/ArrayColumn';
import Column from '../model/Column';
import {ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {forEach, noop} from './utils';

export default class TableCellRenderer implements ICellRendererFactory {
  readonly title = 'Table';

  canRender(col: Column) {
    return col instanceof ArrayColumn;
  }

  private static template(col: ArrayColumn<any>) {
    const labels = col.labels;
    return `<div>${labels.map((l) => `<div>${l}</div><div data-v></div>`).join('\n')}</div>`;
  }

  create(col: ArrayColumn<any>) {
    return {
      template: TableCellRenderer.template(col),
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        const value = col.getLabels(d);
        forEach(node, '[data-v]', (n: HTMLElement, i) => {
          n.innerHTML = value[i];
        });
      },
      render: noop
    };
  }

  createGroup(col: ArrayColumn<any>) {
    return {
      template: TableCellRenderer.template(col),
      update: (node: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const numExampleRows = 5;
        const vs = rows.filter((d) => !col.isMissing(d)).map((d) => col.getLabels(d));
        forEach(node, '[data-v]', (n: HTMLElement, i) => {
          const values = <string[]>[];
          for (const v of vs) {
            const vi = v[i];
            if (isMissingValue(vi)) {
              continue;
            }
            values.push(vi);
            if (values.length >= numExampleRows) {
              break;
            }
          }
          n.innerHTML = `${values.join(', ')}${numExampleRows < vs.length ? ', &hellip;' : ''}`;
        });
      }
    };
  }
}
