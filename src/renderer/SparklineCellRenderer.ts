import {IDataRow, IGroup, INumbersColumn, isMissingValue, isNumbersColumn} from '../model';
import {ICellRendererFactory} from './interfaces';
import Column from '../model/Column';
import {renderMissingDOM} from './missing';
import {forEachChild, noop} from './utils';
import {matchRows} from './ANumbersCellRenderer';

export function line(data: number[]) {
  if (data.length === 0) {
    return '';
  }
  let p = '';
  let moveNext = true;

  data.forEach((d, i) => {
    if (isMissingValue(d)) {
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
  readonly title = 'Sparkline';

  canRender(col: Column) {
    return isNumbersColumn(col);
  }

  create(col: INumbersColumn & Column) {
    const yPos = 1 - col.getMapping().apply(col.getThreshold());
    return {
      template: `<svg viewBox="0 0 ${col.getDataLength() - 1} 1" preserveAspectRatio="none meet"><line x1="0" x2="${col.getDataLength() - 1}" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const data = col.getNumbers(d);
        n.querySelector('path')!.setAttribute('d', line(data));
      },
      render: noop
    };
  }

  createGroup(col: INumbersColumn & Column) {
    const yPos = 1 - col.getMapping().apply(col.getThreshold());
    return {
      template: `<svg viewBox="0 0 ${col.getDataLength()} 1" preserveAspectRatio="none meet"><line x1="0" x2="${col.getDataLength() - 1}" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        //overlapping ones
        matchRows(n, rows, `<path></path>`);
        forEachChild(n, ((row, i) => {
          const d = rows[i];
          row.setAttribute('d', line(col.getNumbers(d)));
        }));
      }
    };
  }

}
