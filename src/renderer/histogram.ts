import { DENSE_HISTOGRAM } from '../constants';
import { IBin, round, IDragHandleOptions, dragHandle } from '../internal';
import { cssClass, FILTERED_OPACITY } from '../styles';
import { color } from 'd3-color';
import { filterMissingNumberMarkup, updateFilterMissingNumberMarkup } from '../ui/missing';

function filteredColor(input: string) {
  const c = color(input)!;
  c.opacity = FILTERED_OPACITY;
  return c.toString();
}

export function histogramTemplate(guessedBins: number) {
  let bins = '';
  for (let i = 0; i < guessedBins; ++i) {
    bins += `<div class="${cssClass(
      'histogram-bin'
    )}" title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`;
  }
  // no closing div to be able to append things
  return `<div class="${cssClass('histogram')} ${guessedBins > DENSE_HISTOGRAM ? cssClass('dense') : ''}">${bins}`;
}

function matchBins(n: HTMLElement, bins: number) {
  //adapt the number of children
  let nodes = Array.from(n.querySelectorAll<HTMLElement>('[data-x]'));
  if (nodes.length > bins) {
    nodes.splice(bins, nodes.length - bins).forEach((d) => d.remove());
  } else if (nodes.length < bins) {
    for (let i = nodes.length; i < bins; ++i) {
      n.insertAdjacentHTML(
        'afterbegin',
        `<div class="${cssClass('histogram-bin')}" title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`
      );
    }
    nodes = Array.from(n.querySelectorAll('[data-x]'));
  }
  n.classList.toggle(cssClass('dense'), bins > DENSE_HISTOGRAM);
  return nodes;
}

export interface IHistogramLike<T> {
  readonly maxBin: number;
  readonly hist: ReadonlyArray<IBin<T>>;
}

/** @internal */
export function histogramUpdate<T>(
  n: HTMLElement,
  stats: IHistogramLike<T>,
  unfiltered: IHistogramLike<T> | null,
  formatter: (v: T) => string,
  colorOf: (bin: IBin<T>) => string
) {
  const hist = stats.hist;
  const nodes = matchBins(n, hist.length);

  nodes.forEach((d: HTMLElement, i) => {
    const bin = hist[i];
    const inner = d.firstElementChild! as HTMLElement;
    if (!bin) {
      inner.style.height = '0%';
      return;
    }

    const { x0, x1, count } = bin;
    const color = colorOf(bin);
    d.dataset.x = formatter(x0);

    if (unfiltered) {
      const gCount = (unfiltered.hist[i] || { count }).count;
      d.title = `${formatter(x0)} - ${formatter(x1)} (${count} of ${gCount})`;
      inner.style.height = `${round((gCount * 100) / unfiltered.maxBin, 2)}%`;
      const relY = 100 - round((count * 100) / gCount, 2);
      inner.style.background =
        relY === 0
          ? color
          : relY === 100
          ? filteredColor(color)
          : `linear-gradient(${filteredColor(color)} ${relY}%, ${color} ${relY}%, ${color} 100%)`;
    } else {
      d.title = `${formatter(x0)} - ${formatter(x1)} (${count})`;
      inner.style.height = `${round((count * 100) / stats.maxBin, 2)}%`;
      inner.style.backgroundColor = color;
    }
  });
}

/**
 * @internal
 */
export function mappingHintTemplate(range: [string, string]) {
  return `<span class="${cssClass('mapping-hint')}" title="${range[0]}">${range[0]}</span><span class="${cssClass(
    'mapping-hint'
  )}" title="${range[1]}">${range[1]}</span>`;
}

/**
 * @internal
 */
export function mappingHintUpdate(n: HTMLElement, range: [string, string]) {
  Array.from(n.getElementsByTagName('span')).forEach((d: HTMLElement, i) => (d.textContent = range[i]));
}

export interface IFilterContext<T> {
  percent(v: T): number;
  unpercent(p: number): T;
  format(v: T): string;
  formatRaw(v: T): string;
  parseRaw(v: string): T;
  setFilter(filterMissing: boolean, min: T, max: T): void;
  edit(value: T, attachment: HTMLElement, type: 'min' | 'max'): Promise<T>;
  domain: [T, T];
}

/** @internal */
export interface IFilterInfo<T> {
  filterMissing: boolean;
  filterMin: T;
  filterMax: T;
}

export function filteredHistTemplate<T>(c: IFilterContext<T>, f: IFilterInfo<T>) {
  return `
    <div class="${cssClass('histogram-min-hint')}" style="width: ${c.percent(f.filterMin)}%"></div>
    <div class="${cssClass('histogram-max-hint')}" style="width: ${100 - c.percent(f.filterMax)}%"></div>
    <div class="${cssClass('histogram-min')}" data-value="${c.format(f.filterMin)}" data-raw="${c.formatRaw(
    f.filterMin
  )}" style="left: ${c.percent(f.filterMin)}%" title="min filter, drag or double click to change"></div>
    <div class="${cssClass('histogram-max')}" data-value="${c.format(f.filterMax)}" data-raw="${c.formatRaw(
    f.filterMax
  )}" style="right: ${100 - c.percent(f.filterMax)}%" title="max filter, drag or double click to change"></div>
    ${filterMissingNumberMarkup(f.filterMissing, 0)}
  `;
}

