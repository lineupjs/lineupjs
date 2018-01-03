import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {IDataRow, isMissingValue, isNumberColumn} from '../model';
import Column from '../model/Column';
import {DEFAULT_FORMATTER} from '../model/INumberColumn';
import {IMapColumn, isMapColumn} from '../model/MapColumn';
import {colorOf} from './impose';
import {ICellRendererFactory, IImposer, default as IRenderContext} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer} from './utils';

export default class MapBarCellRenderer implements ICellRendererFactory {
  readonly title = 'Bar Table';

  canRender(col: Column, isGroup: boolean) {
    return isMapColumn(col) && isNumberColumn(col) && !isGroup;
  }

  create(col: IMapColumn<number> & Column, _context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
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
}
