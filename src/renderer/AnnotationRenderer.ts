import AnnotateColumn from '../model/AnnotateColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {clipText, showOverlay} from '../utils';
import ICellRendererFactory from './ICellRendererFactory';
import {ANoGroupRenderer} from './ANoGroupRenderer';
import Column from '../model/Column';

export default class AnnotationRenderer extends ANoGroupRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof AnnotateColumn;
  }

  createDOM(col: AnnotateColumn): IDOMCellRenderer {
    return {
      template: `<div class='annotations text'>
        <input class='lu-hover-only'>
        <span class='text lu-not-hover'></span>
       </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const input: HTMLInputElement = <HTMLInputElement>n.firstElementChild!;
        input.onchange = () => {
          col.setValue(d.v, d.dataIndex, input.value);
        };
        input.onclick = (event) => {
          event.stopPropagation();
        };
        n.lastElementChild!.textContent = input.value = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(col: AnnotateColumn, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, _i: number, dx: number, dy: number) => {
      const hovered = context.hovered(d.dataIndex);
      if (!hovered) {
        clipText(ctx, col.getLabel(d.v, d.dataIndex), 0, 0, context.colWidth(col), context.textHints);
        return;
      }
      const overlay = showOverlay(context.bodyDOMElement, context.idPrefix + col.id, dx, dy);
      overlay.style.width = `${context.colWidth(col)}px`;
      overlay.innerHTML = `<input type='text' value='${col.getValue(d.v, d.dataIndex)}' style='width:${context.colWidth(col)}px'>`;
      const input = <HTMLInputElement>overlay.childNodes[0];
      input.onchange = function () {
        col.setValue(d.v, d.dataIndex, input.value);
      };
      input.onclick = function (event) {
        event.stopPropagation();
      };
    };
  }
}
