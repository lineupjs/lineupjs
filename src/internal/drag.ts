
/** @internal */
export interface IDragHandleOptions {
  /**
   * drag base container
   * @default handle parentElement
   */
  container: HTMLElement | SVGElement;
  /**
   * filter to certain mouse events, e.g. shift only
   */
  filter(evt: MouseEvent): boolean;

  onStart(handle: HTMLElement | SVGElement, x: number, delta: number, evt: MouseEvent): void;

  onDrag(handle: HTMLElement | SVGElement, x: number, delta: number, evt: MouseEvent): void;

  onEnd(handle: HTMLElement | SVGElement, x: number, delta: number, evt: MouseEvent): void;

  /**
   * minimal pixel delta
   * @default 2
   */
  minDelta: number;
}

/**
 * allow to change the width of a column using dragging the handle
 * @internal
 */
export function dragHandle(handle: HTMLElement | SVGElement, options: Partial<IDragHandleOptions> = {}) {
  const o: Readonly<IDragHandleOptions> = Object.assign({
    container: handle.parentElement!,
    filter: () => true,
    onStart: () => undefined,
    onDrag: () => undefined,
    onEnd: () => undefined,
    minDelta: 2
  }, options);

  // converts the given x coordinate to be relative to the given element
  const toContainerRelative = (x: number, elem: HTMLElement | SVGElement) => {
    const rect = elem.getBoundingClientRect();
    return x - rect.left - elem.clientLeft;
  };

  let start = 0;
  let last = 0;
  let handleShift = 0;

  const mouseMove = (evt: MouseEvent) => {
    if (!o.filter(evt)) {
      return;
    }
    evt.stopPropagation();
    evt.preventDefault();

    const end = toContainerRelative(evt.clientX, o.container) - handleShift;
    if (Math.abs(last - end) < o.minDelta) {
      //ignore
      return;
    }

    last = end;
    o.onDrag(handle, end, last - end, evt);
  };

  const mouseUp = (evt: MouseEvent) => {
    if (!o.filter(evt)) {
      return;
    }
    evt.stopPropagation();
    evt.preventDefault();

    const end = toContainerRelative(evt.clientX, o.container) - handleShift;
    o.container.removeEventListener('mousemove', <any>mouseMove);
    o.container.removeEventListener('mouseup', <any>mouseUp);
    o.container.removeEventListener('mouseleave', <any>mouseUp);

    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }

    o.onEnd(handle, end, start - end, evt);
  };

  handle.onmousedown = (evt) => {
    if (!o.filter(evt)) {
      return;
    }
    evt.stopPropagation();
    evt.preventDefault();

    handleShift = toContainerRelative(evt.clientX, handle);
    start = last = toContainerRelative(evt.clientX, o.container) - handleShift;

    // register other event listeners
    o.container.addEventListener('mousemove', <any>mouseMove);
    o.container.addEventListener('mouseup', <any>mouseUp);
    o.container.addEventListener('mouseleave', <any>mouseUp);

    o.onStart(handle, start, 0, evt);
  };
}
