import {IDataRow} from '../model';
import Column from '../model/Column';
import StringColumn from '../model/StringColumn';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noRenderer} from './utils';

/** @internal */
export default class ImageCellRenderer implements ICellRendererFactory {
  readonly title = 'Image';

  canRender(col: Column, mode: ERenderMode) {
    return col instanceof StringColumn && mode === ERenderMode.CELL;
  }

  create(col: StringColumn) {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d);
        n.style.backgroundImage = missing ? null : `url('${col.getValue(d)}')`;
      }
    };
  }

  createGroup() {
    return noRenderer;
  }

  createSummary() {
    return noRenderer;
  }
}
