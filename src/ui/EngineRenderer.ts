import {nonUniformContext, MultiTableRowRenderer, GridStyleManager} from 'lineupengine';
import {ILineUpOptions} from '../interfaces';
import {findOption, ICategoricalStatistics, IStatistics, round} from '../internal';
import AEventDispatcher, {suffix} from '../internal/AEventDispatcher';
import {
  Column, ICategoricalColumn, IDataRow, IGroupData, IGroupItem, isCategoricalColumn, isGroup,
  isNumberColumn, INumberColumn
} from '../model';
import Ranking from '../model/Ranking';
import ADataProvider from '../provider/ADataProvider';
import {
  chooseGroupRenderer, chooseRenderer, chooseSummaryRenderer, IImposer, IRenderContext, possibleGroupRenderer,
  possibleRenderer, possibleSummaryRenderer
} from '../renderer';
import EngineRanking, {IEngineRankingContext} from './EngineRanking';
import {IRankingHeaderContext, IRankingHeaderContextContainer} from './interfaces';
import SlopeGraph, {EMode} from './SlopeGraph';
import DialogManager from './dialogs/DialogManager';


export default class EngineRenderer extends AEventDispatcher {
  static readonly EVENT_HIGHLIGHT_CHANGED = 'highlightChanged';

  protected readonly options: Readonly<ILineUpOptions>;

  private readonly histCache = new Map<string, IStatistics | ICategoricalStatistics | null | Promise<IStatistics | ICategoricalStatistics>>();

  readonly node: HTMLElement;
  private readonly table: MultiTableRowRenderer;
  private readonly rankings: EngineRanking[] = [];
  private readonly slopeGraphs: SlopeGraph[] = [];

  readonly ctx: IRankingHeaderContextContainer & IRenderContext & IEngineRankingContext;

  private readonly updateAbles: ((ctx: IRankingHeaderContext) => void)[] = [];
  private zoomFactor = 1;
  readonly idPrefix = `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`; //generate a random string with length3;

  private enabledHighlightListening: boolean = false;

  constructor(protected data: ADataProvider, parent: HTMLElement, options: Readonly<ILineUpOptions>) {
    super();
    this.options = options;
    this.node = parent.ownerDocument.createElement('main');
    this.node.id = this.idPrefix;
    this.node.classList.toggle('lu-whole-hover', options.expandLineOnHover);
    parent.appendChild(this.node);

    const statsOf = (col: Column) => {
      const r = this.histCache.get(col.id);
      if (r == null || r instanceof Promise) {
        return null;
      }
      return r;
    };
    const dialogManager = new DialogManager(parent.ownerDocument);
    parent.appendChild(dialogManager.node);
    this.ctx = {
      idPrefix: this.idPrefix,
      document: parent.ownerDocument,
      provider: data,
      dialogManager,
      toolbar: this.options.toolbar,
      option: findOption(Object.assign({useGridLayout: true}, this.options)),
      statsOf,
      renderer: (col: Column, imposer?: IImposer) => {
        const r = chooseRenderer(col, this.options.renderers);
        return r.create(col, this.ctx, statsOf(col), imposer);
      },
      groupRenderer: (col: Column, imposer?: IImposer) => {
        const r = chooseGroupRenderer(col, this.options.renderers);
        return r.createGroup(col, this.ctx, statsOf(col), imposer);
      },
      summaryRenderer: (col: Column, interactive: boolean, imposer?: IImposer) => {
        const r = chooseSummaryRenderer(col, this.options.renderers);
        return r.createSummary(col, this.ctx, interactive, imposer);
      },
      totalNumberOfRows: 0,
      createRenderer(col: Column, imposer?: IImposer) {
        const single = this.renderer(col, imposer);
        const group = this.groupRenderer(col, imposer);
        const summary = options.summaryHeader ? this.summaryRenderer(col, false, imposer) : null;
        return {
          single,
          group,
          summary,
          singleId: col.getRenderer(),
          groupId: col.getGroupRenderer(),
          summaryId: col.getSummaryRenderer(),
          singleTemplate: null,
          groupTemplate: null,
          summaryTemplate: null
        };
      },
      getPossibleRenderer: (col: Column) => ({
        item: possibleRenderer(col, this.options.renderers),
        group: possibleGroupRenderer(col, this.options.renderers),
        summary: possibleSummaryRenderer(col, this.options.renderers)
      }),
      colWidth: (col: Column) => !col.isVisible() ? 0 : col.getWidth()
    };

    this.table = new MultiTableRowRenderer(this.node, `#${this.idPrefix}`);

    //apply rules
    {
      this.style.addRule('lineup_groupPadding', `
       #${this.idPrefix} .lu-row[data-agg=group],
       #${this.idPrefix} .lu-row[data-meta~=last] {
        margin-bottom: ${options.groupPadding}px;
       }`, false);

      this.style.addRule('lineup_rowPadding', `
       #${this.idPrefix} .lu-row[data-lod] {
         padding-top: 0;
       }`, false);

       // padding in general and for hovered low detail rows + their afterwards
       this.style.addRule('lineup_rowPadding2', `
        #${this.idPrefix} .lu-row,
        #${this.idPrefix} .lu-row[data-lod]:hover,
        #${this.idPrefix} .lu-row[data-lod].le-highlighted,
        #${this.idPrefix} .lu-row[data-lod].lu-selected,
        #${this.idPrefix} .lu-row[data-lod]:hover + .lu-row,
        #${this.idPrefix} .lu-row[data-lod].le-highlighted + .lu-row,
        #${this.idPrefix} .lu-row[data-lod].lu-selected + .lu-row {
          padding-top: ${options.rowPadding}px;
        }`, false);

      this.style.addRule('lineup_rotation', `
       #${this.idPrefix}.lu-rotated-label .lu-label.lu-rotated {
           transform: rotate(${-this.options.labelRotation}deg);
       }`);
    }

    this.initProvider(data);
  }

