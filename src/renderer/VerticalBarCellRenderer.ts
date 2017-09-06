import NumbersColumn, {INumbersColumn} from '../model/NumbersColumn';
import {ICanvasRenderContext} from './RendererContexts';
import {IDataRow} from '../provider/ADataProvider';
import Column from '../model/Column';
import {attr, forEachChild} from '../utils';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';

export default class VerticalBarCellRenderer extends ANumbersCellRenderer {

  protected createDOMContext(col: INumbersColumn & Column) {
    const colorScale = col.getRawColorScale();
    const domain = col.getMapping().domain;
    const threshold = col.getThreshold();
    const range = domain[1] - domain[0];
    let templateRows = '';
    for (let i = 0; i < col.getDataLength(); ++i) {
      templateRows += `<div style="background-color: white" title=""></div>`;
    }
    return {
      templateRow: templateRows,
      render: (row: HTMLElement, d: IDataRow) => {
        const data = col.getRawNumbers(d.v, d.dataIndex);

        forEachChild(row, (d, i) => {
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

  protected createCanvasContext(col: INumbersColumn & Column, context: ICanvasRenderContext) {
    const colorScale = col.getRawColorScale();
    const cellDimension = context.colWidth(col) / col.getDataLength();
    const domain = col.getMapping().domain;
    const threshold = col.getThreshold();
    const range = domain[1] - domain[0];
    return (ctx: CanvasRenderingContext2D, d: IDataRow, offset: number, rowHeight: number) => {
      const data = col.getRawNumbers(d.v, d.dataIndex);
      const scale = rowHeight / range;
      data.forEach((v, j) => {
        const top = v < threshold ? v : threshold;
        const height = v < threshold ? (threshold - v) : (v - threshold);
        const xpos = (j * cellDimension);
        ctx.fillStyle = colorScale(v);
        ctx.fillRect(xpos, top * scale + offset, cellDimension, height * scale);
      });
    };
  }
}
