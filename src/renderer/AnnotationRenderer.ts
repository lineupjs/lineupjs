import AnnotateColumn from '../model/AnnotateColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer, IHTMLCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {showOverlay, clipText} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';

export default class AnnotationRenderer implements ICellRendererFactory {
  createSVG(col: AnnotateColumn, context: IDOMRenderContext): ISVGCellRenderer {
    return {
      template: `<g class='annotations'>
        <text class='notHoverOnly text' clip-path='url(#cp${context.idPrefix}clipCol${col.id})'></text>
        <foreignObject class='hoverOnly' x='-2' y='-2'>
          <input type='text'>
        </foreignObject>
       </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const input: HTMLInputElement = <HTMLInputElement>n.querySelector('foreignObject *');
        input.onchange = function () {
          col.setValue(d.v, d.dataIndex, input.value);
        };
        input.onclick = function (event) {
          event.stopPropagation();
        };
        input.style.width = col.getWidth() + 'px';
        input.value = col.getLabel(d.v, d.dataIndex);

        n.querySelector('text').textContent = col.getLabel(d.v, d.dataIndex);
        const f = n.querySelector('foreignObject');
        f.setAttribute('width', String(col.getWidth()));
        f.setAttribute('height', String(context.rowHeight(i)));
      }
    };
  }

  createHTML(col: AnnotateColumn): IHTMLCellRenderer {
    return {
      template: `<div class='annotations text'>
        <input type='text' class='hoverOnly'>
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
        n.style.width = input.style.width = col.getWidth() + 'px';
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
        overlay.innerHTML = `<input type='text' value='${col.getValue(d.v, d.dataIndex)}' style='width:${col.getWidth()}px'>`;
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
