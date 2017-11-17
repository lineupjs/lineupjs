import {ICanvasRenderContext} from './RendererContexts';
import Column from '../model/Column';
import {attr, forEachChild} from '../utils';
import {ANumbersCellRenderer} from './ANumbersCellRenderer';
import {DEFAULT_FORMATTER, INumbersColumn} from '../model/INumberColumn';

export default class VerticalBarCellRenderer extends ANumbersCellRenderer {
  readonly title = 'Bar Chart';

  canRender(col: Column, isGroup: boolean) {
    return super.canRender(col, isGroup) && !isGroup;
  }

  private static compute(v: number, threshold: number, domain: number[]) {
    if (v < threshold) {
      //threshold to down
      return {height: (threshold - v), bottom: (v - domain[0])};
    }
    //from top to down
    return {height: (v - threshold), bottom: (threshold - domain[0])};
  }

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
      render: (row: HTMLElement, data: number[]) => {
        forEachChild(row, (d, i) => {
          const v = data[i];
          const {bottom, height} = VerticalBarCellRenderer.compute(v, threshold, domain);
          attr(<HTMLElement>d, {
            title: DEFAULT_FORMATTER(v)
          }, {
            'background-color': colorScale(v ),
            bottom: `${Math.round((100 * bottom) / range)}%`,
            height: `${Math.round((100 * height) / range)}%`
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
    return (ctx: CanvasRenderingContext2D, data: number[], offset: number, rowHeight: number) => {
      const scale = rowHeight / range;
      data.forEach((v, j) => {
        ctx.fillStyle = colorScale(v);
        const xpos = (j * cellDimension);
        const {bottom, height} = VerticalBarCellRenderer.compute(v, threshold, domain);
        ctx.fillRect(xpos, (range - height - bottom) * scale + offset, cellDimension, height * scale);
      });
    };
  }
}
