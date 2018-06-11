import {default as Column, IColumnDesc} from '../../model/Column';
import {IRankingHeaderContext} from '../interfaces';
import SidePanelEntryVis from './SidePanelEntryVis';

export default class SidePanelEntry {
  used = 0;
  private vis: SidePanelEntryVis | null = null;

  constructor(public readonly desc: IColumnDesc, public readonly category: { label: string, order: number, name: string }) {

  }

  get text() {
    return this.desc.label;
  }

  get id() {
    return `${this.desc.type}@${this.desc.label}`;
  }

  destroyVis() {
    if (this.vis) {
      this.vis.destroy();
    }
  }

  get visColumn() {
    return this.vis ? this.vis.column : null;
  }

  updateVis(ctx: IRankingHeaderContext) {
    if (this.vis) {
      this.vis.update(ctx);
      return this.vis.node;
    }
    return null;
  }

  createVis(column: Column, ctx: IRankingHeaderContext, document: Document) {
    this.vis = new SidePanelEntryVis(column, ctx, document);
    return this.vis.node;
  }
}
