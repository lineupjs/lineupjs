import {IDataRow, IGroup, isMissingValue} from '../model';
import Column from '../model/Column';
import {INumbersColumn, isNumbersColumn} from '../model/INumberColumn';
import NumbersColumn from '../model/NumbersColumn';
import {matchRows} from './ANumbersCellRenderer';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {forEachChild, noRenderer} from './utils';

/** @internal */
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

/** @internal */
export default class SparklineCellRenderer implements ICellRendererFactory {
  readonly title = 'Sparkline';

  canRender(col: Column, mode: ERenderMode) {
    return isNumbersColumn(col) && mode !== ERenderMode.SUMMARY;
  }

  create(col: INumbersColumn) {
    const dataLength = col.dataLength!;
    const yPos = 1 - col.getMapping().apply(NumbersColumn.CENTER);
    return {
      template: `<svg viewBox="0 0 ${dataLength - 1} 1" preserveAspectRatio="none meet"><line x1="0" x2="${dataLength - 1}" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        const data = col.getNumbers(d);
        n.querySelector('path')!.setAttribute('d', line(data));
      }
    };
  }

  createGroup(col: INumbersColumn) {
    const dataLength = col.dataLength!;
    const yPos = 1 - col.getMapping().apply(NumbersColumn.CENTER);
    return {
      template: `<svg viewBox="0 0 ${dataLength} 1" preserveAspectRatio="none meet"><line x1="0" x2="${dataLength - 1}" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
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

  createSummary() {
    return noRenderer;
  }

}
