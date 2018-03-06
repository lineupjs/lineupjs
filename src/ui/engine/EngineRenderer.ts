/**
 * Created by Samuel Gratzl on 18.07.2017.
 */
import {AEventDispatcher, findOption, round, suffix} from '../../utils';
import DataProvider, {default as ADataProvider, IDataRow} from '../../provider/ADataProvider';
import {default as Column, ICategoricalStatistics, IStatistics} from '../../model/Column';
import {createDOM, createDOMGroup, possibleGroupRenderer, possibleRenderer} from '../../renderer';
import {IGroupData, IGroupItem, IRankingHeaderContext, IRankingHeaderContextContainer, isGroup} from './interfaces';
import {
  ILineUpRenderer, ISummaryFunction, RENDERER_EVENT_HOVER_CHANGED,
  RENDERER_EVENT_RENDER_FINISHED
} from '../interfaces';
import {IRenderingOptions} from '../../interfaces';
import {ICategoricalColumn, isCategoricalColumn} from '../../model/ICategoricalColumn';
import NumberColumn from '../../model/NumberColumn';
import {nonUniformContext} from 'lineupengine/src/logic';
import {IDOMRenderContext} from '../../renderer/RendererContexts';
import MultiTableRowRenderer from 'lineupengine/src/table/MultiTableRowRenderer';
import Ranking from '../../model/Ranking';
import SlopeGraph from './SlopeGraph';
import EngineRanking, {IEngineRankingContext} from './EngineRanking';
import {IFilterDialog} from '../../dialogs/AFilterDialog';
import ICellRendererFactory from '../../renderer/ICellRendererFactory';
import {IImposer} from '../../renderer/IRenderContext';

export interface IEngineRendererOptions {
  header: Partial<{
    filters: {[type: string]: IFilterDialog},
    summaries: {[type: string]: ISummaryFunction};
    summary: boolean;
    linkTemplates: string[];

    autoRotateLabels: boolean;
    rotationHeight: number;
    rotationDegree: number;

    searchAble(col: Column): boolean;
  }>;

  body: Partial<{
    animation: boolean;
    columnPadding: number;
    actions: {name: string, icon: string, action(v: any): void}[];
    groupHeight: number;
    groupPadding: number;
    rowPadding: number;
    rowHeight: number;
    dynamicHeight?: (data: (IGroupItem | IGroupData)[], ranking: Ranking) => {defaultHeight: number, height: (item: IGroupItem | IGroupData) => number};
    customRowUpdate?: (row: HTMLElement, rowIndex: number) => void;

    /**
     * striped alterating background
     */
    striped: boolean;
  }>;

  renderers: {[key: string]: ICellRendererFactory};
  idPrefix: string;
}

export default class EngineRenderer extends AEventDispatcher implements ILineUpRenderer {
  static readonly EVENT_HOVER_CHANGED = RENDERER_EVENT_HOVER_CHANGED;
  static readonly EVENT_RENDER_FINISHED = RENDERER_EVENT_RENDER_FINISHED;

  protected readonly options: Readonly<IEngineRendererOptions>;

  private readonly histCache = new Map<string, IStatistics | ICategoricalStatistics | null | Promise<IStatistics | ICategoricalStatistics>>();

  readonly node: HTMLElement;
  private readonly table: MultiTableRowRenderer;
  private readonly rankings: EngineRanking[] = [];
  private readonly slopeGraphs: SlopeGraph[] = [];

  readonly ctx: IRankingHeaderContextContainer & IDOMRenderContext & IEngineRankingContext;

  private readonly updateAbles: ((ctx: IRankingHeaderContext) => void)[] = [];
  private zoomFactor = 1;

  constructor(protected data: DataProvider, parent: Element, options: Readonly<IEngineRendererOptions>) {
    super();
    this.options = options;
    this.node = parent.ownerDocument.createElement('main');
    parent.appendChild(this.node);

    this.ctx = {
      provider: data,
      filters: this.options.header.filters!,
      summaries: this.options.header.summaries ? this.options.header.summaries! : {},
      linkTemplates: this.options.header.linkTemplates!,
      autoRotateLabels: false,
      searchAble: this.options.header.searchAble!,
      option: findOption(Object.assign({useGridLayout: true}, this.options.body)),
      statsOf: (col: Column) => {
        const r = this.histCache.get(col.id);
        if (r == null || r instanceof Promise) {
          return null;
        }
        return r;
      },
      renderer: (col: Column, imposer?: IImposer) => createDOM(col, this.options.renderers, this.ctx, imposer),
      groupRenderer: (col: Column, imposer?: IImposer) => createDOMGroup(col, this.options.renderers, this.ctx, imposer),
      idPrefix: this.options.idPrefix,
      totalNumberOfRows: 0,
      createRenderer: (col: Column, imposer?: IImposer) => {
        const single = createDOM(col, this.options.renderers, this.ctx, imposer);
        const group = createDOMGroup(col, this.options.renderers, this.ctx, imposer);
        return {single, group, singleId: col.getRendererType(), groupId: col.getGroupRenderer()};
      },
      getPossibleRenderer: (col: Column) => ({item: possibleRenderer(col, this.options.renderers), group: possibleGroupRenderer(col, this.options.renderers)}),
      columnPadding: this.options.body.columnPadding || 5
    };

    this.node.id = this.options.idPrefix;
    this.table = new MultiTableRowRenderer(this.node, `#${options.idPrefix}`);

    this.node.classList.toggle('lineup-engine-striped', Boolean(this.options.body.striped));

    if (this.options.header.autoRotateLabels) {
      this.table.style.addRule('lineup_rotation', `
       #${this.options.idPrefix}.lu-rotated-label .lu-label.lu-rotated {
          transform: rotate(${this.options.header.rotationDegree}deg);
       }`);
      this.table.style.addRule('lineup_rotation2', `
       #${this.options.idPrefix}.lu-rotated-label section.lu-header {
          padding-top: ${this.options.header.rotationHeight}px;
       }`);
    }


    this.initProvider(data);
  }

