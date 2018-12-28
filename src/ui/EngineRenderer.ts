import {GridStyleManager, MultiTableRowRenderer, nonUniformContext} from 'lineupengine';
import {ILineUpFlags, ILineUpOptions} from '../config';
import {AEventDispatcher, IEventListener, round, suffix} from '../internal';
import {Column, IGroupData, IGroupItem, isGroup, Ranking, IGroup} from '../model';
import {DataProvider} from '../provider';
import {isSummaryGroup, groupEndLevel} from '../provider/internal';
import {IImposer, IRenderContext} from '../renderer';
import {chooseGroupRenderer, chooseRenderer, chooseSummaryRenderer, getPossibleRenderer} from '../renderer/renderers';
import {cssClass} from '../styles';
import DialogManager from './dialogs/DialogManager';
import domElementCache from './domElementCache';
import EngineRanking, {IEngineRankingContext} from './EngineRanking';
import {EMode, IRankingHeaderContext, IRankingHeaderContextContainer} from './interfaces';
import SlopeGraph from './SlopeGraph';

/**
 * emitted when the highlight changes
 * @asMemberOf EngineRenderer
 * @param dataIndex the highlghted data index or -1 for none
 * @event
 */
declare function highlightChanged(dataIndex: number): void;

export default class EngineRenderer extends AEventDispatcher {
  static readonly EVENT_HIGHLIGHT_CHANGED = EngineRanking.EVENT_HIGHLIGHT_CHANGED;

  protected readonly options: Readonly<ILineUpOptions>;

  readonly node: HTMLElement;
  private readonly table: MultiTableRowRenderer;
  private readonly rankings: EngineRanking[] = [];
  private readonly slopeGraphs: SlopeGraph[] = [];

  readonly ctx: IRankingHeaderContextContainer & IRenderContext & IEngineRankingContext;

  private readonly updateAbles: ((ctx: IRankingHeaderContext) => void)[] = [];
  private zoomFactor = 1;
  readonly idPrefix = `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`; //generate a random string with length3;

  private enabledHighlightListening: boolean = false;

