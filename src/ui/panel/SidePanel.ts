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
  isSupportType
} from '../../model';
import {categoryOfDesc} from '../../model/annotations';
import {default as Column, IColumnDesc} from '../../model/Column';
import Ranking from '../../model/Ranking';
import DataProvider, {IDataProvider} from '../../provider/ADataProvider';
import {IRankingHeaderContext} from '../interfaces';
import SearchBox, {IGroupSearchItem, ISearchBoxOptions} from './SearchBox';
import SidePanelEntry from './SidePanelEntry';

export interface ISidePanelOptions extends Partial<ISearchBoxOptions<SidePanelEntry>> {
  additionalDescs: IColumnDesc[];
  chooser: boolean;
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
    placeholder: 'Add Column...',
    formatItem: (item: SidePanelEntry | IGroupSearchItem<SidePanelEntry>, node: HTMLElement) => {
      node.dataset.typeCat = item instanceof SidePanelEntry ? item.category.name : (<SidePanelEntry>item.children[0]).category.name;
      if (item instanceof SidePanelEntry) {
        node.dataset.type = item.desc.type;
      }
      return item.text;
    },
    collapseable: true
  };

  readonly node: HTMLElement;
  private readonly search: SearchBox<SidePanelEntry>;
  private readonly descs = new Map<IColumnDesc, SidePanelEntry>();
  private data: IDataProvider;

  constructor(private ctx: IRankingHeaderContext, document: Document, options: Partial<ISidePanelOptions> = {}) {
    Object.assign(this.options, options);

    this.node = document.createElement('aside');
    this.node.classList.add('lu-side-panel');

    this.search = new SearchBox<SidePanelEntry>(this.options);

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
    this.search.on(SearchBox.EVENT_SELECT, (panel: SidePanelEntry) => {
      const col = this.data.create(panel.desc);
      if (!col) {
        return;
      }
      this.data.getLastRanking().push(col);
    });
  }

  private changeDataStorage(old: IDataProvider | null, data: IDataProvider) {
    const that = this;
    if (old) {
      old.on(suffix('.panel', DataProvider.EVENT_ADD_RANKING, DataProvider.EVENT_REMOVE_RANKING,
        DataProvider.EVENT_ADD_DESC, DataProvider.EVENT_CLEAR_DESC, DataProvider.EVENT_ORDER_CHANGED, DataProvider.EVENT_SELECTION_CHANGED), null);
    }
    this.data = data;
    this.descs.forEach((v) => v.destroyVis());
    this.descs.clear();
    data.getColumns().concat(this.options.additionalDescs).forEach((col) => {
      this.descs.set(col, new SidePanelEntry(col, categoryOfDesc(col, data.columnTypes)));
    });

    const handleRanking = (ranking: Ranking, added: boolean) => {
      const change = added ? +1 : -1;
      ranking.flatColumns.forEach((col) => {
        const entry = this.getDescLike(col.desc);
        if (entry) {
          entry.used += change;
        }
      });

      if (!added) {
        ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN), null);
        return;
      }

      ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIA_CHANGED), () => {
        if (ranking === data.getRankings()[0]) {
          // primary ranking only
          this.updateList();
        }
      });
      ranking.on(suffix('.panel', DataProvider.EVENT_ADD_COLUMN, DataProvider.EVENT_REMOVE_COLUMN), function (this: { type: string }, col) {
        const desc = col.desc;
        const added = this.type === 'addColumn';
        const entry = that.getDescLike(desc);
        if (!entry) {
          return;
        }
        entry.used += added ? +1 : -1;
        that.updateList();
      });
    };
    // init data
    data.getRankings().forEach((ranking) => handleRanking(ranking, true));

    data.on(`${DataProvider.EVENT_ADD_DESC}.panel`, (desc) => {
      const v = new SidePanelEntry(desc, categoryOfDesc(desc, data.columnTypes));
      that.descs.set(desc, v);
      this.updateChooser();
    });

    data.on(`${DataProvider.EVENT_CLEAR_DESC}.panel`, () => {
      that.descs.forEach((v) => v.destroyVis());
      that.descs.clear();
      this.updateChooser();
    });

    data.on(suffix('.panel', DataProvider.EVENT_SELECTION_CHANGED, DataProvider.EVENT_ORDER_CHANGED), () => {
      this.updateStats();
    });

    data.on(suffix('.panel', DataProvider.EVENT_ADD_RANKING, DataProvider.EVENT_REMOVE_RANKING), function (this: { type: string }, ranking: Ranking) {
      if (ranking) {
        handleRanking(ranking, this.type === 'addRanking');
      } else {
        that.descs.forEach((v) => v.destroyVis());
        that.descs.clear();
      }
      that.updateList();
    });

    this.updateStats();
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
  }

  private updateStats() {
    if (this.collapsed) {
      return;
    }
    const stats = <HTMLElement>this.node.querySelector('aside.lu-stats');
    const s = this.data.getSelection();
    const r = this.data.getRankings()[0];
    const visible = r ? r.getGroups().reduce((a, b) => a + b.order.length, 0) : 0;
    stats.innerHTML = `Showing <strong>${visible}</strong> of ${this.data.getTotalNumberOfRows()} items${s.length > 0 ? `; ${s.length} <span>selected</span>` : ''}`;
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
  }

  private columnOrder() {
    // sort column by first ranking order
    const ranking = this.data.getRankings()[0];
    if (!ranking) {
      return [];
    }
    const hierarchy = ranking.getGroupCriteria();
    const used = new Set(hierarchy.map((d) => d.desc));

    ranking.getSortCriteria().forEach(({col}) => {
      if (used.has(col.desc)) {
        return;
      }
      hierarchy.push(col);
      used.add(col.desc);
    });
    // add rest in ranking order
    ranking.flatColumns.forEach((c) => {
      if (used.has(c.desc) || isSupportType(c)) {
        return;
      }
      hierarchy.push(c);
      used.add(c.desc);
    });
    return hierarchy;
  }

  private prepareListData() {
    const order = this.columnOrder();
    // columns with reference column impl
    const referenceColumns = new Map<IColumnDesc, Column>();

    // preset with the order
    order.forEach((col) => referenceColumns.set(col.desc, col));

    this.data.getRankings().forEach((ranking) => {
      ranking.flatColumns.forEach((col) => {
        const key = col.desc;
        // just if not already part of
        if (referenceColumns.has(key) || isSupportType(col)) {
          return;
        }
        referenceColumns.set(key, col);
      });
    });
    const columns = Array.from(referenceColumns.values());

    // sort by order
    columns.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai < 0) {
        return bi < 0 ? 0 : 1;
      }
      if (bi < 0) {
        return -1;
      }
      return ai - bi;
    });

    return columns;

  }

  private getDescLike(desc: IColumnDesc) {
    const entry = this.descs.get(desc);
    if (entry) {
      return entry;
    }
    // composite?
    const generic = this.options.additionalDescs.find((d) => d.type === desc.type);
    if (generic) {
      return this.descs.get(generic) || null;
    }
    return null;
  }

  private updateList() {
    if (this.collapsed) {
      return;
    }
    const node = this.node.querySelector('main')!;
    const columns = this.prepareListData();

    if (columns.length === 0 || this.descs.size === 0) {
      node.innerHTML = '';
      this.descs.forEach((d) => d.destroyVis());
      return;
    }

    node.innerHTML = ``;

    columns.forEach((col) => {
      const entry = this.getDescLike(col.desc);
      if (!entry) {
        return;
      }
      if (entry.visColumn === col) {
        node.appendChild(entry.updateVis(this.ctx)!);
        return;
      }
      entry.destroyVis();
      node.appendChild(entry.createVis(col, this.ctx, node.ownerDocument));
    });
  }


  private static groupByType(entries: SidePanelEntry[]): { key: string, values: SidePanelEntry[] }[] {
    const map = new Map<{ label: string, order: number }, SidePanelEntry[]>();
    entries.forEach((entry) => {
      if (!map.has(entry.category)) {
        map.set(entry.category, [entry]);
      } else {
        map.get(entry.category)!.push(entry);
      }
    });
    return Array.from(map).map(([key, value]) => {
      return {
        key: key.label,
        order: key.order,
        values: value.sort((a, b) => a.text.localeCompare(b.text))
      };
    }).sort((a, b) => a.order - b.order);
  }

  private updateChooser() {
    if (!this.options.chooser || this.collapsed) {
      return;
    }
    const groups = SidePanel.groupByType(Array.from(this.descs.values()));

    this.search.data = groups.map((g) => {
      return {
        text: g.key,
        children: g.values
      };
    });
  }
}
