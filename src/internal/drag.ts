import { cssClass } from '../styles';

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
  const o: Readonly<IDragHandleOptions> = Object.assign(
    {
      container: handle.parentElement!,
      filter: () => true,
      onStart: () => undefined,
      onDrag: () => undefined,
      onEnd: () => undefined,
      minDelta: 2,
    },
    options
  );

  let ueberElement: HTMLElement | null = null;

  // converts the given x coordinate to be relative to the given element
  const toContainerRelative = (x: number, elem: HTMLElement | SVGElement) => {
    const rect = elem.getBoundingClientRect();
    return x - rect.left - elem.clientLeft;
  };

  let start = 0;
  let last = 0;
  let handleShift = 0;
  let activePointerId = -1;

  const pointerMove = (evt: PointerEvent) => {
    if (evt.pointerId !== activePointerId) {
      return;
    }
    if (evt.pointerType === 'mouse' && !o.filter(evt as unknown as MouseEvent)) {
      return;
    }
    evt.stopPropagation();
    evt.preventDefault();

    const end = toContainerRelative(evt.clientX, o.container) - handleShift;
    if (Math.abs(last - end) < o.minDelta) {
      //ignore
      return;
    }

    const delta = end - last;
    last = end;
    o.onDrag(handle, end, delta, evt as unknown as MouseEvent);
  };

  const pointerUp = (evt: PointerEvent) => {
    if (evt.pointerId !== activePointerId) {
      return;
    }
    if (evt.pointerType === 'mouse' && !o.filter(evt as unknown as MouseEvent)) {
      return;
    }
    evt.stopPropagation();
    evt.preventDefault();

    activePointerId = -1;
    const end = toContainerRelative(evt.clientX, o.container) - handleShift;
    handle.removeEventListener('pointermove', pointerMove);
    handle.removeEventListener('pointerup', pointerUp);
    handle.removeEventListener('pointercancel', pointerUp);
    ueberElement!.classList.remove(cssClass('dragging'));

    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }

    o.onEnd(handle, end, start - end, evt as unknown as MouseEvent);
  };

  handle.addEventListener('pointerdown', (evt: PointerEvent) => {
    if (evt.pointerType === 'mouse' && !o.filter(evt as unknown as MouseEvent)) {
      return;
    }
    evt.stopPropagation();
    evt.preventDefault();

    activePointerId = evt.pointerId;
    (handle as Element).setPointerCapture(evt.pointerId);

    handleShift = toContainerRelative(evt.clientX, handle);
    start = last = toContainerRelative(evt.clientX, o.container) - handleShift;

    // With pointer capture active all subsequent pointer events are delivered to
    // the handle itself, so we register move/up/cancel on the handle too.
    handle.addEventListener('pointermove', pointerMove);
    handle.addEventListener('pointerup', pointerUp);
    handle.addEventListener('pointercancel', pointerUp);

    ueberElement = handle.closest('body') || handle.closest<HTMLElement>(`.${cssClass()}`)!; // take the whole body or root lineup
    ueberElement.classList.add(cssClass('dragging'));

    o.onStart(handle, start, 0, evt as unknown as MouseEvent);
  });
}
