import ICellRendererFactory from './ICellRendererFactory';
import {ICategoricalColumn} from '../model/CategoricalColumn';
import Column from '../model/Column';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalColorCellRenderer implements ICellRendererFactory {
  createDOM(col: ICategoricalColumn & Column): IDOMCellRenderer {
    return {
      template: `<div style="background-color: transparent" title=""></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        n.style.backgroundColor = col.getColor(d.v, d.dataIndex);
        n.title = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      ctx.fillStyle = col.getColor(d.v, d.dataIndex) || '';
      ctx.fillRect(0, 0, context.colWidth(col), context.rowHeight(i));
    };
  }
}
