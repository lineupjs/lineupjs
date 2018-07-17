import Ranking from '../../model/Ranking';
import {matchColumns} from '../../renderer/utils';
import Column from '../../model/Column';
import {ISortCriteria} from '../../model/Ranking';


/**
 * @internal
 */
export default class Hierarchy {
  readonly node: HTMLElement;

  constructor(document: Document) {
    this.node = document.createElement('aside');
    this.node.classList.add('lu-hierarchy');
    this.node.innerHTML = `
      <section>
      </section>
      <hr></hr>
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
    matchColumns(node, groups.map((d) => ({column: d, template: `<div><span>${d.label}</span><div></div></div>`, rendererId: 'h'})));
  }

  private renderSorting(sort: ISortCriteria[], node: HTMLElement) {
    matchColumns(node, sort.map((d) => ({column: d.col, template: `<div><span>${d.col.label}</span><div></div></div>`, rendererId: 'h'})));
  }
}
