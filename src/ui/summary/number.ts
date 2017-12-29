import {INumberColumn, IStatistics} from '../../model';
import Column from '../../model/Column';
import {IRankingHeaderContext} from '../interfaces';
import {DENSE_HISTOGRAM} from '../../config';
import NumberColumn, {isMapAbleColumn} from '../../model/NumberColumn';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../missing';
import {round} from '../../internal/math';
import {D3DragEvent, drag} from 'd3-drag';
import {selectAll, event as d3event} from 'd3-selection';

export default function summaryNumerical(col: INumberColumn & Column, node: HTMLElement, interactive: boolean, ctx: IRankingHeaderContext) {
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
    stats.hist.forEach(({x0, length}, i) => {
      node.insertAdjacentHTML('beforeend', `<div title="Bin ${i}: ${length}" data-x="${x0}"><div style="height: ${Math.round(length * 100 / stats.maxBin)}%; background-color: ${col.getMetaData().color};"></div></div>`);
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
    stats.hist.forEach(({x0, length}, i) => {
      const bin = bins[i];
      const inner = <HTMLElement>bin.firstElementChild!;
      inner.style.height = `${Math.round(length * 100 / stats.maxBin)}%`;
      inner.style.backgroundColor = col.getMetaData().color;
      bin.title = `Bin ${i}: ${length}`;
      bin.dataset.x = String(x0);
    });

    const filterMissingBefore = <HTMLInputElement>node.querySelector('input');
    updateFilterMissingNumberMarkup(<HTMLElement>filterMissingBefore.parentElement, stats.missing);
  } else {
    node.dataset.summary = 'slider-hist';
    stats.hist.forEach(({x0, length}, i) => {
      node.insertAdjacentHTML('beforeend', `<div title="Bin ${i}: ${length}" data-x="${x0}"><div style="height: ${Math.round(length * 100 / stats.maxBin)}%"></div></div>`);
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

  selectAll([min, max]).call(drag()
    .on('start', function (this: HTMLElement) {
      this.classList.add('lu-dragging');
    })
    .on('drag', function (this: HTMLElement) {
      const evt = (<D3DragEvent<any, any, any>>d3event);
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
    .on('end', function (this: HTMLElement) {
      this.classList.remove('lu-dragging');
      update();
    }));
}
