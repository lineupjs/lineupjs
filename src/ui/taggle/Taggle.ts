import {defaultOptions} from '../../config';
import {ITaggleOptions} from '../../interfaces';
import merge from '../../internal/merge';
import DataProvider from '../../provider/ADataProvider';
import {ALineUp} from '../ALineUp';
import SidePanel from '../panel/SidePanel';
import spaceFillingRule from './spaceFillingRule';
import TaggleRenderer from './TaggleRenderer';

export {ITaggleOptions} from '../../interfaces';

export default class Taggle extends ALineUp {
  private readonly spaceFilling: HTMLElement;
  private readonly renderer: TaggleRenderer;
  private readonly panel: SidePanel;

  private readonly options = defaultOptions();


  constructor(node: HTMLElement, data: DataProvider, options: Partial<ITaggleOptions> = {}) {
    super(node, data);
    merge(this.options, options, {
      violationChanged: (_rule: any, violation?: string) => this.setViolation(violation)
    });

    this.node.classList.add('lu-taggle', 'lu');

    this.renderer = new TaggleRenderer(data, this.node, this.options);
    this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument, {
      collapseable: this.options.sidePanelCollapsed ? 'collapsed' : true
    });
    this.renderer.pushUpdateAble((ctx) => this.panel.update(ctx));
    this.node.insertBefore(this.panel.node, this.node.firstChild);
    {
      this.panel.node.insertAdjacentHTML('afterbegin', `<div class="lu-rule-button-chooser"><label>
            <input type="checkbox">
            <span>Overview</span>
            <div></div>
          </label></div>`);
      const spaceFilling = spaceFillingRule(this.options);
      this.spaceFilling = <HTMLElement>this.node.querySelector('.lu-rule-button-chooser')!;
      const input = <HTMLInputElement>this.spaceFilling.querySelector('input');
      input.onchange = () => {
        const selected = this.spaceFilling.classList.toggle('chosen');
        self.setTimeout(() => this.renderer.switchRule(selected ? spaceFilling : null));
      };
      if (this.options.overviewMode) {
        input.checked = true;
        this.spaceFilling.classList.toggle('chosen');
        this.renderer.switchRule(spaceFilling);
      }
    }
    this.forward(this.renderer, `${ALineUp.EVENT_HIGHLIGHT_CHANGED}.main`);
  }

  private setViolation(violation?: string) {
    violation = violation || '';
    this.spaceFilling.classList.toggle('violated', Boolean(violation));
    this.spaceFilling.lastElementChild!.innerHTML = violation.replace(/\n/g, '<br>');
  }

  destroy() {
    this.node.classList.remove('lu-taggle', 'lu');
    this.renderer.destroy();
    this.panel.destroy();
    super.destroy();
  }

  update() {
    this.renderer.update();
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

  setDataProvider(data: DataProvider, dump?: any) {
    super.setDataProvider(data, dump);
    this.renderer.setDataProvider(data);
    this.update();
    this.panel.update(this.renderer.ctx);
  }
}
