import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {IDataRow, INumberColumn, isNumberColumn} from '../model';
import Column from '../model/Column';
import {isNumbersColumn} from '../model/INumberColumn';
import {colorOf} from './impose';
import {default as IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingDOM} from './missing';
import {attr, noop, noRenderer, setText} from './utils';

/** @internal */
export default class CircleCellRenderer implements ICellRendererFactory {
  readonly title = 'Proportional Symbol';

  canRender(col: Column, mode: ERenderMode) {
    return isNumberColumn(col) && mode === ERenderMode.CELL && !isNumbersColumn(col);
  }

  create(col: INumberColumn, _context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
    return {
      template: `<div style="background: radial-gradient(circle closest-side, red 100%, transparent 100%)" title="">
              <div class="lu-hover-only"></div>
          </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const v = col.getNumber(d);
        const p = Math.round(v * 100);
        const missing = renderMissingDOM(n, col, d);
        attr(<HTMLElement>n, {}, {
          background: missing ? null : `radial-gradient(circle closest-side, ${colorOf(col, d, imposer)} ${p}%, transparent ${p}%)`
        },);
        setText(n.firstElementChild!, col.getLabel(d));
      },
      render: noop
    };
  }

  createGroup() {
    return noRenderer;
  }

  createSummary() {
    return noRenderer;
  }
}
