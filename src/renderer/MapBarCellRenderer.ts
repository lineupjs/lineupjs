import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {IDataRow, isMissingValue, isNumberColumn} from '../model';
import Column from '../model/Column';
import {IMapColumn, isMapColumn} from '../model/IArrayColumn';
import {DEFAULT_FORMATTER} from '../model/INumberColumn';
import {IMapAbleColumn, isMapAbleColumn} from '../model/MappingFunction';
import {colorOf} from './impose';
import {ICellRendererFactory, IImposer, default as IRenderContext, ERenderMode} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer} from './utils';

/** @internal */
export default class MapBarCellRenderer implements ICellRendererFactory {
  readonly title = 'Bar Table';

  canRender(col: Column, mode: ERenderMode) {
    return isMapColumn(col) && isNumberColumn(col) && (mode === ERenderMode.CELL || (mode === ERenderMode.SUMMARY && isMapAbleColumn(col)));
  }

  create(col: IMapColumn<number>, _context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    return {
      template: `<div></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        node.innerHTML = col.getMap(d).map(({key, value}) => {
          if (isMissingValue(value)) {
            return `<div>${key}</div><div class="lu-missing"></div>`;
          }
          const w = isNaN(value) ? 0 : Math.round(value * 100 * 100) / 100;
          return `<div>${key}</div><div title="${DEFAULT_FORMATTER(value)}"><div style="width: ${w}%; background-color: ${colorOf(col, d, imposer)}"><span class="lu-hover-only">${value}</span></div></div>`;
        }).join('');
      },
      render: noop
    };
  }

  createGroup() {
    return noRenderer;
  }

  createSummary(col: IMapColumn<number> & IMapAbleColumn) {
    return {
      template: `<div><div>Key</div><div><span></span><span></span>Value</div></div>`,
      update: (node: HTMLElement) => {
        const range = col.getRange();
        const value = <HTMLElement>node.lastElementChild!;
        value.firstElementChild!.textContent = range[0];
        value.children[1]!.textContent = range[1];
      }
    };
  }
}