  constructor(protected data: DataProvider, parent: HTMLElement, options: Readonly<ILineUpOptions>) {
    super();
    this.options = options;
    this.node = parent.ownerDocument!.createElement('main');
    this.node.id = this.idPrefix;
    // FIXME inline
    this.node.classList.toggle(cssClass('whole-hover'), options.expandLineOnHover);
    parent.appendChild(this.node);

    const dialogManager = new DialogManager(parent.ownerDocument!);

    parent.appendChild(dialogManager.node);
    this.ctx = {
      idPrefix: this.idPrefix,
      document: parent.ownerDocument!,
      provider: data,
      tasks: data.getTaskExecutor(),
      dialogManager,
      toolbar: this.options.toolbar,
      flags: <ILineUpFlags>this.options.flags,
      asElement: domElementCache(parent.ownerDocument!),
      renderer: (col: Column, imposer?: IImposer) => {
        const r = chooseRenderer(col, this.options.renderers);
        return r.create!(col, this.ctx, imposer);
      },
      groupRenderer: (col: Column, imposer?: IImposer) => {
        const r = chooseGroupRenderer(col, this.options.renderers);
        return r.createGroup!(col, this.ctx, imposer);
      },
      summaryRenderer: (col: Column, interactive: boolean, imposer?: IImposer) => {
        const r = chooseSummaryRenderer(col, this.options.renderers);
        return r.createSummary!(col, this.ctx, interactive, imposer);
      },
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
      getPossibleRenderer: (col: Column) => getPossibleRenderer(col, this.options.renderers, this.options.canRender),
      colWidth: (col: Column) => !col.isVisible() ? 0 : col.getWidth()
    };

    this.table = new MultiTableRowRenderer(this.node, this.idPrefix);

    //apply rules
    {

      this.style.addRule('lineup_rowPadding0', `
        .${this.style.cssClasses.tr}`, {
          marginTop: `${options.rowPadding}px`
        });

      for (let level = 0; level < 4; ++level) {
        this.style.addRule(`lineup_groupPadding${level}`, `
        .${this.style.cssClasses.tr}[data-meta~=last${level === 0 ? '' : level}]`, {
            marginBottom: `${options.groupPadding * (level + 1)}px`
          });
      }


      this.style.addRule('lineup_rowPaddingAgg0', `
        .${cssClass('agg-level')}::after`, {
          top: `-${options.rowPadding}px`
        });
      for (let level = 1; level <= 4; ++level) {
        this.style.addRule(`lineup_rowPaddingAgg${level}`, `
        .${cssClass('agg-level')}[data-level='${level}']::after`, {
            top: `-${options.rowPadding + options.groupPadding}px`
          });
      }

      // FIXME flat
      this.style.addRule('lineup_rotation', `
       #${this.idPrefix}.${cssClass('rotated-label')} .${cssClass('label')}.${cssClass('rotated')}`, {
          transform: `rotate(${-this.options.labelRotation}deg)`
        });

      const toDisable: string[] = [];
      if (!this.options.flags.advancedRankingFeatures) {
        toDisable.push('ranking');
      }
      if (!this.options.flags.advancedModelFeatures) {
        toDisable.push('model');
      }
      if (!this.options.flags.advancedUIFeatures) {
        toDisable.push('ui');
      }
      if (toDisable.length > 0) {
        this.style.addRule('lineup_feature_disable', `
        ${toDisable.map((d) => `.${cssClass('feature')}-${d}.${cssClass('feature-advanced')}`).join(', ')}`, {
            display: 'none !important'
          });
      }
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

  on(type: typeof EngineRenderer.EVENT_HIGHLIGHT_CHANGED, listener: typeof highlightChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }


  setDataProvider(data: DataProvider) {
    this.takeDownProvider();

    this.data = data;
    (<any>this.ctx).provider = data;
    (<any>this.ctx).tasks = data.getTaskExecutor();

    this.initProvider(data);
  }

  private takeDownProvider() {
    this.data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.body`, null);
    this.data.on(`${DataProvider.EVENT_ADD_RANKING}.body`, null);
    this.data.on(`${DataProvider.EVENT_REMOVE_RANKING}.body`, null);
    this.data.on(`${DataProvider.EVENT_GROUP_AGGREGATION_CHANGED}.body`, null);
    this.data.on(`${DataProvider.EVENT_SHOWTOPN_CHANGED}.body`, null);
    this.data.on(`${DataProvider.EVENT_JUMP_TO_NEAREST}.body`, null);
    this.data.on(`${DataProvider.EVENT_BUSY}.body`, null);

    this.rankings.forEach((r) => this.table.remove(r));
    this.rankings.splice(0, this.rankings.length);
    this.slopeGraphs.forEach((s) => this.table.remove(s));
    this.slopeGraphs.splice(0, this.slopeGraphs.length);
  }

  private initProvider(data: DataProvider) {
    data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.body`, () => this.updateSelection(data.getSelection()));
    data.on(`${DataProvider.EVENT_ADD_RANKING}.body`, (ranking: Ranking) => {
      this.addRanking(ranking);
    });
    data.on(`${DataProvider.EVENT_REMOVE_RANKING}.body`, (ranking: Ranking) => {
      this.removeRanking(ranking);
    });
    data.on(`${DataProvider.EVENT_GROUP_AGGREGATION_CHANGED}.body`, (ranking: Ranking) => {
      this.update(this.rankings.filter((r) => r.ranking === ranking));
    });
    data.on(`${DataProvider.EVENT_SHOWTOPN_CHANGED}.body`, () => {
      this.update(this.rankings);
    });
    data.on(`${DataProvider.EVENT_JUMP_TO_NEAREST}.body`, (indices: number[]) => {
      this.setHighlightToNearest(indices, true);
    });

    (<any>this.ctx).provider = data;

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

    for (const r of rankings) {
      if (col) {
        // single update
        r.updateHeaderOf(col);
      } else {
        r.updateHeaders();
      }
    }
    this.updateUpdateAbles();
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
      flags: <ILineUpFlags>this.options.flags
    }));
    r.on(EngineRanking.EVENT_WIDTH_CHANGED, () => {
      this.updateRotatedHeaderState();
      this.table.widthChanged();
    });
    r.on(EngineRanking.EVENT_UPDATE_DATA, () => this.update([r]));
    r.on(EngineRanking.EVENT_RECREATE, () => this.updateUpdateAbles());
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
    const l = this.node.querySelector(`.${cssClass('label')}.${cssClass('rotated')}`);
    this.node.classList.toggle(cssClass('rotated-label'), Boolean(l));
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
    // visible and has parent = part of dom
    rankings = rankings.filter((d) => !d.hidden && d.body.parentElement!);
    if (rankings.length === 0) {
      return;
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

    for (const r of rankings) {
      const grouped = r.groupData();

      // inline with creating the groupData
      const {height, defaultHeight, padding} = heightsFor(r.ranking, grouped);

      const strategy = this.data.getAggregationStrategy();
      const topNGetter = (group: IGroup) => this.data.getTopNAggregated(r.ranking, group);

      // inline and create manually for better performance
      const rowContext = nonUniformContext(grouped.map(height), defaultHeight, (index) => {
        const pad = (typeof padding === 'number' ? padding : padding(grouped[index] || null));
        const v = grouped[index];

        if (index < 0 || !v || (isGroup(v) && isSummaryGroup(v, strategy, topNGetter))) {
          return pad;
        }
        return pad + groupPadding * groupEndLevel(v, topNGetter);
      });
      r.render(grouped, rowContext);
    }

    this.updateSlopeGraphs(rankings);

    this.updateUpdateAbles();
    this.updateRotatedHeaderState();
    this.table.widthChanged();
  }

  private updateUpdateAbles() {
    for (const u of this.updateAbles) {
      u(this.ctx);
    }
  }

  private updateSlopeGraphs(rankings: EngineRanking[] = this.rankings) {
    const indices = new Set(rankings.map((d) => this.rankings.indexOf(d)));

    for (let i = 0; i < this.slopeGraphs.length; ++i) {
      const s = this.slopeGraphs[i];
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
    }
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

