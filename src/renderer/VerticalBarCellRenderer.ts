import ICellRendererFactory from './ICellRendererFactory';
import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import Column from '../model/Column';
import {attr, forEachChild} from '../utils';

export default class VerticalBarCellRenderer implements ICellRendererFactory {
  createDOM(col: INumbersColumn & Column): IDOMCellRenderer {
    const colorScale = col.getRawColorScale();
    const domain = col.getMapping().domain;
    const threshold = col.getThreshold();
    const range = domain[1] - domain[0];

    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      template: `<div>${templateRows}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const data = col.getRawNumbers(d.v, d.dataIndex);

        forEachChild(n, (d, i) => {
          const v = data[i];
          const top = v < threshold ? v : threshold;
          const height = v < threshold ? (threshold - v) : (v - threshold);
          attr(<HTMLElement>d, {
            title: NumbersColumn.DEFAULT_FORMATTER(v)
          }, {
            'background-color': colorScale(v),
            height: `${Math.round(100 * top / range)}%`,
            top: `${Math.round(100 * height / range)}%`
          });
        });
      }
    };
  }

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    const colorScale = col.getRawColorScale();
    const cellDimension = context.colWidth(col) / col.getDataLength();
    const domain = col.getMapping().domain;
    const threshold = col.getThreshold();
    const range = domain[1] - domain[0];

    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getRawNumbers(d.v, d.dataIndex);
      const rowHeight = context.rowHeight(i);
      const scale = rowHeight / range;
      data.forEach((v, j) => {
        const top = v < threshold ? v : threshold;
        const height = v < threshold ? (threshold - v) : (v - threshold);
        const xpos = (j * cellDimension);
        ctx.fillStyle = colorScale(v);
        ctx.fillRect(xpos, top * scale, cellDimension, height * scale);
      });
    };
  }

}
