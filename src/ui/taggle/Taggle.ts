import {IEngineRendererOptions} from '../engine/EngineRenderer';
import {regular, spacefilling} from './LineUpRuleSet';
import {RENDERER_EVENT_HOVER_CHANGED} from '../interfaces';
import SidePanel from '../panel/SidePanel';
import DataProvider from '../../provider/ADataProvider';
import {AEventDispatcher} from '../../utils';
import SidePanelEntry from '../panel/SidePanelEntry';
import TaggleRenderer from './TaggleRenderer';

export declare type ITaggleOptions = IEngineRendererOptions;

export default class Taggle extends AEventDispatcher {
  /**
   * triggered when the mouse is over a specific row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static readonly EVENT_HOVER_CHANGED = RENDERER_EVENT_HOVER_CHANGED;

  /**
   * triggered when the user click on a row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static readonly EVENT_SELECTION_CHANGED = DataProvider.EVENT_SELECTION_CHANGED;

  private readonly spaceFilling: HTMLElement;
  private readonly renderer: TaggleRenderer;
  private readonly panel: SidePanel;


  constructor(public readonly node: HTMLElement, public data: DataProvider, options: Partial<IEngineRendererOptions> = {}) {
    super();

    this.node.classList.add('lu-taggle');
    this.node.innerHTML = `<aside class="panel">
        <div class="lu-rule-button-chooser">
          <span>Overview</span>
          <div></div>
        </div>
    </aside>`;

    {
      this.spaceFilling = <HTMLElement>this.node.querySelector('.lu-rule-button-chooser')!;
      this.spaceFilling.addEventListener('click', () => {
        const selected = this.spaceFilling.classList.toggle('chosen');
        this.renderer.switchRule(selected ? spacefilling : regular);
      });
    }

    this.renderer = new TaggleRenderer(this.node, data, Object.assign({
      violationChanged: (_rule: any, violation?: string) => this.setViolation(violation)
    }, options));
    this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument, {
      formatItem: (item: SidePanelEntry) => `<span data-type="${item.desc ? item.desc.type : item.text}"><span>${item.text}</span></span>`
    });
    this.renderer.pushUpdateAble((ctx) => this.panel.update(ctx));
    this.node.firstElementChild!.appendChild(this.panel.node);

    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
    this.forward(this.renderer, `${RENDERER_EVENT_HOVER_CHANGED}.main`);
  }

  protected createEventList() {
    return super.createEventList().concat([Taggle.EVENT_HOVER_CHANGED, Taggle.EVENT_SELECTION_CHANGED]);
  }

  private setViolation(violation?: string) {
    violation = violation || '';
    this.spaceFilling.classList.toggle('violated', Boolean(violation));
    this.spaceFilling.lastElementChild!.innerHTML = violation.replace(/\n/g, '<br>');
  }

  destroy() {
    this.renderer.destroy();
    this.node.remove();
  }

  dump() {
    return this.data.dump();
  }

  update() {
    this.renderer.update();
  }

  changeDataStorage(data: DataProvider, dump?: any) {
    if (this.data) {
      this.unforward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.taggle`);
    }
    this.data = data;
    if (dump) {
      this.data.restore(dump);
    }
    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.taggle`);
    this.renderer.changeDataStorage(data);
    this.update();
    this.panel.update(this.renderer.ctx);
  }
}
