/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {merge, suffix} from '../../utils';
import {nest} from 'd3';
import Ranking from '../../model/Ranking';
import {IColumnDesc} from '../../model/Column';
import SidePanelEntry from './SidePanelEntry';
import {DataProvider} from 'lineupjs/src/provider';
import {IDataProvider} from '../../provider/ADataProvider';

export interface ISidePanelOptions {
  additionalDescs: IColumnDesc[];
}

export default class SidePanel {

  private readonly options: ISidePanelOptions = {
    additionalDescs: []
  };

  readonly node: HTMLElement;
  private entries: SidePanelEntry[];

  constructor(private data: IDataProvider, document: Document, options: Partial<ISidePanelOptions> = {}) {
    merge(this.options, options);

    this.node = document.createElement('aside');
    this.node.classList.add('lu-side-panel');
    this.init();
    this.changeDataStorage(data);
  }

  private init() {
    this.node.innerHTML = `
      <header>
        <form>
            <select>
                <option value="">Add Column...</option>
            </select>
        </form>
      </header>
      <main></main>
    `;
    this.node.querySelector('header select')!.addEventListener('change', (evt) => {
      evt.preventDefault();
      const id = (<HTMLSelectElement>evt.currentTarget).value;
      if (id === '') {
        return;
      }
      const entry = this.entries.find((d) => d.id === id)!;
      console.assert(Boolean(entry));

      const col = this.data.create(entry.desc);
      if (!col) {
        return;
      }
      this.data.getLastRanking().push(col);
    });
  }

  changeDataStorage(data: IDataProvider) {
    if (this.data) {
      this.data.on(suffix('.panel', DataProvider.EVENT_ADD_RANKING, DataProvider.EVENT_REMOVE_RANKING,
        DataProvider.EVENT_ADD_DESC), null);
    }
    this.data = data;
    this.entries = data.getColumns().concat(this.options.additionalDescs).map((d) => new SidePanelEntry(d));
    const lookup = new Map(this.entries.map((d) => (<[IColumnDesc, SidePanelEntry]>[d.desc, d])));

    const handleRanking = (ranking: Ranking, added: boolean) => {
      const change = added ? +1 : -1;
      ranking.flatColumns.forEach((col) => {
        if (lookup.has(col.desc)) {
          lookup.get(col.desc)!.used += change;
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
        if (!lookup.has(desc)) {
          return;
        }
        const entry = lookup.get(desc)!;
        entry.used += added ? +1 : -1;
        that.updateList();
      });
    };
    // init data
    data.getRankings().forEach((ranking) => handleRanking(ranking, true));

    data.on(`${DataProvider.EVENT_ADD_DESC}.panel`, (desc) => {
      const v = new SidePanelEntry(desc);
      this.entries.push(v);
      lookup.set(desc, v);
      this.updateChooser();
    });
    const that = this;

    data.on(suffix('.panel', DataProvider.EVENT_ADD_RANKING, DataProvider.EVENT_REMOVE_RANKING), function (this: { type: string }, ranking: Ranking) {
      handleRanking(ranking, this.type === 'addRanking');
      that.updateList();
    });

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

  private updateList() {

  }


  private static groupByType(entries: SidePanelEntry[]): {key: string, values: SidePanelEntry[]}[] {
    const order = ['label', 'categorical', 'numerical', 'matrix', 'combined', 'others'];
    return nest<SidePanelEntry>().key((entry) => {
      switch(entry.desc.type) {
        case 'string': return order[0];
        case 'ordinal':
        case 'categorical': return order[1];
        case 'number': return order[2];
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
          return order[4];
        default:
          return order[5];
      }
    }).sortKeys((a, b) => order.indexOf(a) - order.indexOf(b))
      .sortValues((a, b) => a.name.localeCompare(b.name))
      .entries(entries);
  }

  private updateChooser() {
    const select = <HTMLSelectElement>this.node.querySelector('header select')!;
    const groups = SidePanel.groupByType(this.entries);

    const renderGroup = ({key, values}: {key: string, values: SidePanelEntry[]}) => {
      return `<optgroup label="${key[0].toUpperCase()}${key.slice(1)}">
          ${values.map((v) => `<option value="${v.id}">${v.name}</option>`).join('')}
      </optgroup>`;
    };

    select.innerHTML = `
      <option>Add Column...</option>
      ${groups.map(renderGroup).join('')}
    `;
  }
}
