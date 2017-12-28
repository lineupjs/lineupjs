import {IRule} from './LineUpRuleSet';
import {defaultConfig} from '../../config';
import {IRankingHeaderContext, RENDERER_EVENT_HOVER_CHANGED} from '../interfaces';
import {GROUP_SPACING} from './lod';
import DataProvider from '../../provider/ADataProvider';
import {AEventDispatcher, merge} from '../../utils';
import EngineRenderer from '../engine/EngineRenderer';
import {IGroupData, IGroupItem, isGroup} from '../../model/interfaces';

export interface ITaggleOptions {
  violationChanged(rule: IRule, violation: string): void;
}

export default class TaggleRenderer extends AEventDispatcher {
  /**
   * triggered when the mouse is over a specific row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static readonly EVENT_HOVER_CHANGED = RENDERER_EVENT_HOVER_CHANGED;

  private isDynamicLeafHeight: boolean = true;

  private rule: IRule|null = null;
  private levelOfDetail: (row: HTMLElement, rowIndex: number) => void;
  private readonly resizeListener = () => this.update();
  private readonly renderer: EngineRenderer;

  private readonly config: IEngineRendererOptions;

  private readonly options: Readonly<ITaggleOptions> = {
    violationChanged: () => undefined
  };

  constructor(parent: HTMLElement, public data: DataProvider, options: Partial<ITaggleOptions & IEngineRendererOptions> = {}) {
    super();

    this.options = Object.assign(this.options, options);

    this.config = this.createConfig(options);

    this.renderer = new EngineRenderer(data, parent, this.config);

    //
    this.renderer.style.addRule('taggle_lod_rule', `
    .lineup-engine [data-lod=low][data-agg=detail]:hover,
    .lineup-engine [data-lod=medium][data-agg=detail]:hover {
        /* show regular height for hovered rows in low + medium LOD */
        height: ${this.config.body.rowHeight}px !important;
      }
    `);

    this.data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.rule`, () => {
      if (this.isDynamicLeafHeight) {
        this.update();
      }
    });
    this.forward(this.renderer, `${RENDERER_EVENT_HOVER_CHANGED}.main`);

    window.addEventListener('resize', this.resizeListener);
  }

  get ctx() {
    return this.renderer.ctx;
  }

  pushUpdateAble(updateAble: (ctx: IRankingHeaderContext) => void) {
    this.renderer.pushUpdateAble(updateAble);
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
    if (!this.rule) {
      this.levelOfDetail = (row: HTMLElement) => {
        row.dataset.lod = 'high';
      };
      return {
        defaultHeight: this.config.body.rowHeight,
        height: (item: IGroupItem | IGroupData) => isGroup(item) ? this.config.body.groupHeight : this.config.body.rowHeight
      };
    }

    const availableHeight = this.renderer ? this.renderer.node.querySelector('main')!.clientHeight : 100;
    const instance = this.rule.apply(data, availableHeight, new Set(this.data.getSelection()));
    this.isDynamicLeafHeight = typeof instance.item === 'function';

    this.options.violationChanged(this.rule, instance.violation || '');

    const height = (item: IGroupItem | IGroupData) => {
      if (isGroup(item)) {
        return typeof instance.group === 'number' ? instance.group : instance.group(item);
      }
      return typeof instance.item === 'number' ? instance.item : instance.item(item);
    };

    this.levelOfDetail = (row: HTMLElement, rowIndex: number) => {
      const item = data[rowIndex];
      row.dataset.lod = this.rule ? this.rule.levelOfDetail(item, height(item)) : 'high';
    };

    return {
      defaultHeight: typeof instance.item === 'number' ? instance.item : NaN,
      height
    };
  }

  protected createEventList() {
    return super.createEventList().concat([TaggleRenderer.EVENT_HOVER_CHANGED]);
  }

  zoomOut() {
    this.renderer.zoomOut();
  }

  zoomIn() {
    this.renderer.zoomIn();
  }

  switchRule(rule: IRule) {
    if (this.rule === rule) {
      return;
    }
    this.rule = rule;
    this.update();
  }

  destroy() {
    this.renderer.destroy();
    window.removeEventListener('resize', this.resizeListener);
  }

  update() {
    this.renderer.update();
  }

  setDataProvider(data: DataProvider) {
    if (this.data) {
      this.data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.rule`, null);
    }
    this.data = data;
    this.data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.rule`, () => {
      if (this.isDynamicLeafHeight) {
        this.update();
      }
    });
    this.renderer.changeDataStorage(data);
    this.update();
  }
}
