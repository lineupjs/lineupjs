import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import {IKeyValue} from '../model/MapColumn';
import StringMapColumn from '../model/StringMapColumn';
import {ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop} from './utils';
import {nest} from 'd3-collection';

export default class LinkMapCellRenderer implements ICellRendererFactory {
  readonly title = 'Table with Links';

  canRender(col: Column) {
    return col instanceof StringMapColumn;
  }

  create(col: StringMapColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<div></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        const values = col.getValue(d);
        node.innerHTML = col.getLabels(d).map(({key, value}, i) => `<div>${key}</div><div${align !== 'left' ? ` class="lu-${align}"` : ''}><a href="${values[i].value}" target="_blank">${value}</a></div>`).join('');
      },
      render: noop
    };
  }

  private static example(arr: {value: string, link: string}[]) {
    const numExampleRows = 5;
    const examples = <string[]>[];
    for(const row of arr) {
      examples.push(`<a target="_blank" href="${row.link}">${row.value}</a>`);
      if (examples.length >= numExampleRows) {
        break;
      }
    }
    return `${examples.join(', ')}${examples.length < arr.length} ? ', &hellip;': ''}`;
  }

  createGroup(col: StringMapColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<div></div>`,
      update: (node: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const vs = rows.filter((d) => !col.isMissing(d)).map((d) => {
          const labels = col.getLabels(d);
          const values = col.getValue(d);
          return labels.map(({key, value}, i) => ({key, value, link: values[i].value}));
        });

        const entries = nest<IKeyValue<string>>().key((d) => d.key).entries((<IKeyValue<string>[]>[]).concat(...vs));

        node.innerHTML = entries.map(({key, values}) => `<div>${key}</div><div${align !== 'left' ? ` class="lu-${align}"` : ''}>${LinkMapCellRenderer.example(values)}</div>`).join('');
      }
    };
  }
}
