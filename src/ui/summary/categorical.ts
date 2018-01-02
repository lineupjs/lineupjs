import {DENSE_HISTOGRAM} from '../../config';
import {ICategoricalStatistics} from '../../internal/math';
import {ICategoricalColumn} from '../../model';
import CategoricalColumn from '../../model/CategoricalColumn';
import CategoricalNumberColumn from '../../model/CategoricalNumberColumn';
import Column from '../../model/Column';
import {IRankingHeaderContext} from '../interfaces';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../missing';


export default class CategoricalSummary {
  update: (ctx: IRankingHeaderContext) => void;

  constructor(private readonly col: ICategoricalColumn & Column, private readonly node: HTMLElement, interactive: boolean) {
    if (col.categories.length > DENSE_HISTOGRAM * 2) {
      // no rendering at all
      this.update = () => undefined;
      return;
    }
    const interactiveOne = (col instanceof CategoricalColumn || col instanceof CategoricalNumberColumn);
    if (!interactive || !interactiveOne) {
      this.update =  interactiveOne ? this.initStaticFilter() : this.initStatic();
      return;
    }
    this.update = this.initInteractive();
  }

  private initCommon(showLabels: boolean) {
    const cats = this.col.categories;
    const colors = this.col.categoryColors;
    const labels = this.col.categoryLabels;

    this.node.classList.toggle('lu-dense', cats.length > DENSE_HISTOGRAM);

    cats.forEach((cat, i) => {
      this.node.insertAdjacentHTML('beforeend', `<div title="${labels[i]}" data-cat="${cat}" ${showLabels ? `data-title="${labels[i]}"` : ''}><div style="height: 0; background-color: ${colors[i]}"></div></div>`);
    });

    const bins = <HTMLElement[]>Array.from(this.node.querySelectorAll('[data-cat]'));

    return (stats?: ICategoricalStatistics) => {
      if (!stats) {
        this.node.classList.add('lu-invalid-hist');
        return;
      }
      this.node.classList.remove('lu-invalid-hist');
      const lookup = new Map(stats.hist.map((d) => (<[string, number]>[d.cat, d.y])));

      cats.forEach((cat, i) => {
        const y = lookup.get(cat) || 0;
        const bin = bins[i];
        (<HTMLElement>bin.firstElementChild!).style.height = `${Math.round(y * 100 / stats.maxBin)}%`;
        bin.title = `${labels[i]}: ${y}`;
      });
    };
  }

  private initStatic() {
    this.node.dataset.summary = 'hist';

    const common = this.initCommon(false);

    return (ctx: IRankingHeaderContext) => {
      const stats = <ICategoricalStatistics>ctx.statsOf(this.col);
      common(stats);
    };
  }

  private interactiveHist(col: CategoricalColumn | CategoricalNumberColumn) {
    const bins = <HTMLElement[]>Array.from(this.node.querySelectorAll('[data-cat]'));
    const cats = this.col.categories;

    bins.forEach((bin, i) => {
      const cat = cats[i];

      bin.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        // toggle filter
        const old = col.getFilter();
        if (old == null || !Array.isArray(old.filter)) {
          // deselect
          const without = cats.slice();
          bin.dataset.filtered = 'filtered';
          without.splice(i, 1);
          col.setFilter({
            filterMissing: old ? old.filterMissing : false,
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
          delete bin.dataset.filtered;
          filter.push(cat);
        }
        col.setFilter({
          filterMissing: old.filterMissing,
          filter
        });
      };
    });

    return () => {
      const f = col.getFilter();
      bins.forEach((bin, i) => {
        if (!CategoricalColumn.filter(f, cats[i])) {
          bin.dataset.filtered = 'filtered';
        } else {
          delete bin.dataset.filtered;
        }
      });
    };
  }

  private initStaticFilter() {
    const col = <CategoricalColumn | CategoricalNumberColumn>this.col;
    this.node.dataset.summary = 'interactive-hist';

    const common = this.initCommon(false);

    const interactive = this.interactiveHist(col);

    return (ctx: IRankingHeaderContext) => {
      const stats = <ICategoricalStatistics>ctx.statsOf(this.col);
      common(stats);
      interactive();
    };
  }

  private initInteractive() {
    const col = <CategoricalColumn | CategoricalNumberColumn>this.col;
    this.node.dataset.summary = 'interactive-filter-hist';

    const common = this.initCommon(true);
    const interactive = this.interactiveHist(col);

    const f = col.getFilter();
    this.node.insertAdjacentHTML('beforeend', filterMissingNumberMarkup(f != null && f.filterMissing, 0));
    const filterMissing = <HTMLInputElement>this.node.querySelector('input')!;

    filterMissing.onchange = () => {
      // toggle filter
      const v = filterMissing.checked;
      const old = col.getFilter();
      if (old == null) {
        col.setFilter(v ? {filterMissing: v, filter: col.categories} : null);
      } else {
        col.setFilter({filterMissing: v, filter: old.filter});
      }
    };

    return (ctx: IRankingHeaderContext) => {
      const stats = <ICategoricalStatistics>ctx.statsOf(this.col);
      common(stats);
      interactive();
      const f = col.getFilter();
      filterMissing.checked = f != null && f.filterMissing;
      updateFilterMissingNumberMarkup(<HTMLElement>filterMissing.parentElement, stats ? stats.missing : 0);
    };
  }
}
