/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column, {ICategoricalStatistics, IStatistics} from '../../model/Column';
import {default as CategoricalColumn} from '../../model/CategoricalColumn';
import {ICategoricalColumn} from '../../model/ICategoricalColumn';
import NumberColumn, {INumberColumn, isMapAbleColumn} from '../../model/NumberColumn';
import SelectionColumn from '../../model/SelectionColumn';
import StringColumn from '../../model/StringColumn';
import CategoricalNumberColumn from '../../model/CategoricalNumberColumn';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../../dialogs/AFilterDialog';
import {stringFilter} from '../../dialogs/StringFilterDialog';
import {behavior, DragEvent, event as d3event, select, selectAll} from 'd3';
import {round} from '../../utils';
import {IRankingHeaderContext} from './interfaces';
import AggregateGroupColumn from '../../model/AggregateGroupColumn';
import {ISummaryFunction} from '../interfaces';
import {DENSE_HISTOGRAM} from '../../renderer/HistogramRenderer';

export const defaultSummaries: {[key: string]: ISummaryFunction} = {
  stringLike: summaryString,
  categoricalLike: summaryCategorical,
  numberLike: summaryNumerical,
  selection: summarySelection,
  aggregate: summaryAggregation
};

function summaryCategorical(col: ICategoricalColumn & Column, node: HTMLElement, interactive: boolean, ctx: IRankingHeaderContext) {
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
    for(let i = bins.length; i < stats.hist.length; ++i) {
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

function summaryNumerical(col: INumberColumn & Column, node: HTMLElement, interactive: boolean, ctx: IRankingHeaderContext) {
  const stats = <IStatistics>ctx.statsOf(col);
  const old = node.dataset.summary;

  if (!stats) { // no reason to render more than 20 categories
    node.innerHTML = '';
    return;
  }

  node.classList.toggle('lu-dense', stats.hist.length > DENSE_HISTOGRAM);

  if (!interactive || !(col instanceof NumberColumn)) {
    node.dataset.summary = 'hist';
    node.innerHTML = '';
    stats.hist.forEach(({x, y}, i) => {
      node.insertAdjacentHTML('beforeend', `<div title="Bin ${i}: ${y}" data-x="${x}"><div style="height: ${Math.round(y * 100 / stats.maxBin)}%; background-color: ${col.getMetaData().color};"></div></div>`);
    });
    if (isMapAbleColumn(col)) {
      const range = col.getRange();
      node.insertAdjacentHTML('beforeend', `<span>${range[0]}</span><span>${range[1]}</span>`);
    }
    return;
  }

  const ncol = <NumberColumn>col;
  const filter = ncol.getFilter();
  const domain = ncol.getMapping().domain;
  const percent = (v: number) => 100 * (v - domain[0]) / (domain[1] - domain[0]);
  const filterMin = isFinite(filter.min) ? filter.min : domain[0];
  const filterMax = isFinite(filter.max) ? filter.max : domain[1];

  if (old === 'slider-hist') {
    const bins = <HTMLElement[]>Array.from(node.querySelectorAll('div[data-x]'));
    for(let i = bins.length; i < stats.hist.length; ++i) {
      node.insertAdjacentHTML('afterbegin', `<div><div></div></div>`);
      bins.unshift(<HTMLElement>node.firstElementChild!);
    }
    stats.hist.forEach(({x, y}, i) => {
      const bin = bins[i];
      const inner = <HTMLElement>bin.firstElementChild!;
      inner.style.height = `${Math.round(y * 100 / stats.maxBin)}%`;
      inner.style.backgroundColor = col.getMetaData().color;
      bin.title = `Bin ${i}: ${y}`;
      bin.dataset.x = String(x);
    });

    const filterMissingBefore = <HTMLInputElement>node.querySelector('input');
    updateFilterMissingNumberMarkup(<HTMLElement>filterMissingBefore.parentElement, stats.missing);
  } else {
    node.dataset.summary = 'slider-hist';
    stats.hist.forEach(({x, y}, i) => {
      node.insertAdjacentHTML('beforeend', `<div title="Bin ${i}: ${y}" data-x="${x}"><div style="height: ${Math.round(y * 100 / stats.maxBin)}%"></div></div>`);
    });

    node.insertAdjacentHTML('beforeend', `
      <div data-handle="min-hint" style="width: ${Math.round(percent(filterMin))}%"></div>
      <div data-handle="max-hint" style="width: ${Math.round(100 - percent(filterMax))}%"></div>
      <div data-handle="min" data-value="${round(filterMin, 2)}" style="left: ${Math.round(percent(filterMin))}%"></div>
      <div data-handle='max' data-value="${round(filterMax, 2)}" style="right: ${Math.round(100 - percent(filterMax))}%"></div>
      ${filterMissingNumberMarkup(filter.filterMissing, stats.missing)}
    `);
  }

  const min = <HTMLElement>node.querySelector('[data-handle=min]');
  const max = <HTMLElement>node.querySelector('[data-handle=max]');
  const minHint = <HTMLElement>node.querySelector('[data-handle=min-hint]');
  const maxHint = <HTMLElement>node.querySelector('[data-handle=max-hint]');
  const filterMissing = <HTMLInputElement>node.querySelector('input');

  if (old === 'slider-hist') {
    // just update
    minHint.style.width = `${Math.round(percent(filterMin))}%`;
    maxHint.style.width = `${Math.round(100 - percent(filterMax))}%`;
    min.dataset.value= round(filterMin, 2).toString();
    max.dataset.value = round(filterMax, 2).toString();
    min.style.left = `${Math.round(percent(filterMin))}%`;
    max.style.right = `${Math.round(100 - percent(filterMax))}%`;
    filterMissing.checked = filter.filterMissing;
    return;
  }


  const update = () => {
    const domain = ncol.getMapping().domain;
    const unpercent = (v: number) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
    const minValue = unpercent(parseFloat(min.style.left!));
    const maxValue = unpercent(100 - parseFloat(max.style.right!));
    ncol.setFilter({
      filterMissing: filterMissing.checked,
      min: Math.abs(minValue - domain[0]) < 0.001 ? NaN : minValue,
      max: Math.abs(maxValue - domain[1]) < 0.001 ? NaN : maxValue
    });
  };

  filterMissing.onchange = () => update();

  selectAll([min, max]).call(behavior.drag()
    .on('dragstart', function (this: HTMLElement) {
      select(this).classed('lu-dragging', true);
    })
    .on('drag', function (this: HTMLElement) {
      const evt = (<DragEvent>d3event);
      const total = node.clientWidth;
      const px = Math.max(0, Math.min(evt.x, total));
      const percent = Math.round(100 * px / total);
      const domain = ncol.getMapping().domain;
      const unpercent = (v: number) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
      this.dataset.value = round(unpercent(percent), 2).toString();

      if (this.dataset.handle === 'min') {
        this.style.left = `${percent}%`;
        minHint.style.width = `${percent}%`;
        return;
      }
      this.style.right = `${100 - percent}%`;
      maxHint.style.width = `${100 - percent}%`;
    })
    .on('dragend', function (this: HTMLElement) {
      select(this).classed('lu-dragging', false);
      update();
    }));
}

export function summaryString(col: StringColumn, node: HTMLElement, interactive: boolean) {
  const old = node.dataset.summary;
  node.dataset.summary = 'string';
  if (!interactive) {
    const filter = col.getFilter() || '';
    node.textContent = filter === StringColumn.FILTER_MISSING ? '' : String(filter);
    return;
  }
  const base = stringFilter(col);
  if (old === 'string') {
    base.update(node);
    return;
  }
  // init
  node.innerHTML = base.template;
  base.init(node);
}

function summarySelection(col: SelectionColumn, node: HTMLElement, _interactive: boolean, ctx: IRankingHeaderContext) {
  const provider = ctx.provider;
  const old = node.dataset.summary;
  node.dataset.summary = 'selection';
  if (old !== 'selection') {
    //init
    node.innerHTML = `<i class='fa fa-square-o' title='(Un)Select All'></i>`;
  }
  const button = (<HTMLElement>node.firstElementChild);
  button.onclick = (evt) => {
    evt.stopPropagation();
    if (button.classList.contains('fa-square-o')) {
      provider.selectAllOf(col.findMyRanker()!);
    } else {
      provider.setSelection([]);
    }
    button.classList.toggle('fa-square-o');
    button.classList.toggle('fa-check-square-o');
  };
}

function summaryAggregation(col: AggregateGroupColumn, node: HTMLElement, _interactive: boolean, ctx: IRankingHeaderContext) {
  const old = node.dataset.summary;
  node.dataset.summary = 'aggregation';
  if (old !== 'aggregation') {
    //init
    let defaultValue = 'down';
    const ranking = col.findMyRanker();
    if (ranking) {
      const all = ranking.getGroups().every((g) => col.isAggregated(g));
      if (all) {
        defaultValue = 'right';
      }
    }
    node.innerHTML = `<i class='fa fa-caret-${defaultValue}' title='(Un)Aggregate All'></i>`;
  }
  const button = (<HTMLElement>node.firstElementChild);
  button.onclick = (evt) => {
    evt.stopPropagation();
    const ranking = col.findMyRanker();
    if (!ranking) {
      return;
    }
    const aggregate = button.classList.contains('fa-caret-down');
    button.classList.toggle('fa-caret-down');
    button.classList.toggle('fa-caret-right');
    ctx.provider.aggregateAllOf(ranking, aggregate);
  };
}
