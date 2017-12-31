import LinkColumn from '../model/LinkColumn';
import {renderMissingDOM} from './missing';
import Column from '../model/Column';
import {ICellRendererFactory} from './interfaces';
import {IDataRow} from '../model';
import {noop, noRenderer} from './utils';


export default class LinkCellRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof LinkColumn;
  }

  create(col: LinkColumn) {
    return {
      template: `<div class='link text'></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        n.innerHTML = col.isLink(d) ? `<a class="link" href="${col.getValue(d)}" target="_blank">${col.getLabel(d)}</a>` : col.getLabel(d);
      },
      render: noop
    };
  }

  createGroup() {
    return noRenderer;
  }
}
