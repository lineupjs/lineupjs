import {computeHist, ICategoricalStatistics} from '../internal/math';
import {ICategoricalColumn, IDataRow, IGroup, isCategoricalColumn} from '../model';
import CategoricalColumn from '../model/CategoricalColumn';
import Column from '../model/Column';
import OrdinalColumn from '../model/OrdinalColumn';
import CategoricalCellRenderer from './CategoricalCellRenderer';
import {default as IRenderContext, ERenderMode, ICellRendererFactory} from './interfaces';
import {forEachChild, noRenderer} from './utils';

/**
 * renders categorical columns as a colored rect with label
 */
export default class CategoricalStackedDistributionlCellRenderer implements ICellRendererFactory {
  readonly title = 'Distribution Bar';

  canRender(col: Column, mode: ERenderMode) {
    return isCategoricalColumn(col) && mode !== ERenderMode.CELL;
  }

  create() {
    return noRenderer;
  }

  private static stackedBar(col: ICategoricalColumn) {
    const cats = col.categories;
    const bins = cats.map((c) => `<div style="background-color: ${c.color}" title="${c.label}: 0" data-cat="${c.name}">${c.label}</div>`).join('');

    return {
      template: `<div>${bins}<div title="Missing Values"></div></div>`,
      update: (n: HTMLElement, hist: { cat: string; y: number }[], missing: number) => {
        const total = hist.reduce((acc, {y}) => acc + y, missing);
        forEachChild(n, (d: HTMLElement, i) => {
          let y: number;
          let label: string;
          if (i >= hist.length) {
            y = missing;
            label = 'Missing Values';
          } else {
            y = hist[i].y;
            label = cats[i].label;
          }
          d.style.flexGrow = `${Math.round(total === 0 ? 0 : y)}`;
          d.title = `${label}: ${y}`;
        });
      }
    };
  }

  createGroup(col: ICategoricalColumn) {
    const {template, update} = CategoricalStackedDistributionlCellRenderer.stackedBar(col);
    return {
      template,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const {hist, missing} = computeHist(rows, (r: IDataRow) => col.isMissing(r) ? '' : col.getCategory(r)!.name, col.categories.map((d) => d.name));
        update(n, hist, missing);
      }
    };
  }

  createSummary(col: ICategoricalColumn, _context: IRenderContext, _interactive: boolean) {
    const {template, update} = CategoricalStackedDistributionlCellRenderer.stackedBar(col);
    let filterUpdate: ()=>void;
    return {
      template,
      update: (n: HTMLElement, hist: ICategoricalStatistics | null) => {

        if (col instanceof CategoricalColumn || col instanceof OrdinalColumn) {
          if (!filterUpdate) {
            filterUpdate = CategoricalCellRenderer.interactiveHist(col, n);
          }
          filterUpdate();
        }
        // TODO full interactive

        n.style.display = hist ? null : 'none';
        if (!hist) {
          return;
        }
        update(n, hist.hist, hist.missing);
      }
    };
  }
}
