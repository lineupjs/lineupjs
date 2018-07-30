import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import StringMapColumn from '../model/StringMapColumn';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {groupByKey} from './TableCellRenderer';
import {noRenderer} from './utils';
import {cssClass} from '../styles';

/** @internal */
export default class LinkMapCellRenderer implements ICellRendererFactory {
  readonly title = 'Table with Links';

  canRender(col: Column, mode: ERenderMode) {
    return col instanceof StringMapColumn && mode !== ERenderMode.SUMMARY;
  }

  create(col: StringMapColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<div class="${cssClass('rtable')}"></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        const values = col.getValue(d);
        node.innerHTML = col.getLabels(d).map(({key, value}, i) => `
          <div class="${cssClass('table-cell')}">${key}</div>
          <div class="${cssClass('table-cell')} ${align !== 'left' ? cssClass(align): ''}">
            <a href="${values[i].value}" target="_blank" rel="noopener">${value}</a>
          </div>`).join('');
      }
    };
  }

  private static example(arr: { value: string, link: string }[]) {
    const numExampleRows = 5;
    const examples = <string[]>[];
    for (const row of arr) {
      examples.push(`<a target="_blank" rel="noopener" href="${row.link}">${row.value}</a>`);
      if (examples.length >= numExampleRows) {
        break;
      }
    }
    return `${examples.join(', ')}${examples.length < arr.length} ? ', &hellip;': ''}`;
  }

  createGroup(col: StringMapColumn) {
    const align = col.alignment || 'left';
    return {
      template: `<div class="${cssClass('rtable')}"></div>`,
      update: (node: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const vs = rows.filter((d) => !col.isMissing(d)).map((d) => {
          const labels = col.getLabels(d);
          const values = col.getValue(d);
          return labels.map(({key, value}, i) => ({key, value, link: values[i].value}));
        });

        const entries = groupByKey(vs);

        node.innerHTML = entries.map(({key, values}) => `<div>${key}</div><div${align !== 'left' ? ` class="${cssClass(align)}"` : ''}>${LinkMapCellRenderer.example(values)}</div>`).join('');
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}
