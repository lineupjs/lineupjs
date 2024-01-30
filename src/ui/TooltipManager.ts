import { createPopper, type Instance, type Modifier, type OptionsGeneric } from '@popperjs/core';
import AEventDispatcher from '../internal/AEventDispatcher';
import { TOOLTIP_CLASS, cssClass } from '../styles';

type VirtualElement = {
  getBoundingClientRect: () => DOMRect;
  contextElement?: Element;
};

export default class TooltipManager extends AEventDispatcher {
  static readonly EVENT_TOOLTIP_OPENED = 'tooltipOpened';
  static readonly EVENT_TOOLTIP_CLOSED = 'tooltipClosed';

  readonly node: HTMLElement;
  private contentNode: HTMLElement;
  readonly tooltipArrow: HTMLElement;
  private popperInstance: Instance;
  private popperOptions: Partial<OptionsGeneric<Partial<Modifier<any, any>>>>;
  private targetElement: VirtualElement;

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
    this.targetElement = {
      getBoundingClientRect: () => this.node.getBoundingClientRect(),
    };
    this.popperInstance = createPopper(this.targetElement, this.node, this.popperOptions);
    this.hideTooltip();
  }

  updateTooltipContent(element: HTMLElement) {
    this.contentNode.replaceChildren(element);
  }

  showTooltip(targetElement: HTMLElement, contentUpdate?: HTMLElement) {
    if (contentUpdate) {
      this.updateTooltipContent(contentUpdate);
    }
    if (this.popperInstance) {
      this.popperInstance.setOptions((options) => ({
        ...options,
        modifiers: [...options.modifiers, { name: 'eventListeners', enabled: true }],
      }));
      this.targetElement.getBoundingClientRect = () => targetElement.getBoundingClientRect();
    }
    this.node.style.display = 'block';
    this.fire(TooltipManager.EVENT_TOOLTIP_OPENED);
  }

  hideTooltip() {
    if (this.popperInstance) {
      this.popperInstance.setOptions((options) => ({
        ...options,
        modifiers: [...options.modifiers, { name: 'eventListeners', enabled: false }],
      }));
    } else {
      console.warn('No popper instance found');
    }
    this.node.style.display = 'none';
    this.fire(TooltipManager.EVENT_TOOLTIP_CLOSED);
  }

  protected createEventList() {
    return super.createEventList().concat([TooltipManager.EVENT_TOOLTIP_CLOSED, TooltipManager.EVENT_TOOLTIP_OPENED]);
  }
}