  get style(): GridStyleManager {
    return this.table.style;
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
    return super.createEventList().concat([EngineRenderer.EVENT_HIGHLIGHT_CHANGED]);
  }

  setDataProvider(data: ADataProvider) {
    this.takeDownProvider();

    this.data = data;
    (<any>this.ctx).provider = data;

    this.initProvider(data);
  }

  private takeDownProvider() {
    this.data.on(`${ADataProvider.EVENT_SELECTION_CHANGED}.body`, null);
    this.data.on(`${ADataProvider.EVENT_ADD_RANKING}.body`, null);
    this.data.on(`${ADataProvider.EVENT_REMOVE_RANKING}.body`, null);
    this.data.on(`${ADataProvider.EVENT_GROUP_AGGREGATION_CHANGED}.body`, null);
    this.data.on(`${ADataProvider.EVENT_JUMP_TO_NEAREST}.body`, null);

    this.rankings.forEach((r) => this.table.remove(r));
    this.rankings.splice(0, this.rankings.length);
    this.slopeGraphs.forEach((s) => this.table.remove(s));
    this.slopeGraphs.splice(0, this.slopeGraphs.length);
  }

  private initProvider(data: ADataProvider) {
    data.on(`${ADataProvider.EVENT_SELECTION_CHANGED}.body`, () => this.updateSelection(data.getSelection()));
    data.on(`${ADataProvider.EVENT_ADD_RANKING}.body`, (ranking: Ranking) => {
      this.addRanking(ranking);
    });
    data.on(`${ADataProvider.EVENT_REMOVE_RANKING}.body`, (ranking: Ranking) => {
      this.removeRanking(ranking);
    });
    data.on(`${ADataProvider.EVENT_GROUP_AGGREGATION_CHANGED}.body`, (ranking: Ranking) => {
      this.update(this.rankings.filter((r) => r.ranking === ranking));
    });
    data.on(`${ADataProvider.EVENT_JUMP_TO_NEAREST}.body`, (indices: number[]) => {
      this.setHighlightToNearest(indices, true);
    });

    this.data.getRankings().forEach((r) => this.addRanking(r));
  }

  private updateSelection(dataIndices: number[]) {
    const s = new Set(dataIndices);
    this.rankings.forEach((r) => r.updateSelection(s));

    this.slopeGraphs.forEach((r) => r.updateSelection(s));
  }

  private updateHist(ranking?: EngineRanking, col?: Column) {
    if (!this.options.summaryHeader) {
      return;
    }
    const rankings = ranking ? [ranking] : this.rankings;
    rankings.forEach((r) => {
      const ranking = r.ranking;
      const order = ranking.getOrder();
      const cols = col ? [col] : ranking.flatColumns;
      const histo = order == null ? null : this.data.stats(order);
      cols.filter((d) => d.isVisible() && isNumberColumn(d)).forEach((col: Column) => {
        this.histCache.set(col.id, histo == null ? null : histo.stats(<INumberColumn>col));
      });
      cols.filter((d) => isCategoricalColumn(d) && d.isVisible()).forEach((col: Column) => {
        this.histCache.set(col.id, histo == null ? null : histo.hist(<ICategoricalColumn>col));
      });
      if (col) {
        // single update
        r.updateHeaderOf(col);
      } else {
        r.updateHeaders();
      }
    });

    this.updateAbles.forEach((u) => u(this.ctx));
  }

