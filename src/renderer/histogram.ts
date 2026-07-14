import { DENSE_HISTOGRAM } from '../constants';
import { type IBin, round, type IDragHandleOptions, dragHandle } from '../internal';
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
    <div class="${cssClass('histogram-min')}" data-raw="${c.formatRaw(f.filterMin)}" style="left: ${c.percent(
      f.filterMin
    )}%" title="min filter, drag to change"></div>
    <div class="${cssClass('histogram-max')}" data-raw="${c.formatRaw(f.filterMax)}" style="right: ${
      100 - c.percent(f.filterMax)
    }%" title="max filter, drag to change"></div>
    <label class="${cssClass('histogram-input-label')} ${cssClass('histogram-min-input-label')}">Min
      <input class="${cssClass('histogram-input')} ${cssClass('histogram-min-input')}" type="number" step="any" value="${c.formatRaw(
        f.filterMin
      )}" title="min filter value">
    </label>
    <label class="${cssClass('histogram-input-label')} ${cssClass('histogram-max-input-label')}">Max
      <input class="${cssClass('histogram-input')} ${cssClass('histogram-max-input')}" type="number" step="any" value="${c.formatRaw(
        f.filterMax
      )}" title="max filter value">
    </label>
    ${filterMissingNumberMarkup(f.filterMissing, 0)}
  `;
}

export function initFilter<T>(node: HTMLElement, context: IFilterContext<T>) {
  const min = node.getElementsByClassName(cssClass('histogram-min'))[0] as HTMLElement;
  const max = node.getElementsByClassName(cssClass('histogram-max'))[0] as HTMLElement;
  const minInput = node.getElementsByClassName(cssClass('histogram-min-input'))[0] as HTMLInputElement;
  const maxInput = node.getElementsByClassName(cssClass('histogram-max-input'))[0] as HTMLInputElement;
  const minHint = node.getElementsByClassName(cssClass('histogram-min-hint'))[0] as HTMLElement;
  const maxHint = node.getElementsByClassName(cssClass('histogram-max-hint'))[0] as HTMLElement;
  const filterMissing = node.querySelector<HTMLInputElement>(`label.${cssClass('checkbox')} > input[type=checkbox]`);
  if (!filterMissing || !minInput || !maxInput) {
    throw new Error('number/date filter controls are missing');
  }

  const setFilter = () => {
    const minValue = context.parseRaw(min.dataset.raw!);
    const maxValue = context.parseRaw(max.dataset.raw!);
    context.setFilter(filterMissing.checked, minValue, maxValue);
  };
  const updateMin = (newValue: T) => {
    minHint.style.width = `${context.percent(newValue)}%`;
    min.dataset.raw = context.formatRaw(newValue);
    if (document.activeElement !== minInput) {
      minInput.value = context.formatRaw(newValue);
    }
    min.style.left = `${context.percent(newValue)}%`;
    min.classList.toggle(cssClass('swap-hint'), context.percent(newValue) > 15);
  };
  const updateMax = (newValue: T) => {
    maxHint.style.width = `${100 - context.percent(newValue)}%`;
    max.dataset.raw = context.formatRaw(newValue);
    if (document.activeElement !== maxInput) {
      maxInput.value = context.formatRaw(newValue);
    }
    max.style.right = `${100 - context.percent(newValue)}%`;
    max.classList.toggle(cssClass('swap-hint'), context.percent(newValue) < 85);
  };

  const ensureNumber = (value: T) => (typeof value === 'number' ? value : Number(value));
  const minInputChange = () => {
    const currentMin = context.parseRaw(min.dataset.raw!);
    const currentMax = context.parseRaw(max.dataset.raw!);
    const rawValue = minInput.value.trim() === '' ? NaN : Number(minInput.value);
    if (Number.isNaN(rawValue)) {
      minInput.value = context.formatRaw(currentMin);
      return;
    }
    const bounded = Math.max(ensureNumber(context.domain[0]), Math.min(rawValue, ensureNumber(currentMax))) as T;
    updateMin(bounded);
    setFilter();
  };

  const maxInputChange = () => {
    const currentMin = context.parseRaw(min.dataset.raw!);
    const currentMax = context.parseRaw(max.dataset.raw!);
    const rawValue = maxInput.value.trim() === '' ? NaN : Number(maxInput.value);
    if (Number.isNaN(rawValue)) {
      maxInput.value = context.formatRaw(currentMax);
      return;
    }
    const bounded = Math.max(ensureNumber(currentMin), Math.min(rawValue, ensureNumber(context.domain[1]))) as T;
    updateMax(bounded);
    setFilter();
  };

  const onInputEnter = (evt: KeyboardEvent, apply: () => void) => {
    if (evt.key !== 'Enter') {
      return;
    }
    evt.preventDefault();
    evt.stopPropagation();
    apply();
  };

  minInput.onchange = () => minInputChange();
  minInput.onkeydown = (evt) => onInputEnter(evt, minInputChange);
  maxInput.onchange = () => maxInputChange();
  maxInput.onkeydown = (evt) => onInputEnter(evt, maxInputChange);

  filterMissing.onchange = () => setFilter();

  const options: Partial<IDragHandleOptions> = {
    minDelta: 0,
    filter: (evt) => evt.button === 0 && !evt.shiftKey && !evt.ctrlKey,
    onStart: (handle) => handle.classList.add(cssClass('hist-dragging')),
    onDrag: (handle, x) => {
      const isMin = (handle as HTMLElement).classList.contains(cssClass('histogram-min'));
      const total = node.clientWidth;
      const px = Math.max(0, Math.min(x, total));
      let rawValue = context.unpercent(Math.round((100 * px) / total));
      const otherValue = context.parseRaw((isMin ? max : min).dataset.raw!);
      if ((isMin && rawValue > otherValue) || (!isMin && rawValue < otherValue)) {
        rawValue = otherValue;
      }

      if (isMin) {
        updateMin(rawValue);
      } else {
        updateMax(rawValue);
      }
    },
    onEnd: (handle) => {
      handle.classList.remove(cssClass('hist-dragging'));
      setFilter();
    },
  };
  dragHandle(min, options);
  dragHandle(max, options);

  return (missing: number, f: IFilterInfo<T>) => {
    updateMin(f.filterMin);
    updateMax(f.filterMax);
    filterMissing.checked = f.filterMissing;
    updateFilterMissingNumberMarkup(filterMissing.parentElement as HTMLElement, missing);
  };
}
