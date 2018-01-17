/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {suffix} from '../../utils';
import {nest} from 'd3';
import Ranking, {isSupportType} from '../../model/Ranking';
import {default as Column, IColumnDesc} from '../../model/Column';
import SidePanelEntry from './SidePanelEntry';
import DataProvider, {IDataProvider} from '../../provider/ADataProvider';
import {IRankingHeaderContext} from '../engine/interfaces';
import SearchBox, {ISearchBoxOptions} from './SearchBox';
import {createStackDesc, createScriptDesc, createNestedDesc, createMaxDesc, createMeanDesc, createMinDesc, createImpositionDesc} from '../../model';

export interface ISidePanelOptions extends Partial<ISearchBoxOptions<SidePanelEntry>> {
  additionalDescs: IColumnDesc[];
  chooser: boolean;
}

export default class SidePanel {

  protected readonly options: ISidePanelOptions = {
    additionalDescs: [
      createStackDesc('Weighted Sum'),
      createScriptDesc('Scripted Formula'),
      createNestedDesc('Nested'),
      createMaxDesc(),
      createMinDesc(),
      createMeanDesc(),
      createImpositionDesc()
    ],
    chooser: true,
    placeholder: 'Add Column...'
  };

  readonly node: HTMLElement;
  private readonly search: SearchBox<SidePanelEntry>;
  protected readonly descs = new Map<IColumnDesc, SidePanelEntry>();
  protected data: IDataProvider;

  constructor(protected ctx: IRankingHeaderContext, document: Document, options: Partial<ISidePanelOptions> = {}) {
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
      <div><main></main></div>
    `;
    this.initChooser();
    this.changeDataStorage(null, this.data);
  }

  protected initChooser() {
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
        DataProvider.EVENT_ADD_DESC, DataProvider.EVENT_CLEAR_DESC), null);
    }
    this.data = data;
    this.descs.forEach((v) => v.destroyVis());
    this.descs.clear();
    data.getColumns().concat(this.options.additionalDescs).forEach((col) => {
      this.descs.set(col, new SidePanelEntry(col));
    });

    const handleRanking = (ranking: Ranking, added: boolean) => {
      const change = added ? +1 : -1;
      ranking.flatColumns.forEach((col) => {
        if (this.descs.has(col.desc)) {
          this.descs.get(col.desc)!.used += change;
        }
      });

      if (!added) {
        ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIAS_CHANGED, Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN), null);
        return;
      }

      ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIAS_CHANGED), () => {
        if (ranking === data.getRankings()[0]) {
          // primary ranking only
          this.updateList();
        }
      });
      ranking.on(suffix('.panel', DataProvider.EVENT_ADD_COLUMN, DataProvider.EVENT_REMOVE_COLUMN), function (this: { type: string }, col) {
        const desc = col.desc;
        const added = this.type === 'addColumn';
        if (!that.descs.has(desc)) {
          return;
        }
        const entry = that.descs.get(desc)!;
        entry.used += added ? +1 : -1;
        that.updateList();
      });
    };
    // init data
    data.getRankings().forEach((ranking) => handleRanking(ranking, true));

    data.on(`${DataProvider.EVENT_ADD_DESC}.panel`, (desc) => {
      const v = new SidePanelEntry(desc);
      that.descs.set(desc, v);
      this.updateChooser();
    });

    data.on(`${DataProvider.EVENT_CLEAR_DESC}.panel`, () => {
      that.descs.forEach((v) => v.destroyVis());
      that.descs.clear();
      this.updateChooser();
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
  }

  update(ctx: IRankingHeaderContext) {
    const bak = this.data;
    this.ctx = ctx;
    if (ctx.provider !== bak) {
      this.changeDataStorage(bak, ctx.provider);
    }

    this.updateChooser();
    this.updateList();
  }

  remove() {
    this.node.remove();
    if (!this.data) {
      return;
    }
    this.data.getRankings().forEach((ranking) => {
      ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIAS_CHANGED, Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN), null);
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

    ranking.getSortCriterias().forEach(({col}) => {
      if (used.has(col.desc)) {
        return;
      }
      hierarchy.push(col);
      used.add(col.desc);
    });
    // add rest in ranking order
    ranking.flatColumns.forEach((c) => {
      if (used.has(c.desc)) {
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
        if (referenceColumns.has(key) || isSupportType(key)) {
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

  private updateList() {
    const node = this.node.querySelector('main')!;
    const columns = this.prepareListData();

    if (columns.length === 0) {
      node.innerHTML = '';
      this.descs.forEach((d) => d.destroyVis());
      return;
    }

    node.innerHTML = ``;

    columns.forEach((col) => {
      const entry = this.descs.get(col.desc);
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


  protected static groupByType(entries: SidePanelEntry[]): { key: string, values: SidePanelEntry[] }[] {
    const order = ['label', 'categorical', 'numerical', 'matrix', 'combined', 'others'];
    return nest<SidePanelEntry>().key((entry) => {
      switch (entry.desc.type) {
        case 'string':
          return order[0];
        case 'ordinal':
        case 'categorical':
          return order[1];
        case 'number':
          return order[2];
        case 'numbers':
        case 'booleans':
        case 'boxplot':
          return order[3];
        case 'stack':
        case 'min':
        case 'max':
        case 'mean':
        case 'script':
        case 'nested':
        case 'imposition':
          return order[4];
        default:
          return order[5];
      }
    }).sortKeys((a, b) => order.indexOf(a) - order.indexOf(b))
      .sortValues((a, b) => a.text.localeCompare(b.text))
      .entries(entries);
  }

  protected updateChooser() {
    if (!this.options.chooser) {
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
