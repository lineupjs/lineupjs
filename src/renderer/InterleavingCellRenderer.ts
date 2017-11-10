import ICellRendererFactory from './ICellRendererFactory';
import IDOMCellRenderer from './IDOMCellRenderers';
import {renderMissingDOM} from './missing';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import {createData} from './MultiLevelCellRenderer';
import {IDataRow} from '../provider/ADataProvider';
import Column from '../model/Column';
import BarCellRenderer from './BarCellRenderer';
import {IGroup} from '../model/Group';
import {matchColumns} from '../utils';
import {IDOMRenderContext} from './RendererContexts';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class InterleavingCellRenderer implements ICellRendererFactory {
  readonly title = 'Interleaving';

  canRender(col: Column) {
    return col instanceof CompositeNumberColumn;
  }

  createDOM(col: CompositeNumberColumn, context: IDOMRenderContext): IDOMCellRenderer {
    const {cols} = createData(col, context, false);
    return {
      template: `<div>${cols.map((r) => r.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number, group: IGroup) => {
        const missing = renderMissingDOM(n, col, d);
        if (missing) {
          return;
        }
        matchColumns(n, cols, 'detail', 'html');
        Array.from(n.children).forEach((ni: HTMLElement, j) => {
          cols[j].renderer.update(ni, d, i, group);
        });
      }
    };
  }
}
