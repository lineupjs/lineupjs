import {ILineUpOptions} from '../../interfaces';
import AEventDispatcher from '../../internal/AEventDispatcher';
import debounce from '../../internal/debounce';
import {IGroupData, IGroupItem, isGroup} from '../../model';
import Ranking from '../../model/Ranking';
import DataProvider from '../../provider/ADataProvider';
import EngineRenderer from '../EngineRenderer';
import {IRankingHeaderContext, RENDERER_EVENT_HOVER_CHANGED} from '../interfaces';
import {IRule} from './interfaces';

export interface ITaggleOptions {
  violationChanged(rule: IRule, violation: string): void;
}

export default class TaggleRenderer extends AEventDispatcher {
  /**
   * triggered when the mouse is over a specific row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static readonly EVENT_HOVER_CHANGED = RENDERER_EVENT_HOVER_CHANGED;

  private isDynamicLeafHeight: boolean = false;

  private rule: IRule | null = null;
  private levelOfDetail: (row: HTMLElement, rowIndex: number) => void;
  private readonly resizeListener = () => debounce(() => this.update(), 100);
  private readonly renderer: EngineRenderer;

  private readonly options: Readonly<ITaggleOptions> = {
    violationChanged: () => undefined
  };

  constructor(parent: HTMLElement, public data: DataProvider, options: (Partial<ITaggleOptions> & Readonly<ILineUpOptions>)) {
    super();


    this.renderer = new EngineRenderer(data, parent, Object.assign({}, options, {
      dynamicHeight: (data: (IGroupData | IGroupItem)[], ranking: Ranking) => {
        const r = this.dynamicHeight(data);
        if (r) {
          return r;
        }
        return options.dynamicHeight ? options.dynamicHeight(data, ranking) : null;
      },
      customRowUpdate: (row: HTMLElement, rowIndex: number) => {
        if (this.levelOfDetail) {
          this.levelOfDetail(row, rowIndex);
        }
        if (options.customRowUpdate) {
          options.customRowUpdate(row, rowIndex);
        }
      }
    }));

    //
    this.renderer.style.addRule('taggle_lod_rule', `
      #${options.idPrefix} [data-lod=low][data-agg=detail]:hover {
        /* show regular height for hovered rows in low + medium LOD */
        height: ${options.rowHeight}px !important;
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

  private dynamicHeight(data: (IGroupData | IGroupItem)[]) {
    if (!this.rule) {
      this.levelOfDetail = (row: HTMLElement) => {
        delete row.dataset.lod;
      };
      return null;
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
      const lod = this.rule ? this.rule.levelOfDetail(item, height(item)) : 'high';
      if (lod === 'high') {
        delete row.dataset.lod;
      } else {
        row.dataset.lod = lod;
      }
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

  switchRule(rule: IRule | null) {
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
    this.renderer.setDataProvider(data);
    this.update();
  }
}
