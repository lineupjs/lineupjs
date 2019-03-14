import {DENSE_HISTOGRAM} from '../constants';
import {IBin, round} from '../internal';
import {cssClass, FILTERED_OPACITY} from '../styles';
import {color} from 'd3-color';

function filteredColor(input: string) {
  const c = color(input)!;
  c.opacity = FILTERED_OPACITY;
  return c.toString();
}

/**
 * @internal
 */
export function histogramTemplate(guessedBins: number) {
  let bins = '';
  for (let i = 0; i < guessedBins; ++i) {
    bins += `<div class="${cssClass('histogram-bin')}" title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`;
  }
  // no closing div to be able to append things
  return `<div class="${cssClass('histogram')} ${guessedBins > DENSE_HISTOGRAM ? cssClass('dense') : ''}">${bins}`;
}

function matchBins(n: HTMLElement, bins: number) {
  //adapt the number of children
  let nodes = <HTMLElement[]>Array.from(n.querySelectorAll('[data-x]'));
  if (nodes.length > bins) {
    nodes.splice(bins, nodes.length - bins).forEach((d) => d.remove());
  } else if (nodes.length < bins) {
    for (let i = nodes.length; i < bins; ++i) {
      n.insertAdjacentHTML('afterbegin', `<div class="${cssClass('histogram-bin')}" title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`);
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
export function histogramRender<T>(n: HTMLElement, stats: IHistogramLike<T>, unfiltered: IHistogramLike<T> | null, formatter: (v: T) => string, colorOf: (bin: IBin<T>) => string) {
  const hist = stats.hist;
  const nodes = matchBins(n, hist.length);

  nodes.forEach((d: HTMLElement, i) => {
    const bin = hist[i];
    const inner = <HTMLElement>d.firstElementChild!;
    if (!bin) {
      inner.style.height = '0%';
      return;
    }

    const {x0, x1, count} = bin;
    const color = colorOf(bin);
    d.dataset.x = formatter(x0);

    if (unfiltered) {
      const gCount = (unfiltered.hist[i] || {count}).count;
      d.title = `${formatter(x0)} - ${formatter(x1)} (${count} of ${gCount})`;
      inner.style.height = `${round(gCount * 100 / unfiltered.maxBin, 2)}%`;
      const relY = 100 - round(count * 100 / gCount, 2);
      inner.style.background = relY === 0 ? color : (relY === 100 ? filteredColor(color) : `linear-gradient(${filteredColor(color)} ${relY}%, ${color} ${relY}%, ${color} 100%)`);
    } else {
      d.title = `${formatter(x0)} - ${formatter(x1)} (${count})`;
      inner.style.height = `${round(count * 100 / stats.maxBin, 2)}%`;
      inner.style.backgroundColor = color;
    }
  });
}
