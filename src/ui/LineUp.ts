import SidePanel from './panel/SidePanel';
import DataProvider from '../provider/ADataProvider';
import {ILineUpConfig} from '../interfaces';
import EngineRenderer from './EngineRenderer';
import {defaultConfig} from '../config';
import merge from '../internal/merge';
import {ALineUp} from './ALineUp';

export {ILineUpConfig} from '../interfaces';

export default class LineUp extends ALineUp {
  private readonly renderer: EngineRenderer;
  private readonly panel: SidePanel;


  constructor(node: HTMLElement, data: DataProvider, options: Partial<ILineUpConfig> = {}) {
    super(node, data);

    this.node.classList.add('lu');
    this.node.innerHTML = `<aside class="panel"></aside>`;

    this.renderer = new EngineRenderer(data, this.node, merge(defaultConfig(), options));
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
