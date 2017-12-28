import spaceFillingRule from './spaceFillingRule';
import {RENDERER_EVENT_HOVER_CHANGED} from '../interfaces';
import SidePanel from '../panel/SidePanel';
import DataProvider from '../../provider/ADataProvider';
import TaggleRenderer from './TaggleRenderer';
import {ILineUpConfig} from '../../interfaces';
import {ALineUp} from '../ALineUp';
import {defaultConfig} from '../../config';
import merge from '../../internal/merge';

export declare type ITaggleOptions = ILineUpConfig;

export default class Taggle extends ALineUp {
  private readonly spaceFilling: HTMLElement;
  private readonly renderer: TaggleRenderer;
  private readonly panel: SidePanel;


  constructor(node: HTMLElement, data: DataProvider, options: Partial<ITaggleOptions> = {}) {
    super(node, data);

    this.node.classList.add('lu-taggle');
    this.node.innerHTML = `<aside class="panel">
        <div class="lu-rule-button-chooser">
          <span>Overview</span>
          <div></div>
        </div>
    </aside>`;

    const config = merge(defaultConfig(), options, {
      violationChanged: (_rule: any, violation?: string) => this.setViolation(violation)
    });

    {
      const spaceFilling = spaceFillingRule(config);
      this.spaceFilling = <HTMLElement>this.node.querySelector('.lu-rule-button-chooser')!;
      this.spaceFilling.addEventListener('click', () => {
        const selected = this.spaceFilling.classList.toggle('chosen');
        this.renderer.switchRule(selected ?  spaceFilling: null);
      });
    }

    this.renderer = new TaggleRenderer(this.node, data, config);
    this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument);
    this.renderer.pushUpdateAble((ctx) => this.panel.update(ctx));
    this.node.firstElementChild!.appendChild(this.panel.node);

    this.forward(this.renderer, `${RENDERER_EVENT_HOVER_CHANGED}.main`);
  }

  private setViolation(violation?: string) {
    violation = violation || '';
    this.spaceFilling.classList.toggle('violated', Boolean(violation));
    this.spaceFilling.lastElementChild!.innerHTML = violation.replace(/\n/g, '<br>');
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
