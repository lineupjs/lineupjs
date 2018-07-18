import {suffix} from '../../internal/AEventDispatcher';
import {
  createImpositionDesc,
  createNestedDesc,
  createReduceDesc,
  createScriptDesc,
  createStackDesc,
  createRankDesc,
  createGroupDesc,
  createAggregateDesc,
  createSelectionDesc,
  isSupportType,
  IColumnDesc
} from '../../model';
import {categoryOfDesc} from '../../model/annotations';
import Ranking from '../../model/Ranking';
import DataProvider, {IDataProvider} from '../../provider/ADataProvider';
import {IRankingHeaderContext} from '../interfaces';
import SearchBox, {IGroupSearchItem, ISearchBoxOptions} from './SearchBox';
import Hierarchy from './Hierarchy';
import SidePanelEntryVis from './SidePanelEntryVis';


interface IColumnDescCategory {
  label: string;
  name: string;
  order: number;
}

interface IColumnWrapper {
  desc: IColumnDesc;
  category: IColumnDescCategory;
  id: string;
  text: string;
}

function isWrapper(item: IColumnWrapper | IGroupSearchItem<IColumnWrapper>): item is IColumnWrapper {
  return (<IColumnWrapper>item).desc != null;
}

export interface ISidePanelOptions extends Partial<ISearchBoxOptions<IColumnWrapper>> {
  additionalDescs: IColumnDesc[];
  chooser: boolean;
  hierarchy: boolean;
  collapseable: boolean | 'collapsed';
}

export default class SidePanel {

  private readonly options: ISidePanelOptions = {
    additionalDescs: [
      createStackDesc('Weighted Sum'),
      createScriptDesc('Scripted Formula'),
      createNestedDesc('Nested'),
      createReduceDesc(),
      createImpositionDesc(),
      createRankDesc(),
      createSelectionDesc(),
      createGroupDesc(),
      createAggregateDesc(),
    ],
    chooser: true,
    hierarchy: true,
    placeholder: 'Add Column...',
    formatItem: (item: IColumnWrapper | IGroupSearchItem<IColumnWrapper>, node: HTMLElement) => {
      node.dataset.typeCat = isWrapper(item) ? item.category.name : (<IColumnWrapper>item.children[0]).category.name;
      if (isWrapper(item)) {
        node.dataset.type = item.desc.type;
      }
      return item.text;
    },
    collapseable: true
  };

  readonly node: HTMLElement;
  private readonly hierarchy: Hierarchy | null;
  private readonly search: SearchBox<IColumnWrapper>;
  private readonly descs: IColumnWrapper[] = [];
  private readonly entries = new Map<string, SidePanelEntryVis>();
  private data: IDataProvider;

  constructor(private ctx: IRankingHeaderContext, document: Document, options: Partial<ISidePanelOptions> = {}) {
    Object.assign(this.options, options);

    this.node = document.createElement('aside');
    this.node.classList.add('lu-side-panel');

    this.search = new SearchBox<IColumnWrapper>(this.options);
    this.hierarchy = this.options.hierarchy ? new Hierarchy(ctx, document) : null;

    this.data = ctx.provider;
    this.init();
    this.update(ctx);
  }

  private init() {
    this.node.innerHTML = `
      <aside class="lu-stats"></aside>
      <div><main></main></div>
    `;
    if (this.options.collapseable) {
      this.node.insertAdjacentHTML('beforeend', `<div class="lu-collapser" title="Collapse Panel"></div>`);
      const last = <HTMLElement>this.node.lastElementChild;
      last.onclick = () => this.collapsed = !this.collapsed;
      this.collapsed = this.options.collapseable === 'collapsed';
    }
    if (this.hierarchy) {
      this.node.insertBefore(this.hierarchy.node, this.node.children[1]);
    }
    this.initChooser();
    this.changeDataStorage(null, this.data);
  }

  private initChooser() {
    if (!this.options.chooser) {
      return;
    }
    this.node.insertAdjacentHTML('afterbegin', `<header>
        <form></form>
      </header>`);

    this.node.querySelector('form')!.appendChild(this.search.node);
    this.search.on(SearchBox.EVENT_SELECT, (panel: IColumnWrapper) => {
      const col = this.data.create(panel.desc);
      if (!col) {
        return;
      }
      this.data.getFirstRanking()!.push(col);
    });
  }

  private changeDataStorage(old: IDataProvider | null, data: IDataProvider) {
    if (old) {
      old.on(suffix('.panel', DataProvider.EVENT_ADD_RANKING, DataProvider.EVENT_REMOVE_RANKING,
        DataProvider.EVENT_ADD_DESC, DataProvider.EVENT_CLEAR_DESC, DataProvider.EVENT_ORDER_CHANGED, DataProvider.EVENT_SELECTION_CHANGED), null);
    }
    this.data = data;

    const wrapDesc = (desc: IColumnDesc) => ({
        desc,
        category: categoryOfDesc(desc, data.columnTypes),
        id: `${desc.type}@${desc.label}`,
        text: desc.label
      });
    this.descs.splice(0, this.descs.length, ...data.getColumns().concat(this.options.additionalDescs).map(wrapDesc));

    data.on(`${DataProvider.EVENT_ADD_DESC}.panel`, (desc) => {
      this.descs.push(wrapDesc(desc));
      this.updateChooser();
    });

    data.on(`${DataProvider.EVENT_CLEAR_DESC}.panel`, () => {
      this.descs.splice(0, this.descs.length);
      this.updateChooser();
    });

    const handleRanking = (ranking: Ranking, added: boolean) => {
      if (!added) {
        ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_MOVE_COLUMN), null);
        return;
      }

