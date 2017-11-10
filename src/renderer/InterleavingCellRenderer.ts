import ICellRendererFactory from './ICellRendererFactory';
import IDOMCellRenderer from './IDOMCellRenderers';
import {renderMissingDOM} from './missing';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import {createData} from './MultiLevelCellRenderer';
import {IDOMRenderContext} from './RendererContexts';
import {IDataRow} from '../provider/ADataProvider';
import Column from '../model/Column';


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
      template: `<div>${cols.map((c) => c.renderer.template).join('')}</div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const missing = renderMissingDOM(n, col, d);
        if (missing) {
          return;
        }
        Array.from(n.children).forEach((ni, j) => {
          cols[j]!.renderer.update(ni, d, i);
        });
      }
    };
  }
}
