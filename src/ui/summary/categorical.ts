
//
// export default class CategoricalSummary {
//   update: (ctx: IContextIsh) => void;
//
//   constructor(private readonly col: ICategoricalColumn, private readonly node: HTMLElement, interactive: boolean) {
//     if (col.categories.length > DENSE_HISTOGRAM * 2) {
//       // no rendering at all
//       this.update = () => undefined;
//       return;
//     }
//     const interactiveOne = (col instanceof CategoricalColumn || col instanceof OrdinalColumn);
//     if (!interactive || !interactiveOne) {
//       this.update = interactiveOne ? this.initStaticFilter() : this.initStatic();
//       return;
//     }
//     this.update = this.initInteractive();
//   }
//
//   private initInteractive() {
//     const col = <CategoricalColumn | OrdinalColumn>this.col;
//     this.node.dataset.summary = 'interactive-filter-hist';
//
//     const common = this.initCommon(true);
//     const interactive = this.interactiveHist(col);
//
//     const f = col.getFilter();
//     this.node.insertAdjacentHTML('beforeend', filterMissingNumberMarkup(f != null && f.filterMissing, 0));
//     const filterMissing = <HTMLInputElement>this.node.querySelector('input')!;
//
//     filterMissing.onchange = () => {
//       // toggle filter
//       const v = filterMissing.checked;
//       const old = col.getFilter();
//       if (old == null) {
//         col.setFilter(v ? {filterMissing: v, filter: col.categories.map((d) => d.name)} : null);
//       } else {
//         col.setFilter({filterMissing: v, filter: old.filter});
//       }
//     };
//
//     return (ctx: IContextIsh) => {
//       const stats = <ICategoricalStatistics>ctx.statsOf(this.col);
//       common(stats);
//       interactive();
//       const f = col.getFilter();
//       filterMissing.checked = f != null && f.filterMissing;
//       updateFilterMissingNumberMarkup(<HTMLElement>filterMissing.parentElement, stats ? stats.missing : 0);
//     };
//   }
// }
