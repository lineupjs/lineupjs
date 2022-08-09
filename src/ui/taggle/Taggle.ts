import type { GridStyleManager } from 'lineupengine';
import { defaultOptions } from '../../config';
import type { ITaggleOptions } from '../../config';
import { merge, suffix } from '../../internal';
import type { DataProvider } from '../../provider';
import { cssClass, engineCssClass } from '../../styles';
import { ALineUp } from '../ALineUp';
import SidePanel from '../panel/SidePanel';
import { spaceFillingRule, IRule } from './rules';
import TaggleRenderer from './TaggleRenderer';

export default class Taggle extends ALineUp {
  static readonly EVENT_SELECTION_CHANGED = ALineUp.EVENT_SELECTION_CHANGED;
  static readonly EVENT_DIALOG_OPENED = ALineUp.EVENT_DIALOG_OPENED;
  static readonly EVENT_DIALOG_CLOSED = ALineUp.EVENT_DIALOG_CLOSED;
  static readonly EVENT_HIGHLIGHT_CHANGED = ALineUp.EVENT_HIGHLIGHT_CHANGED;

  private readonly spaceFilling: HTMLElement | null;
  private readonly renderer: TaggleRenderer | null;
  private readonly panel: SidePanel | null;
  private readonly spaceFillingRule: IRule;

  private readonly options = defaultOptions();

  constructor(node: HTMLElement, data: DataProvider, options: Partial<ITaggleOptions> = {}) {
    super(node, data, options && options.ignoreUnsupportedBrowser === true);
    merge(this.options, options);
    merge(this.options, {
      violationChanged: (_rule: any, violation?: string) => this.setViolation(violation),
    });

    if (this.options.copyableRows) {
      this.addCopyListener();
    }
    this.spaceFillingRule = spaceFillingRule(this.options);

    if (!this.isBrowserSupported) {
      this.spaceFilling = null;
      this.renderer = null;
      this.panel = null;
      return;
    }

    this.node.classList.add(cssClass(), cssClass('taggle'));

    this.renderer = new TaggleRenderer(data, this.node, this.options);

    if (this.options.sidePanel) {
      this.panel = new SidePanel(this.renderer.ctx, this.node.ownerDocument!, {
        collapseable: this.options.sidePanelCollapsed ? 'collapsed' : true,
        hierarchy: this.options.hierarchyIndicator && this.options.flags.advancedRankingFeatures,
      });
      this.renderer.pushUpdateAble((ctx) => this.panel!.update(ctx));
      this.node.insertBefore(this.panel.node, this.node.firstChild);
      this.panel.node.insertAdjacentHTML(
        'afterbegin',
        `<div class="${cssClass('rule-button-chooser')} ${cssClass('feature-advanced')} ${cssClass(
          'feature-ui'
        )}"><label>
            <input type="checkbox">
            <span>Overview</span>
            <div class="${cssClass('rule-violation')}"></div>
          </label></div>`
      );
      this.spaceFilling = this.panel.node.querySelector<HTMLElement>(`.${cssClass('rule-button-chooser')}`)!;
      const input = this.spaceFilling.querySelector<HTMLInputElement>('input');
      input.onchange = () => {
        setTimeout(() => {
          this.setOverviewMode(!this.isOverviewMode());
        });
      };
    } else {
      this.panel = null;
      this.spaceFilling = null;
    }
    if (this.options.overviewMode) {
      this.setOverviewMode(true);
    }
    this.forward(
      this.renderer,
      ...suffix(
        '.main',
        TaggleRenderer.EVENT_HIGHLIGHT_CHANGED,
        TaggleRenderer.EVENT_DIALOG_OPENED,
        TaggleRenderer.EVENT_DIALOG_CLOSED
      )
    );
  }

  isOverviewMode() {
    return this.renderer?.getRule() === this.spaceFillingRule;
  }

  setOverviewMode(overviewMode: boolean) {
    if (!this.renderer) {
      return;
    }
    this.updateLodRules(overviewMode);
    this.renderer.switchRule(overviewMode ? this.spaceFillingRule : null);
    if (this.spaceFilling) {
      this.spaceFilling.classList.toggle(cssClass('chosen'), overviewMode);
      this.spaceFilling.querySelector<HTMLInputElement>('input')!.checked = overviewMode;
    }
  }

  private updateLodRules(overviewMode: boolean) {
    if (!this.renderer) {
      return;
    }
    updateLodRules(this.renderer.style, overviewMode, this.options);
  }

  private setViolation(violation?: string) {
    violation = violation || '';
    if (!this.spaceFilling) {
      return;
    }
    this.spaceFilling.classList.toggle(cssClass('violated'), Boolean(violation));
    const elem = this.spaceFilling.querySelector(`.${cssClass('rule-violation')}`)!;
    if (!violation) {
      elem.textContent = '';
    } else {
      elem.innerHTML = violation.replace(/\n/g, '<br>');
    }
  }

  destroy() {
    this.node.classList.remove(cssClass(), cssClass('taggle'));
    if (this.renderer) {
      this.renderer.destroy();
    }
    if (this.panel) {
      this.panel.destroy();
    }
    super.destroy();
  }

  update() {
    if (this.renderer) {
      this.renderer.update();
    }
  }

  setHighlight(dataIndex: number, scrollIntoView = true) {
    return this.renderer != null && this.renderer.setHighlight(dataIndex, scrollIntoView);
  }

  getHighlight() {
    return this.renderer ? this.renderer.getHighlight() : -1;
  }

  protected enableHighlightListening(enable: boolean) {
    if (this.renderer) {
      this.renderer.enableHighlightListening(enable);
    }
  }

  setDataProvider(data: DataProvider, dump?: any) {
    super.setDataProvider(data, dump);
    if (!this.renderer) {
      return;
    }
    this.renderer.setDataProvider(data);
    this.update();
    this.panel!.update(this.renderer.ctx);
  }
}

export function updateLodRules(style: GridStyleManager, overviewMode: boolean, options: Readonly<ITaggleOptions>) {
  if (!overviewMode) {
    style.deleteRule('taggle_lod_rule');
    style.deleteRule('lineup_rowPadding1');
    style.deleteRule('lineup_rowPadding2');
    return;
  }

  style.updateRule(
    'taggle_lod_rule',
    `
  .${engineCssClass('tr')}.${cssClass('low')}[data-agg=detail]:hover`,
    {
      /* show regular height for hovered rows in low + medium LOD */
      height: `${options.rowHeight}px !important`,
    }
  );

  style.updateRule(
    'lineup_rowPadding1',
    `
  .${engineCssClass('tr')}.${cssClass('low')}`,
    {
      marginTop: '0',
    }
  );

  // no margin for hovered low level row otherwise everything will be shifted down and the hover is gone again
  // .${engineCssClass('tr')}.${cssClass('low')}:hover,

  // padding in general and for hovered low detail rows + their afterwards
  style.updateRule(
    'lineup_rowPadding2',
    `
  .${engineCssClass('tr')}.${cssClass('low')}.${engineCssClass('highlighted')},
  .${engineCssClass('tr')}.${cssClass('selected')},
  .${engineCssClass('tr')}.${cssClass('low')}:hover + .${engineCssClass('tr')}.${cssClass('low')},
  .${engineCssClass('tr')}.${cssClass('low')}.${engineCssClass('highlighted')} + .${engineCssClass('tr')}.${cssClass(
      'low'
    )},
  .${engineCssClass('tr')}.${cssClass('selected')} + .${engineCssClass('tr')}.${cssClass('low')}`,
    {
      marginTop: `${options.rowPadding}px !important`,
    }
  );
}
