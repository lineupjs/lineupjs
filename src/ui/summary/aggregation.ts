import AggregateGroupColumn from '../../model/AggregateGroupColumn';
import {IRankingHeaderContext} from '../interfaces';

export default class AggregationSummary {
  private ctx: IRankingHeaderContext;

  constructor(col: AggregateGroupColumn, node: HTMLElement) {
    node.dataset.summary = 'aggregation';

    let defaultValue = 'down';
    const ranking = col.findMyRanker();
    if (ranking) {
      const all = ranking.getGroups().every((g) => col.isAggregated(g));
      if (all) {
        defaultValue = 'right';
      }
    }
    node.innerHTML = `<i class='ul-caret-${defaultValue}' title='(Un)Aggregate All'></i>`;
    const button = (<HTMLElement>node.firstElementChild);

    button.onclick = (evt) => {
      evt.stopPropagation();
      const ranking = col.findMyRanker();
      if (!ranking || !this.ctx) {
        return;
      }
      const aggregate = button.classList.contains('ul-caret-down');
      button.classList.toggle('ul-caret-down');
      button.classList.toggle('ul-caret-right');
      this.ctx.provider.aggregateAllOf(ranking, aggregate);
    };
  }

  update(ctx: IRankingHeaderContext) {
    this.ctx = ctx;
  }
}
