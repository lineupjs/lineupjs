import {IDynamicHeight, ILineUpOptions} from '../interfaces';
import {IGroupData, IGroupItem} from '../model';
import Ranking from '../model/Ranking';
import {ICellRendererFactory} from '../renderer';
import {IToolbarAction} from '../ui';

export default class LineUpBuilder {
  protected readonly options: Partial<ILineUpOptions> = {
    renderers: {},
    toolbar: {}
  };

  animated(enable: boolean) {
    this.options.animation = enable;
    return this;
  }

  sidePanel(enable: boolean, collapsed: boolean = false) {
    this.options.panel = enable;
    this.options.panelCollapsed = collapsed;
    return this;
  }

  summaryHeader(enable: boolean) {
    this.options.summary = enable;
    return this;
  }

  expandLineOnHover(enable: boolean) {
    this.options.wholeHover = enable;
    return this;
  }

  registerRenderer(id: string, factory: ICellRendererFactory) {
    this.options.renderers![id] = factory;
    return this;
  }

  registerToolbarAction(id: string, action: IToolbarAction) {
    this.options.toolbar![id] = action;
    return this;
  }

  rowHeight(rowHeight: number, rowPadding: number) {
    this.options.rowHeight = rowHeight;
    this.options.rowPadding = rowPadding;
    return this;
  }

  groupRowHeight(groupHeight: number, groupPadding: number) {
    this.options.groupHeight = groupHeight;
    this.options.groupPadding = groupPadding;
    return this;
  }

  dynamicHeight(callback: (data: (IGroupItem | IGroupData)[], ranking: Ranking) => (IDynamicHeight | null)) {
    this.options.dynamicHeight = callback;
    return this;
  }
}
