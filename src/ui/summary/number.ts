import {D3DragEvent, drag} from 'd3-drag';
import {event as d3event, selectAll} from 'd3-selection';
import {DENSE_HISTOGRAM} from '../../config';
import {ICategoricalStatistics, IStatistics, round} from '../../internal/math';
import {INumberColumn} from '../../model';
import Column from '../../model/Column';
import NumberColumn, {isMapAbleColumn} from '../../model/NumberColumn';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../missing';

interface IContextIsh {
  statsOf(col: INumberColumn & Column): IStatistics | null | ICategoricalStatistics;
}

export default class NumberSummary {
  update: (ctx: IContextIsh) => void;

  constructor(private readonly col: INumberColumn & Column, private readonly node: HTMLElement, interactive: boolean) {
    this.update = interactive && col instanceof NumberColumn ? this.initInteractive() : this.initStatic();
  }

  private initStatic() {
    this.node.dataset.summary = 'hist';

    return (ctx: IContextIsh) => {
      this.node.innerHTML = '';

      if (isMapAbleColumn(this.col)) {
        const range = this.col.getRange();
        this.node.insertAdjacentHTML('beforeend', `<span>${range[0]}</span><span>${range[1]}</span>`);
      }
      const stats = <IStatistics>ctx.statsOf(this.col);
      if (!stats) {
        this.node.classList.add('lu-invalid-hist');
        return;
      }
      const color = this.col.getMetaData().color;
      this.node.classList.remove('lu-invalid-hist');
      this.node.classList.toggle('lu-dense', stats.hist.length > DENSE_HISTOGRAM);
      stats.hist.forEach(({x0, length}, i) => {
        this.node.insertAdjacentHTML('beforeend', `<div title="Bin ${i}: ${length}" data-x="${x0}"><div style="height: ${Math.round(length * 100 / stats.maxBin)}%; background-color: ${color};"></div></div>`);
      });
    };
  }

  private initInteractive() {
    this.node.dataset.summary = 'slider-hist';
    this.node.innerHTML = '';

    const ncol = <NumberColumn>this.col;

    const updateFilter = this.initFilter(ncol);

    return (ctx: IContextIsh) => {
      const stats = <IStatistics>ctx.statsOf(this.col);
      updateFilter(stats.missing || 0);

      if (!stats) {
        this.node.classList.add('lu-invalid-hist');
        return;
      }
      const color = this.col.getMetaData().color;
      this.node.classList.remove('lu-invalid-hist');
      this.node.classList.toggle('lu-dense', stats.hist.length > DENSE_HISTOGRAM);

      const bins = <HTMLElement[]>Array.from(this.node.querySelectorAll('div[data-x]'));
      for (let i = bins.length; i < stats.hist.length; ++i) {
        this.node.insertAdjacentHTML('afterbegin', `<div><div></div></div>`);
        bins.unshift(<HTMLElement>this.node.firstElementChild!);
      }
      stats.hist.forEach(({x0, length}, i) => {
        const bin = bins[i];
        const inner = <HTMLElement>bin.firstElementChild!;
        inner.style.height = `${Math.round(length * 100 / stats.maxBin)}%`;
        inner.style.backgroundColor = color;
        bin.title = `Bin ${i}: ${length}`;
        bin.dataset.x = String(x0);
      });
    };
  }

  private static filter(col: NumberColumn) {
    const filter = col.getFilter();
    const domain = col.getMapping().domain;
    const percent = (v: number) => Math.round(100 * (v - domain[0]) / (domain[1] - domain[0]));
    const filterMin = isFinite(filter.min) ? filter.min : domain[0];
    const filterMax = isFinite(filter.max) ? filter.max : domain[1];
    return {
      filterMissing: filter.filterMissing,
      domain,
      percent,
      filterMin,
      filterMax
    };
  }

  private initFilter(col: NumberColumn) {
    const node = this.node;
    const f = NumberSummary.filter(col);

    node.insertAdjacentHTML('beforeend', `
      <div data-handle="min-hint" style="width: ${f.percent(f.filterMin)}%"></div>
      <div data-handle="max-hint" style="width: ${100 - f.percent(f.filterMax)}%"></div>
      <div data-handle="min" data-value="${round(f.filterMin, 2)}" style="left: ${f.percent(f.filterMin)}%" title="min filter, drag or double click to change"></div>
      <div data-handle='max' data-value="${round(f.filterMax, 2)}" style="right: ${100 - f.percent(f.filterMax)}%" title="max filter, drag or double click to change"></div>
      ${filterMissingNumberMarkup(f.filterMissing, 0)}
    `);

    const min = <HTMLElement>node.querySelector('[data-handle=min]');
    const max = <HTMLElement>node.querySelector('[data-handle=max]');
    const minHint = <HTMLElement>node.querySelector('[data-handle=min-hint]');
    const maxHint = <HTMLElement>node.querySelector('[data-handle=max-hint]');
    const filterMissing = <HTMLInputElement>node.querySelector('input');


    const setFilter = () => {
      const domain = col.getMapping().domain;
      const unpercent = (v: number) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
      const minValue = unpercent(parseFloat(min.style.left!));
      const maxValue = unpercent(100 - parseFloat(max.style.right!));
      col.setFilter({
        filterMissing: filterMissing.checked,
        min: Math.abs(minValue - domain[0]) < 0.001 ? NaN : minValue,
        max: Math.abs(maxValue - domain[1]) < 0.001 ? NaN : maxValue
      });
    };

    min.ondblclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
    };

    min.ondblclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
    };

    filterMissing.onchange = () => setFilter();

    selectAll([min, max]).call(drag()
      .on('start', function (this: HTMLElement) {
        this.classList.add('lu-dragging');
      })
      .on('drag', function (this: HTMLElement) {
        const evt = (<D3DragEvent<any, any, any>>d3event);
        const total = node.clientWidth;
        const px = Math.max(0, Math.min(evt.x, total));
        const percent = Math.round(100 * px / total);
        const domain = col.getMapping().domain;
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
        setFilter();
      }));

    return (missing: number) => {
      const f = NumberSummary.filter(col);
      minHint.style.width = `${f.percent(f.filterMin)}%`;
      maxHint.style.width = `${100 - f.percent(f.filterMax)}%`;
      min.dataset.value = round(f.filterMin, 2).toString();
      max.dataset.value = round(f.filterMax, 2).toString();
      min.style.left = `${f.percent(f.filterMin)}%`;
      max.style.right = `${100 - f.percent(f.filterMax)}%`;
      filterMissing.checked = f.filterMissing;
      updateFilterMissingNumberMarkup(<HTMLElement>filterMissing.parentElement, missing);
    };
  }
}
