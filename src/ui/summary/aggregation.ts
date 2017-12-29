import AggregateGroupColumn from '../../model/AggregateGroupColumn';
import {IRankingHeaderContext} from '../interfaces';

export default function summaryAggregation(col: AggregateGroupColumn, node: HTMLElement, _interactive: boolean, ctx: IRankingHeaderContext) {
  const old = node.dataset.summary;
  node.dataset.summary = 'aggregation';
  if (old !== 'aggregation') {
    //init
    let defaultValue = 'down';
    const ranking = col.findMyRanker();
    if (ranking) {
      const all = ranking.getGroups().every((g) => col.isAggregated(g));
      if (all) {
        defaultValue = 'right';
      }
    }
    node.innerHTML = `<i class='ul-caret-${defaultValue}' title='(Un)Aggregate All'></i>`;
  }
  const button = (<HTMLElement>node.firstElementChild);
  button.onclick = (evt) => {
    evt.stopPropagation();
    const ranking = col.findMyRanker();
    if (!ranking) {
      return;
    }
    const aggregate = button.classList.contains('ul-caret-down');
    button.classList.toggle('ul-caret-down');
    button.classList.toggle('ul-caret-right');
    ctx.provider.aggregateAllOf(ranking, aggregate);
  };
}
