import ICellRendererFactory from './ICellRendererFactory';
import SetColumn from '../model/SetColumn';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {select as d3select} from 'd3';


export default class SetCellRenderer implements ICellRendererFactory {
  private static setPathCalculate(setData: boolean[], cellDimension: number) {

    const catindexes = [];
    setData.forEach((d: boolean, i: number) => (d) ? catindexes.push(i) : -1);

    const left = (catindexes[0] * cellDimension) + (cellDimension / 2);
    const right = (catindexes[catindexes.length - 1] * cellDimension) + (cellDimension / 2);

    return {left, right};
  }


  createSVG(col: SetColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const cellDimension = col.cellDimension();
    return {
      template: `<g class='upsetcell'><path class='upsetpath'></path></g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        const value = col.getBinaryValue(d.v, d.dataIndex);
        const hasTrueValues = value.some((d) => d); //some values are true?

        const circle = d3select(n).selectAll('circle').data(value);
        circle.enter().append('circle');
        circle
          .attr({
            cy: (d, j) => (rowHeight / 2),
            cx: (d, j) => (j * cellDimension) + (cellDimension / 2),
            r: (cellDimension / 4),
            class: (d) => d ? 'setcircle' : 'setcircleOpacity'
          });
        circle.exit().remove();

        let path = '';
        if (hasTrueValues) {
          const pathCordinate = SetCellRenderer.setPathCalculate(value, cellDimension);
          path = `M${pathCordinate.left},${rowHeight / 2}L${pathCordinate.right},${rowHeight / 2}`;
        }
        attr(n.querySelector('path'), {
          d: path
        });
      }
    };
  }

  createCanvas(col: SetColumn, context: ICanvasRenderContext): ICanvasCellRenderer {

    const cellDimension = col.cellDimension();
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      // Circle
      const data = col.getBinaryValue(d.v, d.dataIndex);
      const hasTrueValues = data.some((d) => d); //some values are true?
      const rowHeight = context.rowHeight(i);
      const radius = (rowHeight / 3);

      ctx.save();
      ctx.fillStyle = 'black';
      ctx.strokeStyle = 'black';
      if (hasTrueValues) {
        const pathCordinate = hasTrueValues ? SetCellRenderer.setPathCalculate(data, cellDimension) : null;
        ctx.beginPath();
        ctx.moveTo((pathCordinate.left), (rowHeight / 2));
        ctx.lineTo((pathCordinate.right), (rowHeight / 2));
        ctx.fill();
        ctx.stroke();
      }

      data.forEach((d: boolean, j: number) => {
        const posy = (rowHeight / 2);
        const posx = (j * cellDimension) + (cellDimension / 2);
        ctx.beginPath();
        ctx.globalAlpha = d ? 1 : 0.1;
        ctx.arc(posx, posy, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });

      ctx.restore();
    };
  }

}