  private updateRotatedHeaderState() {
    if (!this.options.header.autoRotateLabels) {
      return;
    }
    const l = this.node.querySelector('.lu-label.lu-rotated');
    this.node.classList.toggle('lu-rotated-label', Boolean(l));
  }

  zoomOut() {
    this.zoomFactor = Math.max(this.zoomFactor - 0.1, 0.5);
    this.updateZoomFactor();
    this.update();
  }

  zoomIn() {
    this.zoomFactor = Math.min(this.zoomFactor + 0.1, 2.0);
    this.updateZoomFactor();
    this.update();
  }

  private updateZoomFactor() {
    const body = <HTMLElement>this.node.querySelector('main')!;
    body.style.fontSize = `${this.zoomFactor * 100}%`;
  }

  pushUpdateAble(updateAble: (ctx: IRankingHeaderContext) => void) {
    this.updateAbles.push(updateAble);
  }

  protected createEventList() {
    return super.createEventList().concat([EngineRenderer.EVENT_HOVER_CHANGED, EngineRenderer.EVENT_RENDER_FINISHED]);
  }

  changeDataStorage(data: DataProvider) {
    this.takeDownProvider();

    this.data = data;
    this.ctx.provider = data;

    this.initProvider(data);
  }

  private takeDownProvider() {
    this.data.on(`${ADataProvider.EVENT_SELECTION_CHANGED}.body`, null);
    this.data.on(`${DataProvider.EVENT_ADD_RANKING}.body`, null);
    this.data.on(`${DataProvider.EVENT_REMOVE_RANKING}.body`, null);
    this.data.on(`${DataProvider.EVENT_GROUP_AGGREGATION_CHANGED}.body`, null);

    this.rankings.forEach((r) => this.table.remove(r));
    this.rankings.splice(0, this.rankings.length);
    this.slopeGraphs.forEach((s) => this.table.remove(s));
    this.slopeGraphs.splice(0, this.slopeGraphs.length);
  }

  private initProvider(data: DataProvider) {
    data.on(`${ADataProvider.EVENT_SELECTION_CHANGED}.body`, () => this.updateSelection(data.getSelection()));
    data.on(`${DataProvider.EVENT_ADD_RANKING}.body`, (ranking: Ranking) => {
      this.addRanking(ranking);
    });
    data.on(`${DataProvider.EVENT_REMOVE_RANKING}.body`, (ranking: Ranking) => {
      this.removeRanking(ranking);
    });
    data.on(`${DataProvider.EVENT_GROUP_AGGREGATION_CHANGED}.body`, (ranking: Ranking) => {
      this.update(this.rankings.filter((r) => r.ranking === ranking));
    });

    this.data.getRankings().forEach((r) => this.addRanking(r));
  }

  private updateSelection(dataIndices: number[]) {
    const s = new Set(dataIndices);
    this.rankings.forEach((r) => r.updateSelection(s));

    this.slopeGraphs.forEach((r) => r.updateSelection(s));
  }

  private updateHist(ranking?: EngineRanking, col?: Column) {
    if (!this.options.header.summary) {
      return;
    }
    const rankings = ranking ? [ranking] : this.rankings;
    rankings.forEach((r) => {
      const ranking = r.ranking;
      const order = ranking.getOrder();
      const cols = col ? [col] : ranking.flatColumns;
      const histo = order == null ? null : this.data.stats(order);
      cols.filter((d) => d instanceof NumberColumn && !d.isHidden()).forEach((col: NumberColumn) => {
        this.histCache.set(col.id, histo === null ? null : histo.stats(col));
      });
      cols.filter((d) => isCategoricalColumn(d) && !d.isHidden()).forEach((col: ICategoricalColumn & Column) => {
        this.histCache.set(col.id, histo === null ? null : histo.hist(col));
      });
      if (col) {
        // single update
        r.updateHeaderOfColumn(col);
      } else {
        r.updateHeaders();
      }
    });

    this.updateAbles.forEach((u) => u(this.ctx));
  }

