/**
 * Created by Samuel Gratzl on 18.07.2017.
 */
import {AEventDispatcher, forEach, merge} from '../../utils';
import {default as ABodyRenderer, IBodyRenderer, IBodyRendererOptions} from '../ABodyRenderer';
import DataProvider from '../../provider/ADataProvider';
import {IStatistics, ICategoricalStatistics} from '../../model/Column';
import {renderers as defaultRenderers} from '../../renderer';

export default class EngineBodyRenderer extends AEventDispatcher implements IBodyRenderer {
  static readonly EVENT_HOVER_CHANGED = ABodyRenderer.EVENT_HOVER_CHANGED;
  static readonly EVENT_RENDER_FINISHED = ABodyRenderer.EVENT_RENDER_FINISHED;

  protected readonly options: IBodyRendererOptions = {
    rowHeight: 22,
    textHeight: 13, //10pt
    rowPadding: 1,
    rowBarPadding: 1,
    rowBarTopPadding: 1,
    rowBarBottomPadding: 1,
    idPrefix: '',
    slopeWidth: 150,
    columnPadding: 5,
    stacked: true,
    animation: false, //200
    animationDuration: 1000,

    renderers: merge({}, defaultRenderers),

    meanLine: false,

    actions: [],

    freezeCols: 0
  };

  histCache = new Map<string, Promise<IStatistics | ICategoricalStatistics> | IStatistics | ICategoricalStatistics | null>();

  readonly node: HTMLElement;

  constructor(private data: DataProvider, parent: Element, options: Partial<IBodyRendererOptions> = {}) {
    super();
    this.node = parent.ownerDocument.createElement('main');
    parent.appendChild(this.node);
  }

  protected createEventList() {
    return super.createEventList().concat([EngineBodyRenderer.EVENT_HOVER_CHANGED, EngineBodyRenderer.EVENT_RENDER_FINISHED]);
  }

  setOption(key: string, value: any) {
    //TODO
  }

  changeDataStorage(data: DataProvider) {
    this.data = data;
    //TODO rebuild;
  }

  select(dataIndex: number, additional?: boolean) {
    if (!additional) {
      forEach(this.node, `[data-data-index].selected`, (n: HTMLElement) => {
        n.classList.remove('selected');
      });
    }
    forEach(this.node, `[data-data-index="${dataIndex}]`, (n: HTMLElement) => {
      n.classList.add('selected');
    });
  }

  fakeHover(dataIndex: number) {
    const old = this.node.querySelector(`[data-data-index].hovered`);
    if (old) {
      old.classList.remove('hovered');
    }
    const item = this.node.querySelector(`[data-data-index="${dataIndex}"].hovered`);
    if (item) {
      item.classList.add('hovered');
    }
  }

  updateFreeze(left: number) {
    // nothing to do
  }

  scrolled(delta: number) {
    // internally nothing to do
  }

  update() {
    //TODO rebuild;
  }
}
