import {defaultOptions} from '../config';
import {ILineUpOptions} from '../interfaces';
import merge from '../internal/merge';
import DataProvider from '../provider/ADataProvider';
import {ALineUp} from './ALineUp';
import EngineRenderer from './EngineRenderer';
import SidePanel from './panel/SidePanel';

export {ILineUpOptions} from '../interfaces';

export default class LineUp extends ALineUp {
  private readonly renderer: EngineRenderer;
  private readonly panel: SidePanel | null;

  private readonly options = defaultOptions();

  constructor(node: HTMLElement, data: DataProvider, options: Partial<ILineUpOptions> = {}) {
    super(node, data);

    merge(this.options, options);
    this.node.classList.add('lu');

    this.renderer = new EngineRenderer(data, this.node, this.options);
    if (this.options.sidePanel) {
      this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument, {
        collapseable: this.options.sidePanelCollapsed ? 'collapsed' : true
      });
      this.renderer.pushUpdateAble((ctx) => this.panel!.update(ctx));
      this.node.insertBefore(this.panel.node, this.node.firstChild);
    } else {
      this.panel = null;
    }
    this.forward(this.renderer, `${EngineRenderer.EVENT_HIGHLIGHT_CHANGED}.main`);
  }

  destroy() {
    this.node.classList.remove('lu');
    this.renderer.destroy();
    if (this.panel) {
      this.panel.destroy();
    }
    super.destroy();
  }

  update() {
    this.renderer.update();
  }

  setDataProvider(data: DataProvider, dump?: any) {
    super.setDataProvider(data, dump);
    this.renderer.setDataProvider(data);
    this.update();
    if (this.panel) {
      this.panel.update(this.renderer.ctx);
    }
  }

  setHighlight(dataIndex: number, scrollIntoView: boolean = true) {
    return this.renderer.setHighlight(dataIndex, scrollIntoView);
  }

  getHighlight() {
    return this.renderer.getHighlight();
  }

  protected enableHighlightListening(enable: boolean) {
    this.renderer.enableHighlightListening(enable);
  }
}
