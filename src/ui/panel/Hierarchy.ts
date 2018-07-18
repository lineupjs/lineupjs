import Ranking from '../../model/Ranking';
import Column from '../../model/Column';
import {ISortCriteria} from '../../model/Ranking';
import {dragAbleColumn, updateHeader} from '../header';
import {IRankingHeaderContext} from '../interfaces';


/**
 * @internal
 */
export default class Hierarchy {
  readonly node: HTMLElement;

  constructor(private readonly ctx: IRankingHeaderContext, document: Document) {
    this.node = document.createElement('aside');
    this.node.classList.add('lu-hierarchy');
    this.node.innerHTML = `
      <section>
      </section>
      <section>
      </section>
    `;
  }

  update(ranking: Ranking | null) {
    if (!ranking) {
      this.node.style.display = 'none';
      return;
    }
    this.node.style.display = null;

    this.renderGroups(ranking.getGroupCriteria(), <HTMLElement>this.node.firstElementChild!);
    this.renderSorting(ranking.getSortCriteria(), <HTMLElement>this.node.lastElementChild!);
  }

  private renderGroups(groups: Column[], node: HTMLElement) {
    const cache = new Map((<HTMLElement[]>Array.from(node.children)).map((d) => <[string, HTMLElement]>[d.dataset.id, d]));
    node.innerHTML = '';
    groups.forEach((col) => {
      const item = cache.get(col.id);
      if (item) {
        node.appendChild(item);
        updateHeader(item, col);
        return;
      }
      node.insertAdjacentHTML('beforeend', `<div data-id="${col.id}" class="lu-toolbar">
      <i title="Group" class="lu-action" data-group="true"><span aria-hidden="true">Group</span> </i>
      <div class="lu-label">${col.label}</div>
      <i title="Up" class="lu-action"><span aria-hidden="true">Up</span> </i>
      <i title="Down" class="lu-action"><span aria-hidden="true">Down</span> </i>
      <i title="Remove" class="lu-action"><span aria-hidden="true">Remove</span> </i>
      </div>`);
      const last = <HTMLElement>node.lastElementChild!;
      dragAbleColumn(last, col, this.ctx);
      updateHeader(last, col);
    });
  }

  private renderSorting(sortCriterias: ISortCriteria[], node: HTMLElement) {
    const cache = new Map((<HTMLElement[]>Array.from(node.children)).map((d) => <[string, HTMLElement]>[d.dataset.id, d]));
    node.innerHTML = '';
    sortCriterias.forEach(({col, asc}) => {
      const item = cache.get(col.id);
      if (item) {
        node.appendChild(item);
        updateHeader(item, col);
        return;
      }
      node.insertAdjacentHTML('beforeend', `<div data-id="${col.id}" class="lu-toolbar">
        <i title="Sort" class="lu-action" data-sort="${asc ? 'asc' : 'desc'}"><span aria-hidden="true">Toggle Sorting</span> </i>
        <div class="lu-label">${col.label}</div>
        <i title="Up" class="lu-action"><span aria-hidden="true">Up</span> </i>
        <i title="Down" class="lu-action"><span aria-hidden="true">Down</span> </i>
        <i title="Remove" class="lu-action"><span aria-hidden="true">Remove</span> </i>
        </div>`);
      const last = <HTMLElement>node.lastElementChild!;
      (<HTMLElement>last.querySelector('i[title=Sort]')!).onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        const current = col.isSortedByMe();
        col.sortByMe(!current.asc, current.priority);
      };
      (<HTMLElement>last.querySelector('i[title=Down]')!).onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        const current = col.isSortedByMe();
        col.sortByMe(current.asc === 'asc', current.priority! + 1);
      };
      (<HTMLElement>last.querySelector('i[title=Up]')!).onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        const current = col.isSortedByMe();
        col.sortByMe(current.asc === 'asc', current.priority! - 1);
      };
      dragAbleColumn(last, col, this.ctx);
      updateHeader(last, col);
    });
  }
}
