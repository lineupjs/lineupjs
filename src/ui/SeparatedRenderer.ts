/**
 * Created by Samuel Gratzl on 09.08.2017.
 */
import {AEventDispatcher, ContentScroller, merge} from '../utils';
import ADataProvider from '../provider/ADataProvider';
import {ILineUpConfig, IRenderingOptions} from '../interfaces';
import DOMBodyRenderer from './DOMBodyRenderer';
import CanvasBodyRenderer from './CanvasBodyRenderer';
import {default as ABodyRenderer, IBodyRenderer} from './ABodyRenderer';
import HeaderRenderer from './HeaderRenderer';


export default class SeparatedRenderer extends AEventDispatcher {

  private readonly body: IBodyRenderer;
  private readonly header: HeaderRenderer;
  private readonly contentScroller: ContentScroller | null;

  private readonly config: ILineUpConfig;

  constructor(data: ADataProvider, parent: Element, options: ILineUpConfig, type: string) {
    super();
    this.config = options;
    this.header = new HeaderRenderer(data, parent, merge({}, this.config.header, {
      idPrefix: this.config.idPrefix,
      manipulative: this.config.manipulative,
      summary: this.config.renderingOptions.summary,
      freezeCols: this.config.body.freezeCols,
    }));

    parent.insertAdjacentHTML('beforeend', `<div class="lu-body-wrapper"></div>`);
    const bodyWrapper = parent.lastElementChild!;

    {
      const bodyConfig = merge({}, this.config.body, {
        meanLine: this.config.renderingOptions.meanLine,
        animation: this.config.renderingOptions.animation,
        stacked: this.config.renderingOptions.stacked,
        idPrefix: this.config.idPrefix,
        renderers: this.config.renderers
      });

      this.body = type === 'canvas' ? new CanvasBodyRenderer(data, bodyWrapper, this.slice.bind(this), bodyConfig) : new DOMBodyRenderer(data, bodyWrapper, this.slice.bind(this), bodyConfig);
    }
    //share hist caches
    this.body.histCache = this.header.sharedHistCache;

    this.forward(this.body, ABodyRenderer.EVENT_HOVER_CHANGED);
    this.forward(this.body, ABodyRenderer.EVENT_RENDER_FINISHED);

    if (!this.config.body.visibleRowsOnly) {
      return;
    }
    this.contentScroller = new ContentScroller(bodyWrapper, this.body.node, {
      pageSize: this.config.body.backupScrollRows! * this.config.body.rowHeight!,
      backupRows: this.config.body.backupScrollRows,
      rowHeight: this.config.body.rowHeight
    });
    this.contentScroller.on(ContentScroller.EVENT_SCROLL, (_top, left) => {
      //in two svg mode propagate horizontal shift
      this.header.$node.style('margin-left', `${-left}px`);
      if (this.config.body.freezeCols! > 0) {
        this.header.updateFreeze(left);
        this.body.updateFreeze(left);
      }
    });
    this.contentScroller.on(ContentScroller.EVENT_REDRAW, (delta) => this.body.scrolled(delta));
  }

  protected createEventList() {
    return [ABodyRenderer.EVENT_RENDER_FINISHED, ABodyRenderer.EVENT_HOVER_CHANGED];
  }

  private slice(start: number, length: number, row2y: (i: number) => number) {
    if (this.contentScroller) {
      return this.contentScroller.select(start, length, row2y);
    }
    return {from: start, to: length};
  }

  destroy() {
    if (this.contentScroller) {
      this.contentScroller.destroy();
    }
  }

  changeDataStorage(data: ADataProvider) {
    this.header.changeDataStorage(data);
    this.body.changeDataStorage(data);
  }

  scrollIntoView(length: number, index: number) {
    if (this.contentScroller) {
      this.contentScroller.scrollIntoView(0, length, index, (i) => i * this.config.body.rowHeight!);
    } else {
      const container = <HTMLElement>this.body.node.parentElement!;
      container.scrollTop = index * this.config.body.rowHeight!;
    }
  }

  fakeHover(index: number) {
    this.body.fakeHover(index);
  }

  update() {
    this.header.update();
    this.body.update();
  }

  setBodyOption(option: keyof IRenderingOptions, value: boolean) {
    this.body.setOption(option, value);
    this.body.update();
  }
}
