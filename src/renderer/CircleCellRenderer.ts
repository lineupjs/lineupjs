import Column from '../model/Column';
import {INumberColumn, isNumberColumn, isNumbersColumn} from '../model/INumberColumn';
import {IDataRow} from '../model';
import {attr, noop, noRenderer, setText} from './utils';
import {renderMissingDOM} from './missing';
import {colorOf, IImposer} from './impose';
import {ICellRendererFactory, default as IRenderContext} from './interfaces';
import {ICategoricalStatistics, IStatistics} from '../internal/math';

export default class CircleCellRenderer implements ICellRendererFactory {
  readonly title = 'Proportional Symbol';

  canRender(col: Column, isGroup: boolean) {
    return isNumberColumn(col) && !isGroup && !isNumbersColumn(col);
  }

  create(col: INumberColumn & Column, _context: IRenderContext, _hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer) {
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
}