      if (this.hierarchy) {
        ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIA_CHANGED), () => {
          this.hierarchy!.update(ranking);
        });
      }
      ranking.on(suffix('.panel', Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_MOVE_COLUMN), () => {
        this.updateList();
        this.updateHierarchy();
      });
    };

    data.on(suffix('.panel', DataProvider.EVENT_SELECTION_CHANGED, DataProvider.EVENT_ORDER_CHANGED), () => {
      this.updateStats();
    });

    let primary = data.getFirstRanking();

    if (primary) {
      handleRanking(primary, true);
    }

    data.on(suffix('.panel', DataProvider.EVENT_ADD_RANKING), (ranking: Ranking) => {
      const p = data.getFirstRanking();
      if (p !== ranking) {
        return;
      }
      if (primary) {
        handleRanking(primary, false);
      }
      primary = ranking;
      handleRanking(primary, true);
      this.updateList();
      this.updateHierarchy();
    });

    data.on(suffix('.panel', DataProvider.EVENT_REMOVE_RANKING), (ranking: Ranking) => {
      if (ranking !== primary) {
        return;
      }
      handleRanking(primary, false);
      primary = data.getFirstRanking();
      if (primary) {
        handleRanking(primary, true);
      }
      this.updateList();
      this.updateHierarchy();
    });

    this.updateList();
    this.updateStats();
    this.updateHierarchy();
  }

  get collapsed() {
    return this.node.classList.contains('lu-collapsed');
  }

  set collapsed(value: boolean) {
    this.node.classList.toggle('lu-collapsed', value);
    if (value) {
      return;
    }
    this.updateChooser();
    this.updateList();
    this.updateStats();
    this.updateHierarchy();
  }

  update(ctx: IRankingHeaderContext) {
    const bak = this.data;
    this.ctx = ctx;
    if (ctx.provider !== bak) {
      this.changeDataStorage(bak, ctx.provider);
    }
    this.updateChooser();
    this.updateList();
    this.updateStats();
    this.updateHierarchy();
  }

  private updateStats() {
    if (this.collapsed) {
      return;
    }
    const stats = <HTMLElement>this.node.querySelector('aside.lu-stats');
    const s = this.data.getSelection();
    const r = this.data.getFirstRanking();
    const visible = r ? r.getGroups().reduce((a, b) => a + b.order.length, 0) : 0;
    stats.innerHTML = `Showing <strong>${visible}</strong> of ${this.data.getTotalNumberOfRows()} items${s.length > 0 ? `; ${s.length} <span>selected</span>` : ''}`;
  }

  private updateHierarchy() {
    if (this.collapsed || !this.hierarchy) {
      return;
    }
    const r = this.data.getFirstRanking();
    this.hierarchy.update(r ? r : null);
  }

  destroy() {
    this.node.remove();
    if (!this.data) {
      return;
    }
    this.data.getRankings().forEach((ranking) => {
      ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN), null);
    });
    this.data.on(suffix('.panel', DataProvider.EVENT_ADD_RANKING, DataProvider.EVENT_REMOVE_RANKING,
      DataProvider.EVENT_ADD_DESC), null);
    this.entries.forEach((d) => d.destroy());
    this.entries.clear();
  }

  private columnOrder() {
    // sort column by first ranking order
    const ranking = this.data.getRankings()[0];
    if (!ranking) {
      return [];
    }
    return ranking.flatColumns.filter((d) => !isSupportType(d));
  }

  private updateList() {
    if (this.collapsed) {
      return;
    }
    const node = this.node.querySelector('main')!;
    const columns = this.columnOrder();

    if (columns.length === 0) {
      node.innerHTML = '';
      this.entries.forEach((d) => d.destroy());
      this.entries.clear();
      return;
    }

    node.innerHTML = ``;

    const copy = new Map(this.entries);
    this.entries.clear();

    columns.forEach((col) => {
      const existing = copy.get(col.id);
      if (existing) {
        existing.update(this.ctx);
        node.appendChild(existing.node);
        this.entries.set(col.id, existing);
        copy.delete(col.id);
        return;
      }

      const entry = new SidePanelEntryVis(col, this.ctx, node.ownerDocument);
      node.appendChild(entry.node);
      this.entries.set(col.id, entry);
    });

    copy.forEach((d) => d.destroy());
  }


  private static groupByType(entries: IColumnWrapper[]): { text: string, children: IColumnWrapper[] }[] {
    const map = new Map<IColumnDescCategory, IColumnWrapper[]>();
    entries.forEach((entry) => {
      if (!map.has(entry.category)) {
        map.set(entry.category, [entry]);
      } else {
        map.get(entry.category)!.push(entry);
      }
    });
    return Array.from(map).map(([key, value]) => {
      return {
        text: key.label,
        order: key.order,
        children: value.sort((a, b) => a.text.localeCompare(b.text))
      };
    }).sort((a, b) => a.order - b.order);
  }

  private updateChooser() {
    if (!this.options.chooser || this.collapsed) {
      return;
    }
    this.search.data = SidePanel.groupByType(this.descs);
  }
}
