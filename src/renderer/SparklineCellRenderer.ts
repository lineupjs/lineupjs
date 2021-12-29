import {
  Column,
  INumbersColumn,
  NumbersColumn,
  isNumbersColumn,
  IDataRow,
  IOrderedGroup,
  isMissingValue,
} from '../model';
import { matchRows } from './ANumbersCellRenderer';
import {
  IRenderContext,
  ERenderMode,
  ICellRendererFactory,
  ISummaryRenderer,
  IGroupCellRenderer,
  ICellRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { forEachChild, noRenderer } from './utils';
import type { ISequence } from '../internal';
import { cssClass } from '../styles';

/** @internal */
export function line(data: ISequence<number>) {
  if (data.length === 0) {
    return '';
  }
  let p = '';
  let moveNext = true;

  data.forEach((d, i) => {
    if (Number.isNaN(d)) {
      moveNext = true;
    } else if (moveNext) {
      p += `M${i},${1 - d} `;
      moveNext = false;
    } else {
      p += `L${i},${1 - d} `;
    }
  });
  return p;
}

export default class SparklineCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Sparkline';

  canRender(col: Column, mode: ERenderMode) {
    return isNumbersColumn(col) && mode !== ERenderMode.SUMMARY;
  }

  create(col: INumbersColumn): ICellRenderer {
    const dataLength = col.dataLength!;
    const yPos = 1 - col.getMapping().apply(NumbersColumn.CENTER);
    return {
      template: `<svg viewBox="0 0 ${dataLength - 1} 1" preserveAspectRatio="none meet"><line x1="0" x2="${
        dataLength - 1
      }" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const data = col.getNumbers(d);
        n.lastElementChild!.setAttribute('d', line(data));
      },
    };
  }

  createGroup(col: INumbersColumn, context: IRenderContext): IGroupCellRenderer {
    const dataLength = col.dataLength!;
    const yPos = 1 - col.getMapping().apply(NumbersColumn.CENTER);
    return {
      template: `<svg viewBox="0 0 ${dataLength - 1} 1" preserveAspectRatio="none meet"><line x1="0" x2="${
        dataLength - 1
      }" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        //overlapping ones
        matchRows(n, group.order.length, `<path></path>`);
        return context.tasks
          .groupRows(col, group, 'numbers', (r) => Array.from(r.map((d) => col.getNumbers(d))))
          .then((vs) => {
            if (typeof vs === 'symbol') {
              return;
            }
            const isMissing = vs.length === 0 || vs.every((v) => v.every(isMissingValue));
            n.classList.toggle(cssClass('missing'), isMissing);
            if (isMissing) {
              return;
            }
            forEachChild(n, (row, i) => {
              row.setAttribute('d', line(vs[i]));
            });
          });
      },
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
