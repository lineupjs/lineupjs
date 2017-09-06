import ICellRendererFactory from './ICellRendererFactory';
import Column, {IStatistics} from '../model/Column';
import {INumberColumn} from '../model/NumberColumn';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import {computeStats, getNumberOfBins} from '../provider/math';
import {forEachChild} from '../utils';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class HistogramGroupRenderer implements ICellRendererFactory {
  createGroupDOM(col: INumberColumn & Column, context: IDOMRenderContext): IDOMGroupRenderer {
    const guessedBins = getNumberOfBins(context.totalNumberOfRows);
    let bins = '';
    for (let i = 0; i < guessedBins; ++i) {
      bins += `<div style="height: 0" title="Bin ${i}: 0"></div>`;
    }
    return {
      template: `<div>${bins}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[], globalHist: IStatistics | null) => {
        const bins = globalHist ? globalHist.hist.length : guessedBins;
        const {maxBin, hist} = computeStats(rows, rows.map((r) => r.dataIndex), (r: IDataRow) => col.getNumber(r.v, r.dataIndex), [0, 1], bins);

        const max = Math.max(maxBin, globalHist ? globalHist.maxBin : 0);

        //adapt the number of children
        if (n.children.length !== bins) {
          let bins = '';
          for (let i = 0; i < guessedBins; ++i) {
            bins += `<div style="height: 0" title="Bin ${i}: 0"></div>`;
          }
          n.innerHTML = bins;
        }
        forEachChild(n, (d: HTMLElement, i) => {
          const {x, dx, y} = hist[i];
          d.style.height = `${Math.round(y * 100 / max)}%`;
          d.title = `${x} - ${x + dx} (${y})`;
        });
      }
    };
  }

  createGroupCanvas(col: INumberColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const guessedBins = getNumberOfBins(context.totalNumberOfRows);
    const padding = context.option('rowBarPadding', 1);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], _dx: number, _dy: number, globalHist: IStatistics | null) => {
      const total = context.groupHeight(group) - padding;
      const bins = globalHist ? globalHist.hist.length : guessedBins;
      const widthPerBin = context.colWidth(col) / bins;
      const {maxBin, hist} = computeStats(rows, rows.map((r) => r.dataIndex), (r: IDataRow) => col.getNumber(r.v, r.dataIndex), [0, 1], bins);
      const max = Math.max(maxBin, globalHist ? globalHist.maxBin : 0);

      ctx.fillStyle = context.option('style.histogram', 'lightgray');
      hist.forEach(({y}, i) => {
        const height = (y / max) * total;
        ctx.fillRect(i * widthPerBin + padding, (total - height) + padding, widthPerBin - 2 * padding, height);
      });
    };
  }
}
