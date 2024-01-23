import { createPopper, type Instance, type Modifier, type OptionsGeneric } from '@popperjs/core';
import AEventDispatcher from '../internal/AEventDispatcher';
import { TOOLTIP_CLASS, cssClass } from '../styles';

export default class TooltipManager extends AEventDispatcher {
  static readonly EVENT_TOOLTIP_OPENED = 'tooltipOpened';
  static readonly EVENT_TOOLTIP_CLOSED = 'tooltipClosed';

  readonly node: HTMLElement;
  private contentNode: HTMLElement;
  readonly tooltipArrow: HTMLElement;
  private popperInstance: Instance;
  private popperOptions: Partial<OptionsGeneric<Partial<Modifier<any, any>>>>;

  constructor(options: {
    doc: Document;
    idPrefix: string;
    defaultPopperOptions?: Partial<OptionsGeneric<Partial<Modifier<any, any>>>>;
  }) {
    super();
    const doc = options.doc;
    this.node = doc.createElement('div');
    this.node.classList.add(TOOLTIP_CLASS);
    this.contentNode = doc.createElement('div');
    this.node.appendChild(this.contentNode);
    this.tooltipArrow = doc.createElement('div');
    this.tooltipArrow.id = `${options.idPrefix}-tooltip-arrow`;
    this.tooltipArrow.classList.add(cssClass('tooltip-arrow'));
    this.tooltipArrow.setAttribute('data-popper-arrow', '');
    this.node.appendChild(this.tooltipArrow);
    this.popperOptions = options.defaultPopperOptions || {
      strategy: 'fixed',
      placement: 'auto-start',
      modifiers: [
        { name: 'arrow', options: { element: this.tooltipArrow } },
        {
          name: 'offset',
          options: {
            offset: [0, 4],
          },
        },
      ],
    };
  }

  updateTooltipContent(element: HTMLElement) {
    this.contentNode.replaceChildren(element);
  }

  showTooltip(
    targetElement: HTMLElement,
    contentUpdate?: HTMLElement,
    popperOptions?: Partial<OptionsGeneric<Partial<Modifier<any, any>>>>
  ) {
    if (contentUpdate) {
      this.updateTooltipContent(contentUpdate);
    }
    this.popperInstance = createPopper(targetElement, this.node, popperOptions || this.popperOptions);
    this.node.style.display = 'block';
  }

  hideTooltip() {
    if (this.popperInstance) {
      this.popperInstance.destroy();
    }
    this.node.style.display = 'none';
  }

  protected createEventList() {
    return super.createEventList().concat([TooltipManager.EVENT_TOOLTIP_CLOSED, TooltipManager.EVENT_TOOLTIP_OPENED]);
  }
}
