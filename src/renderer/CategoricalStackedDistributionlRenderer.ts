import ICellRendererFactory from './ICellRendererFactory';
import {ICategoricalColumn, isCategoricalColumn} from '../model/ICategoricalColumn';
import Column from '../model/Column';
import {ICanvasRenderContext} from './RendererContexts';
import {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {adaptTextColorToBgColor, forEachChild} from '../utils';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import {computeHist} from '../provider/math';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalStackedDistributionlRenderer implements ICellRendererFactory {
  readonly title = 'Distribution Bar';

  canRender(col: Column, asGroup: boolean) {
    return isCategoricalColumn(col) && asGroup;
  }

  createGroupDOM(col: ICategoricalColumn & Column): IDOMGroupRenderer {
    const colors = col.categoryColors;
    const labels = col.categoryLabels;
    const bins = col.categories.map((c, i) => `<div style="background-color: ${colors[i]}; color: ${adaptTextColorToBgColor(colors[i])}" title="${labels[i]}: 0" data-cat="${c}"><span>${labels[i]}</span></div>`).join('');

    return {
      template: `<div>${bins}<div title="Missing Values"></div></div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {hist, missing} = computeHist(rows, rows.map((r) => r.dataIndex), (r: IDataRow) => col.getCategories(r.v, r.dataIndex), col.categories);

        const total = hist.reduce((acc, {y}) => acc + y, missing);
        forEachChild(n, (d: HTMLElement, i) => {
          let y: number;
          let label: string;
          if (i >= hist.length) {
            y = missing;
            label = 'Missing Values';
          } else {
            y = hist[i].y;
            label = labels[i];
          }
          d.style.flexGrow = `${Math.round(total === 0 ? 0 : y)}`;
          d.title = `${label}: ${y}`;
        });
      }
    };
  }

  createGroupCanvas(col: ICategoricalColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const padding = context.option('rowBarPadding', 1);
    const colors = col.categoryColors;

    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      const {missing, hist} = computeHist(rows, rows.map((r) => r.dataIndex), (r: IDataRow) => col.getCategories(r.v, r.dataIndex), col.categories);

      const total = hist.reduce((acc, {y}) => acc + y, missing);
      const height = context.groupHeight(group) - padding;
      const width = context.colWidth(col);
      let acc = padding;
      hist.forEach(({y}, i) => {
        const wi = (y / total) * width;
        ctx.fillStyle = colors[i];
        ctx.fillRect(acc, padding, wi, height);
        acc += wi;
      });
    };
  }
}
