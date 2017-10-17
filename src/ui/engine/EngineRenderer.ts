/**
 * Created by Samuel Gratzl on 18.07.2017.
 */
import {AEventDispatcher, findOption} from '../../utils';
import {default as ABodyRenderer} from '../ABodyRenderer';
import DataProvider, {default as ADataProvider, IDataRow} from '../../provider/ADataProvider';
import {default as Column, ICategoricalStatistics, IStatistics} from '../../model/Column';
import {createDOM, createDOMGroup} from '../../renderer';
import {IGroupItem, IRankingHeaderContext, IRankingHeaderContextContainer, isGroup} from './interfaces';
import {ILineUpRenderer} from '../interfaces';
import {ILineUpConfig, IRenderingOptions} from '../../interfaces';
import {ICategoricalColumn, isCategoricalColumn} from '../../model/CategoricalColumn';
import NumberColumn from '../../model/NumberColumn';
import {nonUniformContext} from 'lineupengine/src/logic';
import {IDOMRenderContext} from '../../renderer/RendererContexts';
import MultiTableRowRenderer from 'lineupengine/src/table/MultiTableRowRenderer';
import Ranking from '../../model/Ranking';
import SlopeGraph from './SlopeGraph';
import EngineRanking, {IEngineRankingContext} from './EngineRanking';

export default class EngineRenderer extends AEventDispatcher implements ILineUpRenderer {
  static readonly EVENT_HOVER_CHANGED = ABodyRenderer.EVENT_HOVER_CHANGED;
  static readonly EVENT_RENDER_FINISHED = ABodyRenderer.EVENT_RENDER_FINISHED;

  protected readonly options: Readonly<ILineUpConfig>;

  private readonly histCache = new Map<string, IStatistics | ICategoricalStatistics | null | Promise<IStatistics | ICategoricalStatistics>>();

  readonly node: HTMLElement;
  private readonly table: MultiTableRowRenderer;
  private readonly rankings: EngineRanking[] = [];
  private readonly slopeGraphs: SlopeGraph[] = [];

  readonly ctx: IRankingHeaderContextContainer & IDOMRenderContext & IEngineRankingContext;

  private readonly updateAbles: ((ctx: IRankingHeaderContext) => void)[] = [];
  private zoomFactor = 1;

  constructor(private data: DataProvider, parent: Element, options: Readonly<ILineUpConfig>) {
    super();
    this.options = options;
    this.node = parent.ownerDocument.createElement('main');
    parent.appendChild(this.node);

    this.ctx = {
      provider: data,
      filters: this.options.header.filters!,
      summaries: this.options.header.summaries ? this.options.header.summaries! : {},
      linkTemplates: this.options.header.linkTemplates!,
      autoRotateLabels: this.options.header.autoRotateLabels!,
      searchAble: this.options.header.searchAble!,
      option: findOption(Object.assign({useGridLayout: true}, this.options.body)),
      statsOf: (col: Column) => {
        const r = this.histCache.get(col.id);
        if (r == null || r instanceof Promise) {
          return null;
        }
        return r;
      },
      renderer: (col: Column) => createDOM(col, this.options.renderers, this.ctx),
      groupRenderer: (col: Column) => createDOMGroup(col, this.options.renderers, this.ctx),
      idPrefix: this.options.idPrefix,
      totalNumberOfRows: 0,
      createRenderer: (col: Column) => {
        const single = createDOM(col, this.options.renderers, this.ctx);
        const group = createDOMGroup(col, this.options.renderers, this.ctx);
        return {single, group, singleId: col.getRendererType(), groupId: col.getGroupRenderer()};
      },
      columnPadding: this.options.body.columnPadding || 5
    };

    this.node.id = this.options.idPrefix;
    this.table = new MultiTableRowRenderer(this.node, `#${options.idPrefix}`);

    this.initProvider(data);
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
    this.slopeGraphs.forEach((s) => this.table.remove(s));
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

  private updateHist(ranking?: EngineRanking) {
    if (!this.options.header.summary) {
      return;
    }
    const rankings = ranking ? [ranking] : this.rankings;
    rankings.forEach((r) => {
      const ranking = r.ranking;
      const order = ranking.getOrder();
      const cols = ranking.flatColumns;
      const histo = order == null ? null : this.data.stats(order);
      cols.filter((d) => d instanceof NumberColumn && !d.isHidden()).forEach((col: NumberColumn) => {
        this.histCache.set(col.id, histo === null ? null : histo.stats(col));
      });
      cols.filter((d) => isCategoricalColumn(d) && !d.isHidden()).forEach((col: ICategoricalColumn & Column) => {
        this.histCache.set(col.id, histo === null ? null : histo.hist(col));
      });
      r.updateHeaders();
    });

    this.updateAbles.forEach((u) => u(this.ctx));
  }

  private addRanking(ranking: Ranking) {
    if (this.rankings.length > 0) {
      // add slope graph first
      const s = this.table.pushSeparator((header, body) => new SlopeGraph(header, body, `${ranking.id}S`, this.ctx));
      this.slopeGraphs.push(s);
    }

    let r: EngineRanking;
    r = this.table.pushTable((header, body, tableId, style) => new EngineRanking(ranking, header, body, tableId, style, this.ctx, {
      widthChanged: () => this.table.widthChanged(),
      updateData: () => r ? this.update([r]) : null
    }));
    ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.renderer`, () => this.updateHist(r));
    this.rankings.push(r);
    this.update([r]);
  }

  private removeRanking(ranking: Ranking) {
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
    // TODO support async
    const localData = data.map((d) => d.map((d) => <IDataRow>d));

    if (this.histCache.size === 0) {
      this.updateHist();
    }

    const itemHeight = Math.round(this.zoomFactor * this.options.body.rowHeight!);
    const groupHeight = Math.round(this.zoomFactor * this.options.body.groupHeight!);
    const groupPadding = Math.round(this.zoomFactor * this.options.body.groupPadding!);
    const rowPadding = Math.round(this.zoomFactor * this.options.body.rowPadding!);

    rankings.forEach((r, i) => {
      const grouped = r.groupData(localData[i]);
      const rowContext = nonUniformContext(grouped.map((d) => isGroup(d) ? groupHeight : itemHeight), itemHeight, (index) => {
        if (index >= 0 && grouped[index] && (isGroup(grouped[index]) || (<IGroupItem>grouped[index]).meta === 'last')) {
          return groupPadding + rowPadding;
        }
        return rowPadding;
      });
      r.render(grouped, rowContext);
    });

    this.updateSlopeGraphs(rankings);

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
