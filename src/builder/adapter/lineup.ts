import {IBuilderAdapter, IBuilderAdapterProps, IBuilderAdapterRankingProps, IChangeDetecter} from '.';
import {IColumnDesc} from '../../model';
import {deriveColors, deriveColumnDescriptions, IDataProviderOptions, ILocalDataProviderOptions, LocalDataProvider} from '../../provider';
import {LineUp, Taggle} from '../../ui';
import {buildRanking} from './ranking';
import {equal, isSame, pick} from './utils';


const providerOptions: (keyof IDataProviderOptions | keyof ILocalDataProviderOptions)[] = ['singleSelection', 'filterGlobally', 'columnTypes', 'taskExecutor', 'jumpToSearchResult'];
const lineupOptions: (keyof IBuilderAdapterProps)[] = ['animated', 'sidePanel', 'sidePanelCollapsed', 'hierarchyIndicator', 'defaultSlopeGraphMode', 'summaryHeader', 'expandLineOnHover', 'overviewMode', 'renderers', 'canRender', 'toolbar', 'rowHeight', 'rowPadding', 'groupHeight', 'groupPadding', 'dynamicHeight', 'labelRotation', 'ignoreUnsupportedBrowser'];

interface IRankingContext {
  builders: IBuilderAdapterRankingProps[];
  restore: any;
  derive: boolean;
  supportTypes: boolean;
}

interface IColumnContext {
  columns: IColumnDesc[];
  deriveColumns: boolean;
  deriveColumnNames: string[];
  deriveColors: boolean;
}

export class Adapter {
  private data: LocalDataProvider | null = null;
  private instance: LineUp | Taggle | null = null;

  private prevRankings: IRankingContext | null = null;
  private prevColumns: IColumnContext | null = null;
  private prevHighlight: number | null = null;

  private readonly onSelectionChanged = (indices: number[]) => {
    if (this.props.onSelectionChanged && !equal(this.props.selection, indices)) {
      this.props.onSelectionChanged(indices);
    }
  }

  private readonly onHighlightChanged = (highlight: number) => {
    const prev = this.prevHighlight != null ? this.prevHighlight : -1;
    if (prev === highlight) {
      return;
    }
    this.prevHighlight = highlight;
    if (this.props.onHighlightChanged) {
      this.props.onHighlightChanged(highlight);
    }
  }

  constructor(private readonly adapter: IBuilderAdapter) {

  }

  private get props() {
    return this.adapter.props();
  }

  componentDidMount() {
    this.data = this.buildProvider();
    this.instance = this.adapter.createInstance(this.data, pick(this.props, lineupOptions));
    this.instance.on(LineUp.EVENT_HIGHLIGHT_CHANGED, this.onHighlightChanged);
  }

  private resolveColumnDescs(data: any[]): IColumnContext {
    const columns = this.adapter.columnDescs(data);
    const deriveColumns = columns.length === 0 || Boolean(this.props.deriveColumns);
    const deriveColumnNames = Array.isArray(this.props.deriveColumns) ? this.props.deriveColumns : [];
    const deriveColors = Boolean(this.props.deriveColors);
    return {
      columns,
      deriveColors,
      deriveColumns,
      deriveColumnNames
    };
  }

  private resolveRankings(): IRankingContext {
    const builders = this.adapter.rankingBuilders();

    return {
      builders,
      restore: this.props.restore,
      derive: (builders.length === 0 && !this.props.restore) || Boolean(this.props.defaultRanking),
      supportTypes: this.props.defaultRanking !== 'noSupportTypes'
    };
  }

  private buildColumns(data: any[], ctx: IColumnContext) {
    this.prevColumns = ctx;
    const columns = ctx.columns.map((d) => Object.assign({}, d)); // work on copy
    if (ctx.deriveColumns) {
      const labels = new Set(columns.map((d) => `${d.type}@${d.label}`));
      const derived = deriveColumnDescriptions(data, {columns: ctx.deriveColumnNames});
      for (const derive of derived) {
        if (labels.has(`${derive.type}@${derive.label}`)) { // skip same name
          continue;
        }
        columns.push(derive);
      }
    }
    if (ctx.deriveColors) {
      deriveColors(columns);
    }
    return columns;
  }

  private buildRankings(data: LocalDataProvider, rankings: IRankingContext) {
    data.clearRankings();
    this.prevRankings = rankings;
    if (rankings.derive) {
      data.deriveDefault(rankings.supportTypes);
    }
    if (rankings.restore) {
      data.restore(rankings.restore);
    }
    rankings.builders.forEach((b) => buildRanking(b, data!));
  }

  private buildProvider() {
    const columns = this.buildColumns(this.props.data, this.resolveColumnDescs(this.props.data));
    const data = new LocalDataProvider(this.props.data, columns, pick(this.props, providerOptions));

    this.buildRankings(data, this.resolveRankings());

    data.setSelection(this.props.selection || []);
    data.on(LocalDataProvider.EVENT_SELECTION_CHANGED, this.onSelectionChanged);

    return data;
  }

  private updateLineUp(changeDetector: IChangeDetecter, providerChanged: boolean) {
    // check lineup instance properties
    const changedLineUpOptions = isSame(this.props, changeDetector, lineupOptions);
    if (!changedLineUpOptions) {
      if (providerChanged) {
        this.instance!.setDataProvider(this.data!);
      }

      if (providerChanged || (this.props.highlight != null && this.prevHighlight !== this.props.highlight)) {
        this.prevHighlight = this.props.highlight == null ? -1 : this.props.highlight;
        this.instance!.on(LineUp.EVENT_HIGHLIGHT_CHANGED, null);
        this.instance!.setHighlight(this.prevHighlight);
        this.instance!.on(LineUp.EVENT_HIGHLIGHT_CHANGED, this.onHighlightChanged);
        return true;
      }
      return false;
    }
    // recreate lineup
    if (this.instance) {
      this.instance.destroy();
    }
    this.instance = this.adapter.createInstance(this.data!, changedLineUpOptions);

    this.prevHighlight = this.props.highlight == null ? -1 : this.props.highlight;
    this.instance!.setHighlight(this.prevHighlight);
    this.instance!.on(LineUp.EVENT_HIGHLIGHT_CHANGED, this.onHighlightChanged);
    return true;
  }

  private updateProvider(changeDetector: IChangeDetecter) {
    const changedProviderOptions = isSame(this.props, changeDetector, providerOptions);
    if (changedProviderOptions || !this.data || changeDetector('data')) {
      // big change start from scratch
      this.data = this.buildProvider();
      return true;
    }

    const rankings = this.resolveRankings();
    const columns = this.resolveColumnDescs(this.props.data);
    const columnsChanged = !equal(this.prevColumns, columns);
    if (columnsChanged) {
      const descs = this.buildColumns(this.props.data, columns);
      this.data.clearColumns();
      descs.forEach((d) => this.data!.pushDesc(d));
    }

    if (columnsChanged || !equal(rankings, this.prevRankings)) {
      this.buildRankings(this.data, rankings);
    }

    this.data.on(LocalDataProvider.EVENT_SELECTION_CHANGED, null);
    this.data.setSelection(this.props.selection || []);
    this.data.on(LocalDataProvider.EVENT_SELECTION_CHANGED, this.onSelectionChanged);
    return false;
  }

  componentDidUpdate(changeDetector: IChangeDetecter) {
    const providerChanged = this.updateProvider(changeDetector);
    this.updateLineUp(changeDetector, providerChanged);
    // this.instance!.update();
  }

  componentWillUnmount() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
    this.data = null;
  }
}
