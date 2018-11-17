import {ICategoricalStatistics, IStatistics, round} from '../internal/math';
import {IDataRow, isNumberColumn} from '../model';
import Column from '../model/Column';
import {IMapColumn, isMapColumn} from '../model/IArrayColumn';
import {DEFAULT_FORMATTER} from '../model/INumberColumn';
import {IMapAbleColumn, isMapAbleColumn} from '../model/MappingFunction';
import {colorOf} from './impose';
import {ICellRendererFactory, IImposer, default as IRenderContext, ERenderMode} from './interfaces';
import {renderMissingDOM} from './missing';
import {noRenderer} from './utils';
import {cssClass} from '../styles';

/** @internal */
export default class MapBarCellRenderer implements ICellRendererFactory {
  readonly title = 'Bar Table';

  canRender(col: Column, mode: ERenderMode) {
    return isMapColumn(col) && isNumberColumn(col) && (mode === ERenderMode.CELL || (mode === ERenderMode.SUMMARY && isMapAbleColumn(col)));
  }

  create(col: IMapColumn<number>, _context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    return {
      template: `<div class="${cssClass('rtable')}"></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        node.innerHTML = col.getMap(d).map(({key, value}) => {
          if (isNaN(value)) {
            return `<div class="${cssClass('table-cell')}">${key}</div><div class="${cssClass('table-cell')} ${cssClass('missing')}"></div>`;
          }
          const w = round(value * 100, 2);
          return `<div class="${cssClass('table-cell')}">${key}</div>
            <div class="${cssClass('table-cell')}" title="${DEFAULT_FORMATTER(value)}">
              <div style="width: ${w}%; background-color: ${colorOf(col, d, imposer)}">
                <span class="${cssClass('hover-only')}">${value}</span>
              </div>
            </div>`;
        }).join('');
      }
    };
  }

  createGroup() {
    return noRenderer;
  }

  createSummary(col: IMapColumn<number> & IMapAbleColumn) {
    return {
      template: `<div class="${cssClass('rtable')}"><div>Key</div><div><span></span><span></span>Value</div></div>`,
      update: (node: HTMLElement) => {
        const range = col.getRange();
        const value = <HTMLElement>node.lastElementChild!;
        value.firstElementChild!.textContent = range[0];
        value.children[1]!.textContent = range[1];
      }
    };
  }
}
