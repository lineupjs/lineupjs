import {IDynamicHeight, ILineUpOptions} from '../interfaces';
import {IGroupData, IGroupItem} from '../model';
import Ranking from '../model/Ranking';
import ADataProvider from '../provider/ADataProvider';
import {ICellRendererFactory} from '../renderer';
import {ISummaryRenderer} from '../ui/interfaces';
import LineUp from '../ui/LineUp';
import Taggle from '../ui/taggle/Taggle';
import {IToolbarAction} from '../ui/toolbar';

export default class LineUpBuilder {
  private readonly options: Partial<ILineUpOptions> = {
    summaries: {},
    renderers: {},
    toolbar: {}
  };

  animated(enable: boolean) {
    this.options.animation = enable;
    return this;
  }

  sidePanel(enable: boolean) {
    this.options.panel = enable;
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

  registerSummary(id: string, clazz: ISummaryRenderer<any>) {
    this.options.summaries![id] = clazz;
    return this;
  }

  registerToolbarAction(id: string, action: IToolbarAction) {
    this.options.toolbar![id] = action;
    return this;
  }

  buildLineUp(node: HTMLElement, data: ADataProvider) {
    return new LineUp(node, data, this.options);
  }

  buildTaggle(node: HTMLElement, data: ADataProvider) {
    return new Taggle(node, data, this.options);
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
  }
}
