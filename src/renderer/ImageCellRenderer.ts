import {IDataRow} from '../model';
import Column from '../model/Column';
import StringColumn from '../model/StringColumn';
import {ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer} from './utils';

export default class ImageCellRenderer implements ICellRendererFactory {
  readonly title = 'Image';

  canRender(col: Column, isGroup: boolean) {
    return !isGroup && col instanceof StringColumn;
  }

  create(col: StringColumn) {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d);
        n.style.backgroundImage = missing ? null : `url('${col.getValue(d)}')`;
      },
      render: noop
    };
  }

  createGroup() {
    return noRenderer;
  }
}
