import { Column, isNumbersColumn, IDataRow, INumberColumn, isNumberColumn } from '../model';
import { colorOf } from './impose';
import {
  IRenderContext,
  ERenderMode,
  ICellRendererFactory,
  IImposer,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { adaptColor, noRenderer, setText, SMALL_MARK_LIGHTNESS_FACTOR } from './utils';
import { cssClass } from '../styles';

export default class CircleCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Proportional Symbol';

  /**
   * flag to always render the value
   * @type {boolean}
   */
  constructor(private readonly renderValue: boolean = false) {}

  canRender(col: Column, mode: ERenderMode): boolean {
    return isNumberColumn(col) && mode === ERenderMode.CELL && !isNumbersColumn(col);
  }

  create(col: INumberColumn, _context: IRenderContext, imposer?: IImposer): ICellRenderer {
    return {
      template: `<div style="background: radial-gradient(circle closest-side, red 100%, transparent 100%)" title="">
              <div class="${this.renderValue ? '' : cssClass('hover-only')} ${cssClass('bar-label')}"></div>
          </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const v = col.getNumber(d);
        const p = Math.round(v * 100);
        const missing = renderMissingDOM(n, col, d);
        n.style.background = missing
          ? null
          : `radial-gradient(circle closest-side, ${adaptColor(
              colorOf(col, d, imposer),
              SMALL_MARK_LIGHTNESS_FACTOR
            )} ${p}%, transparent ${p}%)`;
        setText(n.firstElementChild!, col.getLabel(d));
      },
    };
  }

  createGroup(): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
