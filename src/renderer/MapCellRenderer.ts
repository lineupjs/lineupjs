import {nest} from 'd3-collection';
import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import MapColumn, {IKeyValue} from '../model/MapColumn';
import {ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop} from './utils';

export default class MapCellRenderer implements ICellRendererFactory {
  readonly title = 'Table';

  canRender(col: Column) {
    return col instanceof MapColumn;
  }

  create(col: MapColumn<any>) {
    return {
      template: `<div></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        node.innerHTML = col.getLabels(d).map(({key, value}) => `<div>${key}</div><div>${value}</div>`).join('');
      },
      render: noop
    };
  }

  private static example(arr: IKeyValue<string>[]) {
    const numExampleRows = 5;
    return `${arr.slice(0, numExampleRows).map((d) => d.value).join(', ')}${numExampleRows < arr.length ? ', &hellip;' : ''}`;
  }

  createGroup(col: MapColumn<any>) {
    return {
      template: `<div></div>`,
      update: (node: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const vs = rows.filter((d) => !col.isMissing(d)).map((d) => col.getLabels(d));

        const entries = nest<IKeyValue<string>>().key((d) => d.key).entries((<IKeyValue<string>[]>[]).concat(...vs));

        node.innerHTML = entries.map(({key, values}) => `<div>${key}</div><div>${MapCellRenderer.example(values)}</div>`).join('');
      }
    };
  }
}
