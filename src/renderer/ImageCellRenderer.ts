import {IDataRow} from '../model';
import {noop, noRenderer} from './utils';
import LinkColumn from '../model/LinkColumn';
import {renderMissingDOM} from './missing';
import Column from '../model/Column';
import {ICellRendererFactory} from './interfaces';

export default class ImageCellRenderer implements ICellRendererFactory {
  readonly title = 'Image';

  canRender(col: Column) {
    return col instanceof LinkColumn;
  }

  create(col: LinkColumn) {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d);
        n.style.backgroundImage = missing || !col.isLink(d) ? null : `url('${col.getValue(d)}')`;
      },
      render: noop
    };
  }

  createGroup() {
    return noRenderer;
  }
}
