import Ranking from '../../model/Ranking';
import Column from '../../model/Column';
import {ISortCriteria} from '../../model/Ranking';
import {updateHeader} from '../header';
import {IRankingHeaderContext} from '../interfaces';
import SearchBox, {ISearchBoxOptions} from './SearchBox';
import {isSupportType, categoryOf, isSortingAscByDefault} from '../../model/annotations';
import {isSortAble, isGroupAble} from '../toolbar';

interface IColumnItem {
  col: Column;
  id: string;
  text: string;
}
/**
 * @internal
 */
export default class Hierarchy {
  readonly node: HTMLElement;
  readonly groupAdder: SearchBox<IColumnItem>;
  readonly sortAdder: SearchBox<IColumnItem>;

  constructor(private readonly ctx: IRankingHeaderContext, document: Document) {
    this.node = document.createElement('aside');
    this.node.classList.add('lu-hierarchy');
    this.node.innerHTML = `
      <section>
      </section>
      <section>
      </section>
    `;
    const options = <Partial<ISearchBoxOptions<IColumnItem>>>{
      doc: document,
      placeholder: 'Add Sort Criteria...',
      formatItem: (item: IColumnItem, node: HTMLElement) => {
        node.dataset.typeCat = categoryOf(item.col).name;
        node.dataset.type = item.col.desc.type;
        return item.text;
      },

    };
    this.groupAdder = new SearchBox(Object.assign({}, options, {
      placeholder: 'Add Grouping Criteria...'
    }));
    this.sortAdder = new SearchBox(options);
  }

  update(ranking: Ranking | null) {
    if (!ranking) {
      this.node.style.display = 'none';
      return;
    }
    this.node.style.display = null;
    this.renderGroups(ranking, <HTMLElement>this.node.firstElementChild!);
    this.renderSorting(ranking, <HTMLElement>this.node.lastElementChild!);
  }

  private renderGroups(ranking: Ranking, node: HTMLElement) {
    const groups = ranking.getGroupCriteria();

    if (groups.length === 0) {
      node.innerHTML = '';
      return;
    }
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
      <i title="Move Up" class="lu-action"><span aria-hidden="true">Move Up</span> </i>
      <i title="Move Down" class="lu-action"><span aria-hidden="true">Move Down</span> </i>
      <i title="Remove from hierarchy" class="lu-action"><span aria-hidden="true">Remove from hierarchy</span> </i>
      </div>`);
      const last = <HTMLElement>node.lastElementChild!;

      function common(evt: Event) {
        evt.preventDefault();
        evt.stopPropagation();
        return col.isGroupedBy();
      }

      (<HTMLElement>last.querySelector('i[title="Move Down"]')!).onclick = (evt) => {
        const current = common(evt);
        col.findMyRanker()!.groupBy(col, current + 1);
      };
      (<HTMLElement>last.querySelector('i[title="Move Up"]')!).onclick = (evt) => {
        const current = common(evt);
        col.findMyRanker()!.groupBy(col, current - 1);
      };
      (<HTMLElement>last.querySelector('i[title^=Remove]')!).onclick = (evt) => {
        common(evt);
        col.groupByMe(); // toggle
      };
      updateHeader(last, col);
    });

    this.addGroupAdder(ranking, groups, node);
  }

  private renderSorting(ranking: Ranking, node: HTMLElement) {
    const sortCriterias = ranking.getSortCriteria();

    if (sortCriterias.length === 0) {
      node.innerHTML = '';
      return;
    }
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
        <i title="Move Up" class="lu-action"><span aria-hidden="true">Move Up</span> </i>
        <i title="Move Down" class="lu-action"><span aria-hidden="true">Move Down</span> </i>
        <i title="Remove from hierarchy" class="lu-action"><span aria-hidden="true">Remove from hierarchy</span> </i>
        </div>`);

      function common(evt: Event) {
        evt.preventDefault();
        evt.stopPropagation();
        return col.isSortedByMe();
      }

      const last = <HTMLElement>node.lastElementChild!;
      (<HTMLElement>last.querySelector('i[title=Sort]')!).onclick = (evt) => {
        const current = common(evt);
        col.sortByMe(current.asc === 'desc', current.priority);
      };
      (<HTMLElement>last.querySelector('i[title="Move Down"]')!).onclick = (evt) => {
        const current = common(evt);
        col.sortByMe(current.asc === 'asc', current.priority! + 1);
      };
      (<HTMLElement>last.querySelector('i[title="Move Up"]')!).onclick = (evt) => {
        const current = common(evt);
        col.sortByMe(current.asc === 'asc', current.priority! - 1);
      };
      (<HTMLElement>last.querySelector('i[title^=Remove]')!).onclick = (evt) => {
        const current = common(evt);
        col.sortByMe(current.asc === 'asc', -1);
      };
      updateHeader(last, col);
    });


    this.addSortAdder(ranking, sortCriterias, node);
  }

  private addSortAdder(ranking: Ranking, sortCriterias: ISortCriteria[], node: HTMLElement) {
    const used = new Set(sortCriterias.map((d) => d.col));

    this.sortAdder.data = ranking.children.filter((col) => !isSupportType(col) && !used.has(col) && isSortAble(col, this.ctx)).map((col) => ({col, id: col.id, text: col.label}));

    this.sortAdder.on(SearchBox.EVENT_SELECT, (item: IColumnItem) => {
      ranking.sortBy(item.col, isSortingAscByDefault(item.col), sortCriterias.length);
    });

    if (this.sortAdder.data.length <= 0) {
      return;
    }

    const wrapper = node.ownerDocument.createElement('footer');
    wrapper.appendChild(this.sortAdder.node);
    node.appendChild(wrapper);
  }

  private addGroupAdder(ranking: Ranking, groups: Column[], node: HTMLElement) {
    const used = new Set(groups);

    this.groupAdder.data = ranking.children.filter((col) => !isSupportType(col) && !used.has(col) && isGroupAble(col, this.ctx)).map((col) => ({col, id: col.id, text: col.label}));

    this.groupAdder.on(SearchBox.EVENT_SELECT, (item: IColumnItem) => {
      ranking.groupBy(item.col, groups.length);
    });

    if (this.groupAdder.data.length <= 0) {
      return;
    }

    const wrapper = node.ownerDocument.createElement('footer');
    wrapper.appendChild(this.groupAdder.node);
    node.appendChild(wrapper);
  }
}

