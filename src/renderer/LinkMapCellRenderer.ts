import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {groupByKey} from './TableCellRenderer';
import {noop, noRenderer} from './utils';
import LinkMapColumn from '../model/LinkMapColumn';
import {ILink} from '../model/LinkColumn';
import {IKeyValue} from '../model/IArrayColumn';

/** @internal */
export default class LinkMapCellRenderer implements ICellRendererFactory {
  readonly title = 'Table with Links';

  canRender(col: Column, mode: ERenderMode) {
    return col instanceof LinkMapColumn && mode !== ERenderMode.SUMMARY;
  }

  create(col: LinkMapColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<div></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        node.innerHTML = col.getLinkMap(d).map(({key, value}) => `<div>${key}</div><div${align !== 'left' ? ` class="lu-${align}"` : ''}><a href="${value.href}" target="_blank">${value.alt}</a></div>`).join('');
      },
      render: noop
    };
  }

  private static example(arr: IKeyValue<ILink>[]) {
    const numExampleRows = 5;
    const examples = <string[]>[];
    for (const row of arr) {
      examples.push(`<a target="_blank" href="${row.value.href}">${row.value.alt}</a>`);
      if (examples.length >= numExampleRows) {
        break;
      }
    }
    return `${examples.join(', ')}${examples.length < arr.length} ? ', &hellip;': ''}`;
  }

  createGroup(col: LinkMapColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<div></div>`,
      update: (node: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const vs = rows.filter((d) => !col.isMissing(d)).map((d) => col.getLinkMap(d));

        const entries = groupByKey(vs);

        node.innerHTML = entries.map(({key, values}) => `<div>${key}</div><div${align !== 'left' ? ` class="lu-${align}"` : ''}>${LinkMapCellRenderer.example(values)}</div>`).join('');
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
