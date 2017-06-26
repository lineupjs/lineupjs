import ICellRendererFactory from './ICellRendererFactory';
import {IDOMRenderContext, ICanvasRenderContext} from './RendererContexts';
import {ISVGCellRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, forEach} from '../utils';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {ICategoricalColumn} from '../model/CategoricalColumn';
import Column from '../model/Column';


export default class UpSetCellRenderer implements ICellRendererFactory {
  private static calculateSetPath(setData: boolean[], cellDimension: number) {

    const catindexes = [];
    setData.forEach((d: boolean, i: number) => (d) ? catindexes.push(i) : -1);

    const left = (catindexes[0] * cellDimension) + (cellDimension / 2);
    const right = (catindexes[catindexes.length - 1] * cellDimension) + (cellDimension / 2);

    return {left, right};
  }


  createSVG(col: ICategoricalColumn&Column, context: IDOMRenderContext): ISVGCellRenderer {
    const dataLength = col.categories.length;
    const cellDimension = col.getWidth() / dataLength;
    let templateRows = '';
    for (let i = 0; i < dataLength; ++i) {
      templateRows += `<circle r="${cellDimension / 4}" cx="${i * cellDimension + (cellDimension / 2)}"></circle>`;
    }
    return {
      template: `<g class='upsetcell'><path></path>${templateRows}</g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const rowHeight = context.rowHeight(i);
        const values = new Set(col.getCategories(d.v, d.dataIndex));
        const value = col.categories.map((cat) => values.has(cat));
        const hasTrueValues = value.some((d) => d); //some values are true?

        forEach(n, 'circle', (d, i) => {
          const v = value[i];
          attr(<SVGCircleElement>d, {
            cy: rowHeight / 2,
            class: v ? 'enabled' : ''
          });
        });

        let path = '';
        if (hasTrueValues) {
          const {left, right} = UpSetCellRenderer.calculateSetPath(value, cellDimension);
          path = `M${left},${rowHeight / 2}L${right},${rowHeight / 2}`;
        }
        n.querySelector('path').setAttribute('d', path);
      }
    };
  }

  createCanvas(col: ICategoricalColumn&Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const dataLength = col.categories.length;
    const cellDimension = col.getWidth() / dataLength;

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      // Circle
      const values = new Set(col.getCategories(d.v, d.dataIndex));
      const data = col.categories.map((cat) => values.has(cat));
      const hasTrueValues = data.some((d) => d); //some values are true?
      const rowHeight = context.rowHeight(i);
      const radius = (rowHeight / 3);

      ctx.save();
      ctx.fillStyle = 'black';
      ctx.strokeStyle = 'black';
      if (hasTrueValues) {
        const {left, right} = UpSetCellRenderer.calculateSetPath(data, cellDimension);
        ctx.beginPath();
        ctx.moveTo(left, rowHeight / 2);
        ctx.lineTo(right, rowHeight / 2);
        ctx.stroke();
      }

      data.forEach((d, j) => {
        const posy = (rowHeight / 2);
        const posx = (j * cellDimension) + (cellDimension / 2);
        ctx.beginPath();
        ctx.globalAlpha = d ? 1 : 0.1;
        ctx.arc(posx, posy, radius, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.restore();
    };
  }

}
