import {computeHist} from '../internal/math';
import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import Column from '../model/Column';
import {ICellRendererFactory} from './interfaces';
import {forEachChild, noRenderer} from './utils';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalStackedDistributionlRenderer implements ICellRendererFactory {
  readonly title = 'Distribution Bar';

  canRender(col: Column, asGroup: boolean) {
    return isCategoricalColumn(col) && asGroup;
  }

  create() {
    return noRenderer;
  }

  createGroup(col: ICategoricalColumn & Column) {
    const colors = col.categoryColors;
    const labels = col.categoryLabels;
    const bins = col.categories.map((c, i) => `<div style="background-color: ${colors[i]}" title="${labels[i]}: 0" data-cat="${c}">${labels[i]}</div>`).join('');

    return {
      template: `<div>${bins}<div title="Missing Values"></div></div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {hist, missing} = computeHist(rows, (r: IDataRow) => col.getCategories(r), col.categories);

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
}
