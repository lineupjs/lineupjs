/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../..//model/Column';
import {default as CategoricalColumn, ICategoricalColumn, isCategoricalColumn} from '../../model/CategoricalColumn';
import {ICategoricalStatistics, IStatistics} from '../../model/Column';
import {isNumberColumn} from '../../model/NumberColumn';
import SelectionColumn from '../../model/SelectionColumn';
import StringColumn from '../../model/StringColumn';
import {IDataProvider} from '../../provider/ADataProvider';
import {IRankingHeaderContext} from './RenderColumn';
import CategoricalNumberColumn from '../../model/CategoricalNumberColumn';
import {stringFilter} from '../../dialogs/StringFilterDialog';

export default function createSummary(node: HTMLElement, col: Column, ctx: IRankingHeaderContext, interactive: boolean = false) {
  if (col instanceof StringColumn) {
    summaryString(col, node, interactive);
  } else if (isCategoricalColumn(col)) {
    summaryCategorical(col, node, <ICategoricalStatistics>ctx.statsOf(col), interactive);
  } else if (isNumberColumn(col)) {
    summaryNumerical(node, <IStatistics>ctx.statsOf(col), interactive);
  } else if (col instanceof SelectionColumn) {
    summarySelection(col, node, ctx.provider);
  }
}

function summaryCategorical(col: ICategoricalColumn & Column, node: HTMLElement, stats: ICategoricalStatistics, withLabels: boolean) {
  node.innerHTML = '';
  if (!stats) {
    return;
  }
  node.dataset.summary = 'hist';
  const cats = col.categories;
  const colors = col.categoryColors;
  const labels = col.categoryLabels;

  stats.hist.forEach(({cat, y}) => {
    const i = cats.indexOf(cat);
    node.insertAdjacentHTML('beforeend', `<div style="height: ${Math.round(y * 100 / stats.maxBin)}%; background-color: ${colors[i]}" title="${labels[i]}: ${y}" data-cat="${cat}" ${withLabels ? `data-title="${labels[i]}"`:''}></div>`);
  });

  if (!(col instanceof CategoricalColumn || col instanceof CategoricalNumberColumn)) {
    return;
  }
  node.dataset.summary = 'interactive-hist';
  // make histogram interactive
  const ccol = <CategoricalColumn|CategoricalNumberColumn>col;
  const start = ccol.getFilter();

  Array.from(node.children).forEach((bin: HTMLElement, i) => {
    const cat = bin.dataset.cat!;
    bin.dataset.filtered = CategoricalColumn.filter(start, cat) ? '' : 'filtered';
    bin.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      // toggle filter
      const old = ccol.getFilter();
      if (old === null || !Array.isArray(old.filter)) {
        // deselect
        const without = cats.slice();
        bin.dataset.filtered = 'filtered';
        without.splice(i, 1);
        ccol.setFilter({
          filterMissing: false,
          filter: without
        });
        return;
      }
      const filter = old.filter.slice();
      const contained = filter.indexOf(cat);
      if (contained >= 0) {
        // remove
        bin.dataset.filtered = 'filtered';
        filter.splice(contained, 1);
      } else {
        // readd
        bin.dataset.filtered = '';
        filter.push(cat);
      }
      ccol.setFilter({
        filterMissing: old.filterMissing,
        filter
      });
    };
  });
}

function summaryNumerical(node: HTMLElement, stats: IStatistics, interactive: boolean) {
  node.innerHTML = '';
  if (!stats) {
    return;
  }
  node.dataset.summary = 'hist';
  stats.hist.forEach(({x, y}, i) => {
    node.insertAdjacentHTML('beforeend', `<div style="height: ${Math.round(y * 100 / stats.maxBin)}%" title="Bin ${i}: ${y}" data-x="${x}"></div>`);
  });

  if (interactive) {
    // TODO add handler
  }
}

export function summaryString(col: StringColumn, node: HTMLElement, interactive: boolean) {
  if (!interactive) {
    const filter = col.getFilter() || '';
    node.textContent = filter === StringColumn.FILTER_MISSING ? '' : String(filter);
    return;
  }

  const base = stringFilter(col);

  node.innerHTML = base.template;
  base.init(node);
}

function summarySelection(col: SelectionColumn, node: HTMLElement, provider: IDataProvider) {
  node.innerHTML = `<i class="fa fa-square-o" title="(Un)Select All"></i>`;
  const button = (<HTMLElement>node.firstElementChild);
  button.onclick = (evt) => {
    evt.stopPropagation();
    if (button.classList.contains('fa-square-o')) {
      const order = (col.findMyRanker()!).getOrder();
      provider.setSelection(order);
    } else {
      provider.setSelection([]);
    }
    button.classList.toggle('fa-square-o');
    button.classList.toggle('fa-check-square-o');
  };
}
