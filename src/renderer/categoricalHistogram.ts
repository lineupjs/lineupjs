import { DENSE_HISTOGRAM } from '../constants';
import { type ICategoricalStatistics, round } from '../internal';
import type { ICategoricalLikeColumn, ICategory } from '../model';
import { cssClass, FILTERED_OPACITY } from '../styles';
import { forEach } from './utils';
import { color } from 'd3-color';

export function categoricalHistogram(
  col: ICategoricalLikeColumn,
  showLabels: boolean,
  sanitize: (v: string) => string
) {
  const createBin = (c: ICategory, col: string) => {
    return `<div class="${cssClass('histogram-bin')}" title="${sanitize(c.label)}: 0" data-cat="${sanitize(
      c.name
    )}" ${showLabels ? `data-title="${sanitize(c.label)}"` : ''}><div style="height: 0; background-color: ${col}"></div></div>`;
  };

  return {
    template: (() => {
      const mapping = col.getColorMapping();
      const bins = col.categories.map((c) => createBin(c, mapping.apply(c))).join('');
      return `<div class="${cssClass('histogram')} ${
        col.categories.length! > DENSE_HISTOGRAM ? cssClass('dense') : ''
      }">${bins}`; // no closing div to be able to append things
    })(),
    matchBins: (n: HTMLElement) => {
      // matches bins to current categories, since they can change now
      const categories = col.categories;
      const mapping = col.getColorMapping();
      n.classList.toggle(cssClass('dense'), categories.length! > DENSE_HISTOGRAM);
      // match the histogram bins to the current categories
      const bins = Array.from(n.querySelectorAll<HTMLElement>('[data-cat]'));
      let lastBin: HTMLElement | null = null;
      let changed = false;
      for (const category of categories) {
        let bin = bins[0];
        if (bin && bin.dataset.cat === category.name) {
          lastBin = bin;
          bins.shift(); // remove first since handled
          continue;
        }
        // oh no
        changed = true;
        if (lastBin) {
          lastBin.insertAdjacentHTML('afterend', createBin(category, mapping.apply(category)));
          bin = lastBin.nextElementSibling as HTMLElement;
        } else {
          n.insertAdjacentHTML('afterbegin', createBin(category, mapping.apply(category)));
          bin = n.firstElementChild as HTMLElement;
        }
        lastBin = bin;
      }
      for (const toRemove of bins) {
        // delete extra bins
        changed = true;
        toRemove.remove();
      }
      return changed;
    },
    update: (n: HTMLElement, hist: ICategoricalStatistics, gHist?: ICategoricalStatistics) => {
      const mapping = col.getColorMapping();

      const selected = col.categories.map((d) => {
        const c = color(mapping.apply(d))!;
        c.opacity = FILTERED_OPACITY;
        return c.toString();
      });

      const maxBin = gHist ? gHist.maxBin : hist.maxBin;
      forEach(n, '[data-cat]', (d: HTMLElement, i) => {
        const cat = col.categories[i];
        const { count } = hist.hist[i];
        const inner = d.firstElementChild! as HTMLElement;
        if (gHist) {
          const { count: gCount } = gHist.hist[i];
          d.title = `${cat.label}: ${count} of ${gCount}`;
          inner.style.height = `${round((gCount * 100) / maxBin, 2)}%`;
          const relY = 100 - round((count * 100) / gCount, 2);
          inner.style.background =
            relY === 0
              ? mapping.apply(cat)
              : relY === 100
                ? selected[i]
                : `linear-gradient(${selected[i]} ${relY}%, ${mapping.apply(cat)} ${relY}%, ${mapping.apply(cat)} 100%)`;
        } else {
          d.title = `${col.categories[i].label}: ${count}`;
          inner.style.height = `${Math.round((count * 100) / maxBin)}%`;
          inner.style.background = mapping.apply(cat);
        }
      });
    },
  };
}
