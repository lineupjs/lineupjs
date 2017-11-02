import {IGroupData, IGroupItem, isGroup} from '../engine/interfaces';
import EngineRenderer, {IEngineRendererOptions} from '../engine/EngineRenderer';
import {IRule, regular, spacefilling} from './LineUpRuleSet';
import {defaultConfig} from '../../config';
import {RENDERER_EVENT_HOVER_CHANGED} from '../interfaces';
import {GROUP_SPACING} from './lod';
import SidePanel from '../panel/SidePanel';
import DataProvider from '../../provider/ADataProvider';
import {AEventDispatcher, merge} from '../../utils';
import SidePanelEntry from '../panel/SidePanelEntry';

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

  private isDynamicLeafHeight: boolean = true;

  private rule: IRule = regular;
  private levelOfDetail: (row: HTMLElement, rowIndex: number) => void;
  private readonly spaceFilling: HTMLElement;
  private readonly resizeListener = () => this.update();
  private readonly renderer: EngineRenderer;
  private readonly panel: SidePanel;


  constructor(public readonly node: HTMLElement, public data: DataProvider, options: Partial<IEngineRendererOptions> = {}) {
    super();

    this.node.classList.add('lu-taggle');
    this.node.innerHTML = `<aside class="panel">
        <div class="lu-rule-button-chooser">
            <div><span>Overview</span>
              <code></code>
            </div>
        </div>
    </aside>`;

    {
      this.spaceFilling = <HTMLElement>this.node.querySelector('.lu-rule-button-chooser :first-child')!;
      this.spaceFilling.addEventListener('click', () => {
        const selected = this.spaceFilling.classList.toggle('chosen');
        this.switchRule(selected ? spacefilling : regular);
      });
    }

    const config = this.createConfig(options);

    this.renderer = new EngineRenderer(data, this.node, config);
    this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument, {
      formatItem: (item: SidePanelEntry) => `<span data-type="${item.desc ? item.desc.type : item.text}"><span>${item.text}</span></span>`
    });
    this.renderer.pushUpdateAble((ctx) => this.panel.update(ctx));
    this.node.firstElementChild!.appendChild(this.panel.node);

    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
    this.data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.rule`, () => {
      if (this.isDynamicLeafHeight) {
        this.update();
      }
    });
    this.forward(this.renderer, `${RENDERER_EVENT_HOVER_CHANGED}.main`);

    window.addEventListener('resize', this.resizeListener);
  }

  private createConfig(options: Partial<IEngineRendererOptions>): IEngineRendererOptions {
    return merge(defaultConfig(), options, {
      header: {
        summary: true
      },
      body: {
        animation: true,
        rowPadding: 0, //since padding is used
        groupPadding: GROUP_SPACING,
        dynamicHeight: this.dynamicHeight.bind(this),
        customRowUpdate: this.customRowUpdate.bind(this)
      }
    });
  }

  private customRowUpdate(row: HTMLElement, rowIndex: number) {
    if (this.levelOfDetail) {
      this.levelOfDetail(row, rowIndex);
    }
  }

  private dynamicHeight(data: (IGroupData | IGroupItem)[]) {
    const availableHeight = this.node.querySelector('main > main')!.clientHeight;
    const instance = this.rule.apply(data, availableHeight, new Set(this.data.getSelection()));
    this.isDynamicLeafHeight = typeof instance.item === 'function';
    this.setViolation(instance.violation);

    const height = (item: IGroupItem | IGroupData) => {
      if (isGroup(item)) {
        return typeof instance.group === 'number' ? instance.group : instance.group(item);
      }
      return typeof instance.item === 'number' ? instance.item : instance.item(item);
    };

    this.levelOfDetail = (row: HTMLElement, rowIndex: number) => {
      const item = data[rowIndex];
      row.dataset.lod = this.rule.levelOfDetail(item, height(item));
    };

    return {
      defaultHeight: typeof instance.item === 'number' ? instance.item : NaN,
      height
    };
  }

  protected createEventList() {
    return super.createEventList().concat([Taggle.EVENT_HOVER_CHANGED, Taggle.EVENT_SELECTION_CHANGED]);
  }

  private switchRule(rule: IRule) {
    this.rule = rule;
    this.update();
  }

  private setViolation(violation?: string) {
    violation = violation || '';
    this.spaceFilling.classList.toggle('violated', Boolean(violation));
    this.spaceFilling.lastElementChild!.textContent = violation.replace(/\n/g, '<br>');
  }

  destroy() {
    this.renderer.destroy();
    this.node.remove();
    window.removeEventListener('resize', this.resizeListener);
  }

  dump() {
    return this.data.dump();
  }

  update() {
    this.renderer.update();
  }

  changeDataStorage(data: DataProvider, dump?: any) {
    if (this.data) {
      this.unforward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
      this.data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.rule`, null);
    }
    this.data = data;
    if (dump) {
      this.data.restore(dump);
    }
    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
    this.data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.rule`, () => {
      if (this.isDynamicLeafHeight) {
        this.update();
      }
    });
    this.renderer.changeDataStorage(data);
    this.update();
    this.panel.update(this.renderer.ctx);
  }
}
