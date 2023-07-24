import { type ILineUpOptions, defaultOptions } from '../config';
import { merge, suffix } from '../internal';
import type { DataProvider } from '../provider';
import { cssClass } from '../styles';
import { ALineUp } from './ALineUp';
import EngineRenderer from './EngineRenderer';
import type { ILineUpState } from './interfaces';
import SidePanel from './panel/SidePanel';

export default class LineUp extends ALineUp {
  static override readonly EVENT_SELECTION_CHANGED = ALineUp.EVENT_SELECTION_CHANGED;
  static override readonly EVENT_DIALOG_OPENED = ALineUp.EVENT_DIALOG_OPENED;
  static override readonly EVENT_DIALOG_CLOSED = ALineUp.EVENT_DIALOG_CLOSED;
  static override readonly EVENT_HIGHLIGHT_CHANGED = ALineUp.EVENT_HIGHLIGHT_CHANGED;

  private readonly renderer: EngineRenderer | null;
  private readonly panel: SidePanel | null;

  private readonly options = defaultOptions();

  constructor(node: HTMLElement, data: DataProvider, options: Partial<ILineUpOptions> = {}) {
    super(node, data, options && options.ignoreUnsupportedBrowser === true);

    merge(this.options, options);

    if (this.options.copyableRows) {
      this.addCopyListener();
    }

    if (!this.isBrowserSupported) {
      this.renderer = null;
      this.panel = null;
      return;
    }

    this.node.classList.add(cssClass());

    this.renderer = new EngineRenderer(data, this.node, this.options);
    if (this.options.sidePanel) {
      this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument!, {
        collapseable: this.options.sidePanelCollapsed ? 'collapsed' : true,
        hierarchy: this.options.hierarchyIndicator && this.options.flags.advancedRankingFeatures,
      });
      this.renderer.pushUpdateAble((ctx) => this.panel!.update(ctx));
      this.node.insertBefore(this.panel.node, this.node.firstChild);
    } else {
      this.panel = null;
    }
    this.forward(
      this.renderer,
      ...suffix(
        '.main',
        EngineRenderer.EVENT_HIGHLIGHT_CHANGED,
        EngineRenderer.EVENT_DIALOG_OPENED,
        EngineRenderer.EVENT_DIALOG_CLOSED
      )
    );
  }

  override destroy() {
    this.node.classList.remove(cssClass());
    if (this.renderer) {
      this.renderer.destroy();
    }
    if (this.panel) {
      this.panel.destroy();
    }
    super.destroy();
  }

  update() {
    if (this.renderer) {
      this.renderer.update();
    }
  }

  override setDataProvider(data: DataProvider, dump?: any) {
    super.setDataProvider(data, dump);
    if (!this.renderer) {
      return;
    }
    this.renderer.setDataProvider(data);
    this.update();
    if (this.panel) {
      this.panel.update(this.renderer.ctx);
    }
  }

  setHighlight(dataIndex: number, scrollIntoView = true) {
    return this.renderer != null && this.renderer.setHighlight(dataIndex, scrollIntoView);
  }

  getHighlight() {
    return this.renderer ? this.renderer.getHighlight() : -1;
  }

  async applyState(state: ILineUpState): Promise<void> {
    await this.data.applyState(state);
    this.renderer.applyState(state.ui);
    if (state.highlight != null && this.getHighlight() !== state.highlight) {
      this.setHighlight(state.highlight);
    }
  }

  toJSON(): ILineUpState {
    const r: ILineUpState = {
      ...super.dump(),
      ui: this.renderer.toJSON(),
      highlight: this.getHighlight(),
    };
    return r;
  }

  protected override enableHighlightListening(enable: boolean) {
    if (this.renderer) {
      this.renderer.enableHighlightListening(enable);
    }
  }
}
