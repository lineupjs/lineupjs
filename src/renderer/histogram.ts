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
  inputType: 'number' | 'date';
  inputStep?: string;
  domain: [T, T];
}

/** @internal */
export interface IFilterInfo<T> {
  filterMissing: boolean;
  filterMin: T;
  filterMax: T;
}

export function filteredHistTemplate<T>(c: IFilterContext<T>, f: IFilterInfo<T>) {
  const handleHint = 'drag to change; edit exact values below';
  return `
    <div class="${cssClass('histogram-min-hint')}" style="width: ${c.percent(f.filterMin)}%"></div>
    <div class="${cssClass('histogram-max-hint')}" style="width: ${100 - c.percent(f.filterMax)}%"></div>
    <div class="${cssClass('histogram-min')}" data-value="${c.format(f.filterMin)}" data-raw="${c.formatRaw(
      f.filterMin
    )}" style="left: ${c.percent(f.filterMin)}%" title="min filter, ${handleHint}"></div>
    <div class="${cssClass('histogram-max')}" data-value="${c.format(f.filterMax)}" data-raw="${c.formatRaw(
      f.filterMax
    )}" style="right: ${100 - c.percent(f.filterMax)}%" title="max filter, ${handleHint}"></div>
    <div class="${cssClass('histogram-filter-inputs')}">
      <input class="${cssClass('histogram-filter-input')} ${cssClass('histogram-filter-input-min')}" type="${
        c.inputType
      }" value="${c.formatRaw(f.filterMin)}" min="${c.formatRaw(c.domain[0])}" max="${c.formatRaw(
        f.filterMax
      )}"${c.inputStep ? ` step="${c.inputStep}"` : ''}>
      <input class="${cssClass('histogram-filter-input')} ${cssClass('histogram-filter-input-max')}" type="${
        c.inputType
      }" value="${c.formatRaw(f.filterMax)}" min="${c.formatRaw(f.filterMin)}" max="${c.formatRaw(
        c.domain[1]
      )}"${c.inputStep ? ` step="${c.inputStep}"` : ''}>
    </div>
    ${filterMissingNumberMarkup(f.filterMissing, 0)}
  `;
}

export function initFilter<T>(node: HTMLElement, context: IFilterContext<T>) {
  const min = node.getElementsByClassName(cssClass('histogram-min'))[0] as HTMLElement;
  const max = node.getElementsByClassName(cssClass('histogram-max'))[0] as HTMLElement;
  const minHint = node.getElementsByClassName(cssClass('histogram-min-hint'))[0] as HTMLElement;
  const maxHint = node.getElementsByClassName(cssClass('histogram-max-hint'))[0] as HTMLElement;
  const minInput = node.getElementsByClassName(cssClass('histogram-filter-input-min'))[0] as HTMLInputElement;
  const maxInput = node.getElementsByClassName(cssClass('histogram-filter-input-max'))[0] as HTMLInputElement;
  const filterMissingCheckbox = node.querySelector<HTMLElement>(`.${cssClass('checkbox')}`)!;
  const filterMissing = filterMissingCheckbox.getElementsByTagName('input')[0] as HTMLInputElement;

  const setFilter = () => {
    const minValue = context.parseRaw(min.dataset.raw!);
    const maxValue = context.parseRaw(max.dataset.raw!);
    context.setFilter(filterMissing.checked, minValue, maxValue);
  };

  const updateInputBounds = () => {
    minInput.min = context.formatRaw(context.domain[0]);
    minInput.max = max.dataset.raw!;
    maxInput.min = min.dataset.raw!;
    maxInput.max = context.formatRaw(context.domain[1]);
  };

  const updateMin = (newValue: T) => {
    const percent = context.percent(newValue);
    minHint.style.width = `${percent}%`;
    min.dataset.value = context.format(newValue);
    min.dataset.raw = context.formatRaw(newValue);
    min.style.left = `${percent}%`;
    minInput.value = context.formatRaw(newValue);
    updateInputBounds();
  };

  const updateMax = (newValue: T) => {
    const percent = context.percent(newValue);
    maxHint.style.width = `${100 - percent}%`;
    max.dataset.value = context.format(newValue);
    max.dataset.raw = context.formatRaw(newValue);
    max.style.right = `${100 - percent}%`;
    maxInput.value = context.formatRaw(newValue);
    updateInputBounds();
  };

  filterMissing.onchange = () => setFilter();

  minInput.onchange = () => {
    const newValue = context.parseRaw(minInput.value);
    if (Number.isNaN(newValue as number)) {
      minInput.value = min.dataset.raw!;
      return;
    }
    const maxValue = context.parseRaw(max.dataset.raw!);
    updateMin(Math.max(context.domain[0] as number, Math.min(newValue as number, maxValue as number)) as T);
    setFilter();
  };

  maxInput.onchange = () => {
    const newValue = context.parseRaw(maxInput.value);
    if (Number.isNaN(newValue as number)) {
      maxInput.value = max.dataset.raw!;
      return;
    }
    const minValue = context.parseRaw(min.dataset.raw!);
    updateMax(Math.min(context.domain[1] as number, Math.max(newValue as number, minValue as number)) as T);
    setFilter();
  };

  const options: Partial<IDragHandleOptions> = {
    minDelta: 0,
    filter: (evt) => evt.button === 0 && !evt.shiftKey && !evt.ctrlKey,
    onStart: (handle) => handle.classList.add(cssClass('hist-dragging')),
    onDrag: (handle, x) => {
      const isMin = (handle as HTMLElement).classList.contains(cssClass('histogram-min'));
      const total = node.clientWidth;
      const px = Math.max(0, Math.min(x, total));
      let percent = Math.round((100 * px) / total);
      let rawValue = context.unpercent(percent);
      const otherValue = context.parseRaw((isMin ? max : min).dataset.raw!);
      if ((isMin && rawValue > otherValue) || (!isMin && rawValue < otherValue)) {
        rawValue = otherValue;
        percent = context.percent(rawValue);
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

  updateInputBounds();

  return (missing: number, f: IFilterInfo<T>) => {
    updateMin(f.filterMin);
    updateMax(f.filterMax);
    filterMissing.checked = f.filterMissing;
    updateFilterMissingNumberMarkup(filterMissing.parentElement as HTMLElement, missing);
  };
}
