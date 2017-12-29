import {ICategoricalColumn, ICategoricalStatistics} from '../../model';
import Column from '../../model/Column';
import {IRankingHeaderContext} from '../interfaces';
import {DENSE_HISTOGRAM} from '../../renderer/HistogramRenderer';
import CategoricalNumberColumn from '../../model/CategoricalNumberColumn';
import CategoricalColumn from '../../model/CategoricalColumn';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../dialogs/AFilterDialog';

export default function summaryCategorical(col: ICategoricalColumn & Column, node: HTMLElement, interactive: boolean, ctx: IRankingHeaderContext) {
  const stats = <ICategoricalStatistics>ctx.statsOf(col);
  const old = node.dataset.summary;

  if (!stats || stats.hist.length > 50) {
    node.innerHTML = '';
    return;
  }
  const cats = col.categories;
  const colors = col.categoryColors;
  const labels = col.categoryLabels;

  node.classList.toggle('lu-dense', cats.length > DENSE_HISTOGRAM);

  if (!old || !old.endsWith('hist')) {
    stats.hist.forEach(({cat, y}) => {
      const i = cats.indexOf(cat);
      node.insertAdjacentHTML('beforeend', `<div title="${labels[i]}: ${y}" data-cat="${cat}" ${interactive ? `data-title="${labels[i]}"` : ''}><div style="height: ${Math.round(y * 100 / stats.maxBin)}%; background-color: ${colors[i]}"></div></div>`);
    });
  } else {
    const bins = <HTMLElement[]>Array.from(node.querySelectorAll('div[data-cat]'));
    for (let i = bins.length; i < stats.hist.length; ++i) {
      node.insertAdjacentHTML('beforeend', `<div data-cat="${stats.hist[i].cat}" ${interactive ? `data-title="${labels[i]}"` : ''}><div style="background-color: ${colors[i]}"></div></div>`);
      const n = <HTMLElement>node.lastElementChild!;
      if (bins.length === 0) {
        node.insertBefore(node.firstElementChild!, n);
      } else {
        node.insertBefore(node.children[i]!, n);
      }
      bins.push(n);
    }
    stats.hist.forEach(({y}, i) => {
      const bin = bins[i];
      (<HTMLElement>bin.firstElementChild!).style.height = `${Math.round(y * 100 / stats.maxBin)}%`;
      bin.title = `${labels[i]}: ${y}`;
    });
  }

  if (!(col instanceof CategoricalColumn || col instanceof CategoricalNumberColumn)) {
    node.dataset.summary = 'hist';
    return;
  }

  node.dataset.summary = interactive ? 'interactive-filter-hist' : 'interactive-hist';
  // make histogram interactive
  const ccol = <CategoricalColumn | CategoricalNumberColumn>col;
  const start = ccol.getFilter();

  let filterMissing: HTMLInputElement | null = null;

  Array.from(node.children).slice(0, cats.length).forEach((bin: HTMLElement, i) => {
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
          filterMissing: filterMissing ? filterMissing.checked : false,
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
        filterMissing: filterMissing ? filterMissing.checked : old.filterMissing,
        filter
      });
    };
  });

  if (!interactive) {
    return;
  }

  if (old !== 'interactive-filter-hist') {
    node.insertAdjacentHTML('beforeend', filterMissingNumberMarkup(start !== null && start.filterMissing, stats.missing));
    filterMissing = <HTMLInputElement>node.querySelector('input');
  } else {
    filterMissing = <HTMLInputElement>node.querySelector('input');
    updateFilterMissingNumberMarkup(<HTMLElement>filterMissing.parentElement, stats.missing);
    filterMissing = <HTMLInputElement>node.querySelector('input');
    filterMissing.checked = start !== null && start.filterMissing;
  }


  filterMissing.onchange = () => {
    // toggle filter
    const old = ccol.getFilter();
    if (old === null) {
      ccol.setFilter({filterMissing: filterMissing!.checked, filter: cats});
    } else {
      ccol.setFilter({filterMissing: filterMissing!.checked, filter: old.filter});
    }
  };
}
