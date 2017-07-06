import AnnotateColumn from '../model/AnnotateColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {showOverlay, clipText, attr, setText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';

export default class AnnotationRenderer implements ICellRendererFactory {
  createDOM(col: AnnotateColumn): IDOMCellRenderer {
    return {
      template: `<div class='annotations text'>
        <input class='hoverOnly'>
        <span class='text notHoverOnly'></span>
       </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const input: HTMLInputElement = <HTMLInputElement>n.querySelector('input');
        input.onchange = function () {
          col.setValue(d.v, d.dataIndex, input.value);
        };
        input.onclick = function (event) {
          event.stopPropagation();
        };
        input.value = col.getLabel(d.v, d.dataIndex);
        n.querySelector('span').textContent = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: AnnotateColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number) => {
      const hovered = context.hovered(d.dataIndex);
      if (hovered) {
        const overlay = showOverlay(context.bodyDOMElement, context.idPrefix + col.id, dx, dy);
        overlay.style.width = col.getWidth() + 'px';
        overlay.innerHTML = `<input type='text' value='${col.getValue(d.v, d.dataIndex)}' style='width:${col.getActualWidth()}px'>`;
        const input = <HTMLInputElement>overlay.childNodes[0];
        input.onchange = function () {
          col.setValue(d.v, d.dataIndex, input.value);
        };
        input.onclick = function (event) {
          event.stopPropagation();
        };
      } else {
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, col.getWidth(), context.textHints);
      }
    };
  }
}
