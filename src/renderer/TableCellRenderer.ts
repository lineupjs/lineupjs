import {
  IArrayColumn,
  IMapColumn,
  isArrayColumn,
  isMapColumn,
  Column,
  IDataRow,
  isMissingValue,
  IOrderedGroup,
} from '../model';
import type {
  IRenderContext,
  ICellRendererFactory,
  ISummaryRenderer,
  IGroupCellRenderer,
  ICellRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { forEach, noop } from './utils';
import { cssClass } from '../styles';
import type { ISequence } from '../internal';
import { renderTable } from './MapBarCellRenderer';

export default class TableCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Table';

  canRender(col: Column) {
    return isMapColumn(col);
  }

  create(col: IMapColumn<any>): ICellRenderer {
    if (isArrayColumn(col) && col.dataLength) {
      // fixed length optimized rendering
      return this.createFixed(col);
    }
    return {
      template: `<div class="${cssClass('rtable')}"></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        renderTable(node, col.getMapLabel(d), (n, { value }) => {
          n.textContent = value;
        });
      },
    };
  }

  private static template(col: IArrayColumn<any>) {
    const labels = col.labels;
    return `<div>${labels
      .map(
        (l) => `<div class="${cssClass('table-cell')}">${l}</div><div  class="${cssClass('table-cell')}" data-v></div>`
      )
      .join('\n')}</div>`;
  }

  private createFixed(col: IArrayColumn<any>) {
    return {
      template: TableCellRenderer.template(col),
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        const value = col.getLabels(d);
        forEach(node, '[data-v]', (n: HTMLElement, i) => {
          n.textContent = value[i];
        });
      },
    };
  }

  createGroup(col: IMapColumn<any>, context: IRenderContext): IGroupCellRenderer {
    if (isArrayColumn(col) && col.dataLength) {
      // fixed length optimized rendering
      return this.createFixedGroup(col, context);
    }
    return {
      template: `<div class="${cssClass('rtable')}"></div>`,
      update: (node: HTMLElement, group: IOrderedGroup) => {
        return context.tasks
          .groupRows(col, group, 'table', (rows) => groupByKey(rows.map((d) => col.getMapLabel(d))))
          .then((entries) => {
            if (typeof entries === 'symbol') {
              return;
            }
            renderTable(node, entries, (n, { values }) => {
              const numExampleRows = 5;
              const v = `${values
                .slice(0, numExampleRows)
                .map((d) => d.value)
                .join(', ')}`;
              if (numExampleRows < values.length) {
                n.textContent = `${v}, …`;
              } else {
                n.textContent = v;
              }
            });
          });
      },
    };
  }

  private createFixedGroup(col: IArrayColumn<any>, context: IRenderContext) {
    return {
      template: TableCellRenderer.template(col),
      update: (node: HTMLElement, group: IOrderedGroup) => {
        return context.tasks
          .groupExampleRows(col, group, 'table', (rows) => {
            const values: string[][] = col.labels.map(() => []);
            rows.forEach((row) => {
              const labels = col.getLabels(row);
              for (let i = 0; i < Math.min(values.length, labels.length); ++i) {
                if (!isMissingValue(labels[i])) {
                  values[i].push(labels[i]);
                }
              }
            });
            return values;
          })
          .then((values) => {
            if (typeof values === 'symbol') {
              return;
            }
            forEach(node, '[data-v]', (n: HTMLElement, i) => {
              n.textContent = `${values[i].join(', ')}, …`;
            });
          });
      },
    };
  }

  createSummary(): ISummaryRenderer {
    return {
      template: `<div class="${cssClass('rtable')}"><div>Key</div><div>Value</div></div>`,
      update: noop,
    };
  }
}

/** @internal */
export function groupByKey<T extends { key: string }>(arr: ISequence<ISequence<T>>) {
  const m = new Map<string, T[]>();
  arr.forEach((a) =>
    a.forEach((d) => {
      if (!m.has(d.key)) {
        m.set(d.key, [d]);
      } else {
        m.get(d.key)!.push(d);
      }
    })
  );
  return Array.from(m)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, values]) => ({ key, values }));
}