  private addRanking(ranking: Ranking) {
    if (this.rankings.length > 0) {
      // add slope graph first
      const s = this.table.pushSeparator((header, body) => new SlopeGraph(header, body, `${ranking.id}S`, this.ctx));
      this.slopeGraphs.push(s);
    }

    const r = this.table.pushTable((header, body, tableId, style) => new EngineRanking(ranking, header, body, tableId, style, this.ctx, {
      animation: this.options.body.animation,
      customRowUpdate: this.options.body.customRowUpdate || (() => undefined)
    }));
    r.on(EngineRanking.EVENT_WIDTH_CHANGED, () => {
      this.updateRotatedHeaderState();
      this.table.widthChanged();
    });
    r.on(EngineRanking.EVENT_UPDATE_DATA, () => this.update([r]));
    r.on(EngineRanking.EVENT_UPDATE_HIST, (col: Column) => this.updateHist(r, col));

    ranking.on(suffix('.renderer', Ranking.EVENT_ORDER_CHANGED), () => this.updateHist(r));

    this.rankings.push(r);
    this.update([r]);
  }

  private removeRanking(ranking: Ranking | null) {
    if (!ranking) {
      // remove all
      this.rankings.splice(0, this.rankings.length);
      this.slopeGraphs.splice(0, this.slopeGraphs.length);
      this.table.clear();
      return;
    }
    const index = this.rankings.findIndex((r) => r.ranking === ranking);
    if (index < 0) {
      return; // error
    }
    const section = this.rankings.splice(index, 1)[0]!;
    const slope = this.slopeGraphs.splice(index - 1, 1)[0];
    this.table.remove(section);
    if (slope) {
      this.table.remove(slope);
    }
  }

  update(rankings: EngineRanking[] = this.rankings) {
    rankings = rankings.filter((d) => !d.hidden);
    if (rankings.length === 0) {
      return;
    }
    const orders = rankings.map((r) => r.ranking.getOrder());
    const data = this.data.fetch(orders);

    (<any>this.ctx).totalNumberOfRows = Math.max(...data.map((d) => d.length));

    // TODO support async
    const localData = data.map((d) => d.map((d) => <IDataRow>d));

    if (this.histCache.size === 0) {
      this.updateHist();
    }

    const round2 = (v: number) => round(v, 2);


    const heightsFor = (ranking: Ranking, data: (IGroupItem | IGroupData)[]) => {
      if (this.options.body.dynamicHeight) {
        const impl = this.options.body.dynamicHeight(data, ranking);
        return {
          defaultHeight: round2(this.zoomFactor * impl.defaultHeight),
          height: (d: IGroupItem | IGroupData) => round2(this.zoomFactor * impl.height(d))
        };
      }
      const item = round2(this.zoomFactor * this.options.body.rowHeight!);
      const group = round2(this.zoomFactor * this.options.body.groupHeight!);
      return {
        defaultHeight: item,
        height: (d: IGroupItem | IGroupData) => isGroup(d) ? group : item
      };
    };
    const groupPadding = round2(this.zoomFactor * this.options.body.groupPadding!);
    const rowPadding = round2(this.zoomFactor * this.options.body.rowPadding!);

    rankings.forEach((r, i) => {
      const grouped = r.groupData(localData[i]);

      const {height, defaultHeight} = heightsFor(r.ranking, grouped);

      const rowContext = nonUniformContext(grouped.map(height), defaultHeight, (index) => {
        if (index >= 0 && grouped[index] && (isGroup(grouped[index]) || (<IGroupItem>grouped[index]).meta === 'last' || (<IGroupItem>grouped[index]).meta === 'first last')) {
          return groupPadding + rowPadding;
        }
        return rowPadding;
      });
      r.render(grouped, rowContext);
    });

    this.updateSlopeGraphs(rankings);

    this.updateRotatedHeaderState();
    this.table.widthChanged();
  }

  private updateSlopeGraphs(rankings: EngineRanking[] = this.rankings) {
    const indices = new Set(rankings.map((d) => this.rankings.indexOf(d)));
    this.slopeGraphs.forEach((s, i) => {
      if (s.hidden) {
        return;
      }
      const left = i;
      const right = i + 1;
      if (!indices.has(left) && !indices.has(right)) {
        return;
      }
      const leftRanking = this.rankings[left];
      const rightRanking = this.rankings[right];
      s.rebuild(leftRanking.currentData, leftRanking.context, rightRanking.currentData, rightRanking.context);
    });
  }

  fakeHover(dataIndex: number) {
    this.rankings.forEach((r) => r.fakeHover(dataIndex));
  }

  destroy() {
    this.takeDownProvider();
    this.table.destroy();
    this.node.remove();
  }

  scrollIntoView(_index: number) {
    // TODO
  }

  setBodyOption(_option: keyof IRenderingOptions, _value: boolean) {
    // TODO
  }
}

