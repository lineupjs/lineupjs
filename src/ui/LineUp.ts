import {ILineUpOptions, defaultOptions} from '../config';
import {merge} from '../internal';
import {DataProvider} from '../provider';
import {cssClass} from '../styles';
import {ALineUp} from './ALineUp';
import EngineRenderer from './EngineRenderer';
import SidePanel from './panel/SidePanel';

export default class LineUp extends ALineUp {
  private readonly renderer: EngineRenderer | null;
  private readonly panel: SidePanel | null;

  private readonly options = defaultOptions();

  constructor(node: HTMLElement, data: DataProvider, options: Partial<ILineUpOptions> = {}) {
    super(node, data, options && options.ignoreUnsupportedBrowser === true);

    merge(this.options, options);

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
        hierarchy: this.options.hierarchyIndicator && this.options.flags.advancedRankingFeatures
      });
      this.renderer.pushUpdateAble((ctx) => this.panel!.update(ctx));
      this.node.insertBefore(this.panel.node, this.node.firstChild);
    } else {
      this.panel = null;
    }
    this.forward(this.renderer, `${EngineRenderer.EVENT_HIGHLIGHT_CHANGED}.main`);
  }

  destroy() {
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

  setDataProvider(data: DataProvider, dump?: any) {
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

  setHighlight(dataIndex: number, scrollIntoView: boolean = true) {
    return this.renderer != null && this.renderer.setHighlight(dataIndex, scrollIntoView);
  }

  getHighlight() {
    return this.renderer ? this.renderer.getHighlight() : -1;
  }

  protected enableHighlightListening(enable: boolean) {
    if (this.renderer) {
      this.renderer.enableHighlightListening(enable);
    }
  }
}
