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
  /**
   * Whether to render always-visible min/max numeric inputs below the histogram.
   * If disabled, exact value editing can be provided through {@link IFilterContext.edit}.
   */
  showMinMaxInputs?: boolean;
  /**
   * Optional exact editor used by filters that don't render always-visible inputs.
   */
  edit?(value: T, attachment: HTMLElement, type: 'min' | 'max', otherValue: T): Promise<T>;
  domain: [T, T];
}

/** @internal */
export interface IFilterInfo<T> {
  filterMissing: boolean;
  filterMin: T;
  filterMax: T;
}

export function filteredHistTemplate<T>(c: IFilterContext<T>, f: IFilterInfo<T>) {
  const showMinMaxInputs = c.showMinMaxInputs === true;
  return `
    <div class="${cssClass('histogram-min-hint')}" style="width: ${c.percent(f.filterMin)}%"></div>
    <div class="${cssClass('histogram-max-hint')}" style="width: ${100 - c.percent(f.filterMax)}%"></div>
    <div class="${cssClass('histogram-min')}" ${showMinMaxInputs ? '' : `data-value="${c.format(f.filterMin)}"`} data-raw="${c.formatRaw(
      f.filterMin
    )}" style="left: ${c.percent(f.filterMin)}%" title="min filter, drag${showMinMaxInputs ? '' : ' or double click'} to change"></div>
    <div class="${cssClass('histogram-max')}" ${showMinMaxInputs ? '' : `data-value="${c.format(f.filterMax)}"`} data-raw="${c.formatRaw(
      f.filterMax
    )}" style="right: ${100 - c.percent(f.filterMax)}%" title="max filter, drag${showMinMaxInputs ? '' : ' or double click'} to change"></div>
    ${
      showMinMaxInputs
        ? `<input class="${cssClass('histogram-input')} ${cssClass('histogram-min-input')}" type="number" step="any" value="${c.formatRaw(
            f.filterMin
          )}" title="min filter value">
    <input class="${cssClass('histogram-input')} ${cssClass('histogram-max-input')}" type="number" step="any" value="${c.formatRaw(
      f.filterMax
    )}" title="max filter value">`
        : ''
    }
    ${filterMissingNumberMarkup(f.filterMissing, 0)}
  `;
}

export function initFilter<T>(node: HTMLElement, context: IFilterContext<T>) {
  const min = node.getElementsByClassName(cssClass('histogram-min'))[0] as HTMLElement;
  const max = node.getElementsByClassName(cssClass('histogram-max'))[0] as HTMLElement;
  const minInput = node.getElementsByClassName(cssClass('histogram-min-input'))[0] as HTMLInputElement | undefined;
  const maxInput = node.getElementsByClassName(cssClass('histogram-max-input'))[0] as HTMLInputElement | undefined;
  const showMinMaxInputs = Boolean(minInput && maxInput);
  const minHint = node.getElementsByClassName(cssClass('histogram-min-hint'))[0] as HTMLElement;
  const maxHint = node.getElementsByClassName(cssClass('histogram-max-hint'))[0] as HTMLElement;
  const filterMissing = node.querySelector<HTMLInputElement>(`label.${cssClass('checkbox')} > input[type=checkbox]`);
  if (!filterMissing) {
    throw new Error('number/date filter checkbox is missing');
  }

  const setFilter = () => {
    const minValue = context.parseRaw(min.dataset.raw!);
    const maxValue = context.parseRaw(max.dataset.raw!);
    context.setFilter(filterMissing.checked, minValue, maxValue);
  };
  const updateMin = (newValue: T) => {
    minHint.style.width = `${context.percent(newValue)}%`;
    min.dataset.raw = context.formatRaw(newValue);
    if (minInput) {
      minInput.value = context.formatRaw(newValue);
    }
    min.style.left = `${context.percent(newValue)}%`;
    min.classList.toggle(cssClass('swap-hint'), context.percent(newValue) > 15);
  };
  const updateMax = (newValue: T) => {
    maxHint.style.width = `${100 - context.percent(newValue)}%`;
    max.dataset.raw = context.formatRaw(newValue);
    if (maxInput) {
      maxInput.value = context.formatRaw(newValue);
    }
    max.style.right = `${100 - context.percent(newValue)}%`;
    max.classList.toggle(cssClass('swap-hint'), context.percent(newValue) < 85);
  };

  if (showMinMaxInputs) {
    // Always-visible min/max inputs are enabled only for numeric filters.
    const ensureNumber = (value: T) => (typeof value === 'number' ? value : Number(value));
    const minInputChange = () => {
      const rawInput = context.parseRaw(minInput.value);
      const currentMin = context.parseRaw(min.dataset.raw!);
      const currentMax = context.parseRaw(max.dataset.raw!);
      const rawValue = ensureNumber(rawInput);
      if (Number.isNaN(rawValue)) {
        minInput.value = context.formatRaw(currentMin);
        return;
      }
      const bounded = Math.max(ensureNumber(context.domain[0]), Math.min(rawValue, ensureNumber(currentMax))) as T;
      updateMin(bounded);
      setFilter();
    };

    const maxInputChange = () => {
      const rawInput = context.parseRaw(maxInput.value);
      const currentMin = context.parseRaw(min.dataset.raw!);
      const currentMax = context.parseRaw(max.dataset.raw!);
      const rawValue = ensureNumber(rawInput);
      if (Number.isNaN(rawValue)) {
        maxInput.value = context.formatRaw(currentMax);
        return;
      }
      const bounded = Math.max(ensureNumber(currentMin), Math.min(rawValue, ensureNumber(context.domain[1]))) as T;
      updateMax(bounded);
      setFilter();
    };

    minInput.onchange = () => minInputChange();
    minInput.onblur = () => minInputChange();
    maxInput.onchange = () => maxInputChange();
    maxInput.onblur = () => maxInputChange();
  } else if (context.edit) {
    const minImpl = (evt: MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();

      const value = context.parseRaw(min.dataset.raw!);
      const maxValue = context.parseRaw(max.dataset.raw!);

      context.edit!(value, min, 'min', maxValue).then((newValue) => {
        updateMin(newValue);
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
      const minValue = context.parseRaw(min.dataset.raw!);

      context.edit!(value, max, 'max', minValue).then((newValue) => {
        updateMax(newValue);
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
  }

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
