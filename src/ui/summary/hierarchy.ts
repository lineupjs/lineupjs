import {DENSE_HISTOGRAM} from '../../config';
import {ICategoricalStatistics} from '../../internal/math';
import HierarchyColumn from '../../model/HierarchyColumn';
import {IRankingHeaderContext} from '../interfaces';


export default class HierarchySummary {
  update: (ctx: IRankingHeaderContext) => void;

  constructor(private readonly col: HierarchyColumn, private readonly node: HTMLElement, interactive: boolean) {
    this.update = interactive ? this.initInteractive() : this.initStatic();
  }

  private updateHist(stats?: ICategoricalStatistics, showLabels: boolean = false) {
    const cats = this.col.categories;
    if (!stats || cats.length > DENSE_HISTOGRAM * 2) {
      this.node.classList.add('lu-invalid-hist');
      return;
    }
    this.node.classList.remove('lu-invalid-hist');
    this.node.classList.toggle('lu-dense', cats.length > DENSE_HISTOGRAM);

    const bins = <HTMLElement[]>Array.from(this.node.querySelectorAll('div[data-cat]'));
    if (bins.length > cats.length) {
      bins.splice(0, bins.length - cats.length).forEach((d) => d.remove());
    }
    for (let i = bins.length; i < cats.length; ++i) {
      this.node.insertAdjacentHTML('afterbegin', `<div><div></div></div>`);
      bins.unshift(<HTMLElement>this.node.firstElementChild!);
    }

    const lookup = new Map(stats.hist.map((d) => (<[string, number]>[d.cat, d.y])));
    cats.forEach((cat, i) => {
      const y = lookup.get(cat.name) || 0;
      const bin = bins[i];
      const inner = (<HTMLElement>bin.firstElementChild!);
      inner.style.height = `${Math.round(y * 100 / stats.maxBin)}%`;
      inner.style.backgroundColor = cat.color;
      bin.title = `${cat.label}: ${y}`;
      bin.dataset.cat = cat.name;
      if (showLabels && cats.length <= DENSE_HISTOGRAM) {
        bin.dataset.title = cat.label;
      }
    });
  }

  private initStatic() {
    this.node.dataset.summary = 'hist';
    return (ctx: IRankingHeaderContext) => {
      const stats = <ICategoricalStatistics>ctx.statsOf(this.col);
      this.updateHist(stats, false);
    };
  }

  private initInteractive() {
    this.node.dataset.summary = 'cutoff-hist';

    // const f = this.col.getCutOff();

    return (ctx: IRankingHeaderContext) => {
      const stats = <ICategoricalStatistics>ctx.statsOf(this.col);
      this.updateHist(stats, true);
      // TODO
    };
  }
}
