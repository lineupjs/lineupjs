import {IDataRow} from '../model';
import Column from '../model/Column';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer, setText} from './utils';

/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ICellRendererFactory {
  title = 'String';

  canRender(_col: Column, _mode: ERenderMode) {
    return true;
  }

  create(col: Column) {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        setText(n, col.getLabel(d));
      },
      render: noop
    };
  }

  createGroup(_col: Column) {
    return noRenderer;
  }

  createSummary() {
    return noRenderer;
  }
}
