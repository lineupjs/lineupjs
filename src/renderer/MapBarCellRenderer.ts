import { round } from '../internal';
import {
  Column,
  IMapColumn,
  IMapAbleColumn,
  isMapAbleColumn,
  isMapColumn,
  IDataRow,
  isNumberColumn,
  INumberColumn,
} from '../model';
import { colorOf } from './impose';
import {
  ICellRendererFactory,
  IImposer,
  IRenderContext,
  ERenderMode,
  ISummaryRenderer,
  IGroupCellRenderer,
  ICellRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { noRenderer } from './utils';
import { cssClass } from '../styles';

export default class MapBarCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Bar Table';

  canRender(col: Column, mode: ERenderMode): boolean {
    return (
      isMapColumn(col) &&
      isNumberColumn(col) &&
      (mode === ERenderMode.CELL || (mode === ERenderMode.SUMMARY && isMapAbleColumn(col)))
    );
  }

  create(col: IMapColumn<number> & INumberColumn, _context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const formatter = col.getNumberFormat();

    return {
      template: `<div class="${cssClass('rtable')}"></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        node.innerHTML = col
          .getMap(d)
          .map(({ key, value }) => {
            if (Number.isNaN(value)) {
              return `<div class="${cssClass('table-cell')}">${key}</div><div class="${cssClass(
                'table-cell'
              )} ${cssClass('missing')}"></div>`;
            }
            const w = round(value * 100, 2);
            return `<div class="${cssClass('table-cell')}">${key}</div>
            <div class="${cssClass('table-cell')}" title="${formatter(value)}">
              <div style="width: ${w}%; background-color: ${colorOf(col, d, imposer)}">
                <span class="${cssClass('hover-only')}">${value}</span>
              </div>
            </div>`;
          })
          .join('');
      },
    };
  }

  createGroup(): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(col: IMapColumn<number> & IMapAbleColumn): ISummaryRenderer {
    return {
      template: `<div class="${cssClass('rtable')}"><div>Key</div><div><span></span><span></span>Value</div></div>`,
      update: (node: HTMLElement) => {
        const range = col.getRange();
        const value = node.lastElementChild! as HTMLElement;
        value.firstElementChild!.textContent = range[0];
        value.children[1]!.textContent = range[1];
      },
    };
  }
}