export function initFilter<T>(node: HTMLElement, context: IFilterContext<T>) {
  const min = node.getElementsByClassName(cssClass('histogram-min'))[0] as HTMLElement;
  const max = node.getElementsByClassName(cssClass('histogram-max'))[0] as HTMLElement;
  const minHint = node.getElementsByClassName(cssClass('histogram-min-hint'))[0] as HTMLElement;
  const maxHint = node.getElementsByClassName(cssClass('histogram-max-hint'))[0] as HTMLElement;
  const filterMissing = node.getElementsByTagName('input')[0] as HTMLInputElement;

  const setFilter = () => {
    const minValue = context.parseRaw(min.dataset.raw!);
    const maxValue = context.parseRaw(max.dataset.raw!);
    context.setFilter(filterMissing.checked, minValue, maxValue);
  };

  const minImpl = (evt: MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();

    const value = context.parseRaw(min.dataset.raw!);

    context.edit(value, min, 'min').then((newValue) => {
      minHint.style.width = `${context.percent(newValue)}%`;
      min.dataset.value = context.format(newValue);
      min.dataset.raw = context.formatRaw(newValue);
      min.style.left = `${context.percent(newValue)}%`;
      min.classList.toggle(cssClass('swap-hint'), context.percent(newValue) > 15);
      setFilter();
    });
  };

  min.onclick = (evt) => {
    if (!evt.shiftKey && !evt.ctrlKey) {
      return;
    }
    minImpl(evt);
  };
  min.ondblclick = minImpl;

  const maxImpl = (evt: MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();

    const value = context.parseRaw(max.dataset.raw!);

    context.edit(value, max, 'max').then((newValue) => {
      maxHint.style.width = `${100 - context.percent(newValue)}%`;
      max.dataset.value = context.format(newValue);
      max.dataset.raw = context.formatRaw(newValue);
      max.style.right = `${100 - context.percent(newValue)}%`;
      max.classList.toggle(cssClass('swap-hint'), context.percent(newValue) < 85);
      setFilter();
    });
  };

  max.onclick = (evt) => {
    if (!evt.shiftKey && !evt.ctrlKey) {
      return;
    }
    maxImpl(evt);
  };
  max.ondblclick = maxImpl;

  filterMissing.onchange = () => setFilter();

  const options: Partial<IDragHandleOptions> = {
    minDelta: 0,
    filter: (evt) => evt.button === 0 && !evt.shiftKey && !evt.ctrlKey,
    onStart: (handle) => handle.classList.add(cssClass('hist-dragging')),
    onDrag: (handle, x) => {
      const total = node.clientWidth;
      const px = Math.max(0, Math.min(x, total));
      const percent = Math.round((100 * px) / total);
      (handle as HTMLElement).dataset.value = context.format(context.unpercent(percent));
      (handle as HTMLElement).dataset.raw = context.formatRaw(context.unpercent(percent));

      if ((handle as HTMLElement).classList.contains(cssClass('histogram-min'))) {
        handle.style.left = `${percent}%`;
        handle.classList.toggle(cssClass('swap-hint'), percent > 15);
        minHint.style.width = `${percent}%`;
        return;
      }
      handle.style.right = `${100 - percent}%`;
      handle.classList.toggle(cssClass('swap-hint'), percent < 85);
      maxHint.style.width = `${100 - percent}%`;
    },
    onEnd: (handle) => {
      handle.classList.remove(cssClass('hist-dragging'));
      setFilter();
    },
  };
  dragHandle(min, options);
  dragHandle(max, options);

  return (missing: number, f: IFilterInfo<T>) => {
    minHint.style.width = `${context.percent(f.filterMin)}%`;
    maxHint.style.width = `${100 - context.percent(f.filterMax)}%`;
    min.dataset.value = context.format(f.filterMin);
    max.dataset.value = context.format(f.filterMax);
    min.dataset.raw = context.formatRaw(f.filterMin);
    max.dataset.raw = context.formatRaw(f.filterMax);
    min.style.left = `${context.percent(f.filterMin)}%`;
    max.style.right = `${100 - context.percent(f.filterMax)}%`;
    min.classList.toggle(cssClass('swap-hint'), context.percent(f.filterMin) > 15);
    max.classList.toggle(cssClass('swap-hint'), context.percent(f.filterMax) < 85);
    filterMissing.checked = f.filterMissing;
    updateFilterMissingNumberMarkup(filterMissing.parentElement as HTMLElement, missing);
  };
}
