import Column from '../model/Column';
import {IDataRow} from '../model';
import {noop, noRenderer, setText} from './utils';
import {renderMissingDOM} from './missing';
import {ICellRendererFactory} from './interfaces';

/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ICellRendererFactory {
  title = 'String';

  canRender(_col: Column) {
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
}
