import {IDataRow} from '../model';
import Column from '../model/Column';
import {ERenderMode, ICellRendererFactory, ICellRenderer, IGroupCellRenderer, ISummaryRenderer} from './interfaces';
import {renderMissingDOM} from './missing';
import {noop, noRenderer} from './utils';
import LinkColumn from '../model/LinkColumn';

export default class ImageCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Image';

  canRender(col: Column, mode: ERenderMode): boolean {
    return col instanceof LinkColumn && mode === ERenderMode.CELL;
  }

  create(col: LinkColumn): ICellRenderer {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        const v = col.getLink(d);
        n.title = v ? v.alt : '';
        n.style.backgroundImage = missing || !v ? null : `url('${v.href}')`;
      },
      render: noop
    };
  }

  createGroup(): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
