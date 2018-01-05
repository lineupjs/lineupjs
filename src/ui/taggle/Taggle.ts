import {defaultOptions} from '../../config';
import {ILineUpOptions} from '../../interfaces';
import merge from '../../internal/merge';
import DataProvider from '../../provider/ADataProvider';
import {ALineUp} from '../ALineUp';
import {RENDERER_EVENT_HOVER_CHANGED} from '../interfaces';
import SidePanel from '../panel/SidePanel';
import spaceFillingRule from './spaceFillingRule';
import TaggleRenderer from './TaggleRenderer';

export declare type ITaggleOptions = ILineUpOptions;

export default class Taggle extends ALineUp {
  private readonly spaceFilling: HTMLElement;
  private readonly renderer: TaggleRenderer;
  private readonly panel: SidePanel;


  constructor(node: HTMLElement, data: DataProvider, options: Partial<ITaggleOptions> = {}) {
    super(node, data);

    this.node.classList.add('lu-taggle', 'lu');

    const config = merge(defaultOptions(), options, {
      violationChanged: (_rule: any, violation?: string) => this.setViolation(violation)
    });

    this.renderer = new TaggleRenderer(this.node, data, config);
    this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument);
    this.renderer.pushUpdateAble((ctx) => this.panel.update(ctx));
    this.node.insertBefore(this.panel.node, this.node.firstChild);
    this.panel.node.insertAdjacentHTML('afterbegin', `<div class="lu-rule-button-chooser">
          <span>Overview</span>
          <div></div>
        </div>`);
    {
      const spaceFilling = spaceFillingRule(config);
      this.spaceFilling = <HTMLElement>this.node.querySelector('.lu-rule-button-chooser')!;
      this.spaceFilling.addEventListener('click', () => {
        const selected = this.spaceFilling.classList.toggle('chosen');
        this.renderer.switchRule(selected ? spaceFilling : null);
      });
    }
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