  private addRanking(ranking: Ranking) {
    if (this.rankings.length > 0) {
      // add slope graph first
      const s = this.table.pushSeparator((header, body) => new SlopeGraph(header, body, `${ranking.id}S`, this.ctx, {
        mode: this.options.defaultSlopeGraphMode === 'band' ? EMode.BAND : EMode.ITEM
      }));
      this.slopeGraphs.push(s);
    }

    const r = this.table.pushTable((header, body, tableId, style) => new EngineRanking(ranking, header, body, tableId, style, this.ctx, {
      animation: this.options.animated,
      customRowUpdate: this.options.customRowUpdate || (() => undefined),
      levelOfDetail: this.options.levelOfDetail || (() => 'high'),
      flags: this.options.flags
    }));
    r.on(EngineRanking.EVENT_WIDTH_CHANGED, () => {
      this.updateRotatedHeaderState();
      this.table.widthChanged();
    });
    r.on(EngineRanking.EVENT_UPDATE_DATA, () => this.update([r]));
    r.on(EngineRanking.EVENT_UPDATE_HIST, (col: Column) => this.updateHist(r, col));
    this.forward(r, EngineRanking.EVENT_HIGHLIGHT_CHANGED);
    if (this.enabledHighlightListening) {
      r.enableHighlightListening(true);
    }

    ranking.on(suffix('.renderer', Ranking.EVENT_ORDER_CHANGED), () => this.updateHist(r));

    this.rankings.push(r);
    this.update([r]);
  }

  private updateRotatedHeaderState() {
    if (this.options.labelRotation === 0) {
      return;
    }
    const l = this.node.querySelector('.lu-label.lu-rotated');
    this.node.classList.toggle('lu-rotated-label', Boolean(l));
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
    const slope = this.slopeGraphs.splice(index === 0 ? index : index - 1, 1)[0];
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
    const rowPadding = round2(this.zoomFactor * this.options.rowPadding!);
    const groupPadding = round2(this.zoomFactor * this.options.groupPadding!);

    const heightsFor = (ranking: Ranking, data: (IGroupItem | IGroupData)[]) => {
      if (this.options.dynamicHeight) {
        const impl = this.options.dynamicHeight(data, ranking);
        const f = (v: number | any, d: any) => typeof v === 'number' ? v : v(d);
        if (impl) {
          return {
            defaultHeight: round2(this.zoomFactor * impl.defaultHeight),
            height: (d: IGroupItem | IGroupData) => round2(this.zoomFactor * f(impl.height, d)),
            padding: (d: IGroupItem | IGroupData) => round2(this.zoomFactor * f(impl.padding, d)),
          };
        }
      }
      const item = round2(this.zoomFactor * this.options.rowHeight!);
      const group = round2(this.zoomFactor * this.options.groupHeight!);
      return {
        defaultHeight: item,
        height: (d: IGroupItem | IGroupData) => isGroup(d) ? group : item,
        padding: rowPadding
      };
    };

    rankings.forEach((r, i) => {
      const grouped = r.groupData(localData[i]);

      const {height, defaultHeight, padding} = heightsFor(r.ranking, grouped);

      const rowContext = nonUniformContext(grouped.map(height), defaultHeight, (index) => {
        const pad = (typeof padding === 'number' ? padding : padding(grouped[index] || null));
        if (index >= 0 && grouped[index] && (isGroup(grouped[index]) || (<IGroupItem>grouped[index]).meta === 'last' || (<IGroupItem>grouped[index]).meta === 'first last')) {
          return groupPadding + pad;
        }
        return pad;
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

  setHighlight(dataIndex: number, scrollIntoView: boolean) {
    const found = this.rankings.map((r) => r.setHighlight(dataIndex));
    this.fire(EngineRenderer.EVENT_HIGHLIGHT_CHANGED, dataIndex);
    if (this.rankings.length === 0 || dataIndex < 0) {
      return false;
    }
    if (!scrollIntoView) {
      return found[0]!;
    }
    return this.rankings[0].scrollIntoView(dataIndex);
  }

  setHighlightToNearest(dataIndices: number[], scrollIntoView: boolean) {
    if (this.rankings.length === 0) {
      return false;
    }
    const nearest = this.rankings[0].findNearest(dataIndices);
    if (nearest >= 0) {
      return this.setHighlight(nearest, scrollIntoView);
    }
    return false;
  }

  getHighlight() {
    for (const ranking of this.rankings) {
      const h = ranking.getHighlight();
      if (h >= 0) {
        return h;
      }
    }
    return -1;
  }

  enableHighlightListening(enable: boolean) {
    for (const ranking of this.rankings) {
        ranking.enableHighlightListening(enable);
    }
    this.enabledHighlightListening = enable;
  }

  destroy() {
    this.takeDownProvider();
    this.table.destroy();
    this.node.remove();
  }
}

