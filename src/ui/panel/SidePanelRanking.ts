import {suffix} from '../../internal/AEventDispatcher';
import {isSupportType} from '../../model';
import Ranking from '../../model/Ranking';
import {IRankingHeaderContext} from '../interfaces';
import Hierarchy from './Hierarchy';
import {ISidePanelOptions} from './SidePanel';
import SidePanelEntryVis from './SidePanelEntryVis';


export default class SidePanelRanking {

  readonly header: HTMLElement;
  readonly node: HTMLElement;
  private readonly hierarchy: Hierarchy | null;
  private readonly entries = new Map<string, SidePanelEntryVis>();

  constructor(public readonly ranking: Ranking, private ctx: IRankingHeaderContext, document: Document, private readonly options: Readonly<ISidePanelOptions>) {
    this.node = document.createElement('section');
    this.header = document.createElement('div');
    this.header.innerText = ranking.id; // TODO better label

    this.hierarchy = this.options.hierarchy ? new Hierarchy(ctx, document) : null;

    this.init();
  }

  private init() {
    this.node.innerHTML = `
      <div><main></main></div>
    `;
    if (this.hierarchy) {
      this.node.insertBefore(this.hierarchy.node, this.node.firstChild);
    }

    if (this.hierarchy) {
      this.ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIA_CHANGED), () => {
        this.updateHierarchy();
      });
    }
    this.ranking.on(suffix('.panel', Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_REMOVE_COLUMN, Ranking.EVENT_MOVE_COLUMN), () => {
      this.updateList();
      this.updateHierarchy();
    });
  }

  get active() {
    return this.node.classList.contains('lu-active');
  }

  set active(value: boolean) {
    this.node.classList.toggle('lu-active', value);
    this.header.classList.toggle('lu-active', value);
    if (value) {
      return;
    }
    this.updateList();
    this.updateHierarchy();
  }

  update(ctx: IRankingHeaderContext) {
    this.ctx = ctx;
    this.updateList();
    this.updateHierarchy();
  }

  private updateHierarchy() {
    if (!this.hierarchy || !this.active) {
      return;
    }
    this.hierarchy.update(this.ranking);
  }

  private updateList() {
    if (!this.active) {
      return;
    }
    const node = this.node.querySelector('main')!;
    const columns = this.ranking.flatColumns.filter((d) => !isSupportType(d));

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

  destroy() {
    this.header.remove();
    this.node.remove();
    this.ranking.on(suffix('.panel', Ranking.EVENT_GROUP_CRITERIA_CHANGED, Ranking.EVENT_SORT_CRITERIA_CHANGED, Ranking.EVENT_ADD_COLUMN, Ranking.EVENT_MOVE_COLUMN, Ranking.EVENT_REMOVE_COLUMN), null);

    this.entries.forEach((d) => d.destroy());
    this.entries.clear();
  }
}
