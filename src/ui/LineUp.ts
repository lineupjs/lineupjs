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
  private readonly panel: SidePanel;


  constructor(node: HTMLElement, data: DataProvider, options: Partial<ILineUpOptions> = {}) {
    super(node, data);

    this.node.classList.add('lu');
    this.node.innerHTML = `<aside class="panel"></aside>`;

    this.renderer = new EngineRenderer(data, this.node, merge(defaultOptions(), options));
    this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument);
    this.renderer.pushUpdateAble((ctx) => this.panel.update(ctx));
    this.node.firstElementChild!.appendChild(this.panel.node);

    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
  }

  destroy() {
    this.renderer.destroy();
    super.destroy();
  }

  update() {
    this.renderer.update();
  }

  setDataProvider(data: DataProvider, dump?: any) {
    super.setDataProvider(data, dump);
    this.renderer.setDataProvider(data);
    this.update();
    this.panel.update(this.renderer.ctx);
  }
}
