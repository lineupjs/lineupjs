/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {dispatch, select, event as d3event, Dispatch} from 'd3';
import Column from './model/Column';
import {IDOMCellRenderer} from './renderer/IDOMCellRenderers';

/**
 * create a delayed call, can be called multiple times but only the last one at most delayed by timeToDelay will be executed
 * @param callback the callback to call
 * @param timeToDelay delay the call in milliseconds
 * @param thisCallback this argument of the callback
 * @return {function(...[any]): undefined} a function that can be called with the same interface as the callback but delayed
 */
export function delayedCall(callback: (...args: any[]) => void, timeToDelay = 100, thisCallback = this) {
  let tm = -1;
  return function (...args: any[]) {
    if (tm >= 0) {
      clearTimeout(tm);
      tm = -1;
    }
    args.unshift(thisCallback === null ? this : thisCallback);
    tm = setTimeout(callback.bind.apply(callback, args), timeToDelay);
  };
}

/**
 * base class for event dispatching using d3 event mechanism
 */
export class AEventDispatcher {
  private listeners: Dispatch;
  private forwarder;

  constructor() {
    this.listeners = dispatch(...this.createEventList());

    const that = this;
    this.forwarder = function (...args: any[]) {
      that.fire(this.type, ...args);
    };
  }

  on(type: string): (...args: any[]) => void;
  on(type: string|string[], listener: (...args: any[]) => any): AEventDispatcher;
  on(type: string|string[], listener?: (...args: any[]) => any): any {
    if (arguments.length > 1) {
      if (Array.isArray(type)) {
        (<string[]>type).forEach((d) => this.listeners.on(d, listener));
      } else {
        this.listeners.on(<string>type, listener);
      }
      return this;
    }
    return this.listeners.on(<string>type);
  }

  /**
   * return the list of events to be able to dispatch
   * @return {Array}
   */
  protected createEventList(): string[] {
    return [];
  }

  protected fire(type: string|string[], ...args: any[]) {
    const fireImpl = (t) => {
      //local context per event, set a this argument
      const context = {
        source: this, //who is sending this event
        type: t, //the event type
        args //the arguments to the listener
      };
      this.listeners[<string>t].apply(context, args);
    };
    if (Array.isArray(type)) {
      (<string[]>type).forEach(fireImpl.bind(this));
    } else {
      fireImpl(<string>type);
    }
  }

  /**
   * forwards one or more events from a given dispatcher to the current one
   * i.e. when one of the given events is fired in 'from' it will be forwarded to all my listeners
   * @param from the event dispatcher to forward from
   * @param types the event types to forward
   */
  protected forward(from: AEventDispatcher, ...types: string[]) {
    from.on(types, this.forwarder);
  }

  /**
   * removes the forwarding declarations
   * @param from
   * @param types
   */
  protected unforward(from: AEventDispatcher, ...types: string[]) {
    from.on(types, null);
  }
}

const TYPE_OBJECT = '[object Object]';

//credits to https://github.com/vladmiller/dextend/blob/master/lib/dextend.js
export function merge(...args: any[]) {
  let result = null;

  for (const toMerge of args) {
    const keys = Object.keys(toMerge);

    if (result === null) {
      result = toMerge;
      continue;
    }

    for (const keyName of keys) {
      const value = toMerge[keyName];

      //merge just POJOs
      if (Object.prototype.toString.call(value) === TYPE_OBJECT && (Object.getPrototypeOf(value) === Object.prototype)) { //pojo
        if (result[keyName] === undefined) {
          result[keyName] = {};
        }
        result[keyName] = merge(result[keyName], value);
      } else if (Array.isArray(value)) {
        if (result[keyName] === undefined) {
          result[keyName] = [];
        }
        result[keyName] = value.concat(result[keyName]);
      } else {
        result[keyName] = value;
      }
    }
  }

  return result;
}

/**
 * computes the absolute offset of the given element
 * @param element
 * @return {{left: number, top: number, width: number, height: number}}
 */
export function offset(element) {
  const obj = element.getBoundingClientRect();
  return {
    left: obj.left + window.pageXOffset,
    top: obj.top + window.pageYOffset,
    width: obj.width,
    height: obj.height
  };
}

export interface IContentScrollerOptions {
  topShift?(): number;
  backupRows?: number;
  rowHeight?: number;
}

/**
 * content scroller utility
 *
 * a class for efficiently selecting a range of data items that are currently visible according to the scrolled position
 */
export class ContentScroller extends AEventDispatcher {
  static readonly EVENT_SCROLL = 'scroll';
  static readonly EVENT_REDRAW = 'redraw';

  private options: IContentScrollerOptions = {
    /**
     * shift that should be used for calculating the top position
     */
    topShift: () => 0,
    /**
     * backup rows, i.e .the number of rows that should also be shown for avoiding to frequent updates
     */
    backupRows: 5,
    /**
     * the height of one row in pixel
     */
    rowHeight: 10
  };

  private prevScrollTop = 0;
  private shift = 0;

  /**
   *
   * @param container the container element wrapping the content with a fixed height for enforcing scrolling
   * @param content the content element to scroll
   * @param options options see attribute
   */
  constructor(private container: Element, private content: Element, options: IContentScrollerOptions = {}) {
    super();
    merge(this.options, options);
    select(container).on('scroll.scroller', () => this.onScroll());

    //keep the previous state computing whether a redraw is needed
    this.prevScrollTop = container.scrollTop;
    //total shift to the top
    this.shift = offset(content).top - offset(container).top;
  }

  /**
   * two events are fired:
   *  * scroll when the user scrolls the container
   *  * redraw when a redraw of the content must be performed due to scrolling changes. Note due to backup rows
   *     a scrolling operation might not include a redraw
   *
   * @returns {string[]}
   */
  protected createEventList() {
    return super.createEventList().concat([ContentScroller.EVENT_REDRAW, ContentScroller.EVENT_SCROLL]);
  }

  scrollIntoView(start: number, length: number, index: number, row2y: (i: number) => number) {
    const range = this.selectImpl(start, length, row2y, 0);
    if (range.from <= index && index <= range.to) {
      return; //already visible
    }

    const target = row2y(index) - 10; //magic constanst shift

    const min = 0;
    const max = this.container.scrollHeight - this.container.clientHeight;
    // clamp to valid area
    this.container.scrollTop = Math.max(min, Math.min(max, target));
  }

  /**
   * selects a range identified by start and length and the row2y position callback returning the slice to show according to the current user scrolling position
   * @param start start of the range
   * @param length length of the range
   * @param row2y lookup for computing the y position of a given row
   * @returns {{from: number, to: number}} the slide to show
   */
  select(start: number, length: number, row2y: (i: number) => number) {
    return this.selectImpl(start, length, row2y, this.options.backupRows);
  }

  private selectImpl(start: number, length: number, row2y: (i: number) => number, backupRows: number) {
    const top = this.container.scrollTop - this.shift - this.options.topShift(),
      bottom = top + this.container.clientHeight;
    let i = 0, j;
    /*console.log(window.matchMedia('print').matches, window.matchMedia('screen').matches, top, bottom);
     if (typeof window.matchMedia === 'function' && window.matchMedia('print').matches) {
     console.log('show all');
     return [0, data.length];
     }*/
    if (top > 0) {
      i = Math.round(top / this.options.rowHeight);
      //count up till really even partial rows are visible
      while (i >= start && row2y(i + 1) > top) {
        i--;
      }
      i -= backupRows; //one more row as backup for scrolling
    }
    { //some parts from the bottom aren't visible
      j = Math.round(bottom / this.options.rowHeight);
      //count down till really even partial rows are visible
      while (j <= length && row2y(j - 1) < bottom) {
        j++;
      }
      j += backupRows; //one more row as backup for scrolling
    }
    return {
      from: Math.max(i, start),
      to: Math.min(j, length)
    };
  }

  private onScroll() {
    const top = this.container.scrollTop;
    const left = this.container.scrollLeft;
    //at least one row changed
    //console.log(top, left);
    this.fire(ContentScroller.EVENT_SCROLL, top, left);
    if (Math.abs(this.prevScrollTop - top) >= this.options.rowHeight * this.options.backupRows) {
      //we scrolled out of our backup rows, so we have to redraw the content
      this.prevScrollTop = top;
      this.fire(ContentScroller.EVENT_REDRAW);
    }
  }

  /**
   * removes the listeners
   */
  destroy() {
    select(this.container).on('scroll.scroller', null);
  }
}

/**
 * checks whether the given DragEvent has one of the given types
 */
export function hasDnDType(e: DragEvent, typesToCheck: string[]) {
  const types: any = e.dataTransfer.types;
  if (typeof types.indexOf === 'function') {
    return typesToCheck.some((type) => types.indexOf(type) >= 0);
  }
  if (typeof types.includes === 'function') {
    return typesToCheck.some((type) => types.includes(type));
  }
  if (typeof types.contains === 'function') {
    return typesToCheck.some((type) => types.contains(type));
  }
  return false;
}

/**
 * should it be a copy dnd operation?
 */
export function copyDnD(e: DragEvent) {
  const dT = e.dataTransfer;
  return (e.ctrlKey && dT.effectAllowed.match(/copy/gi) != null) || (dT.effectAllowed.match(/move/gi) == null);
}

/**
 * updates the drop effect according to the currently selected meta keys
 * @param e
 */
export function updateDropEffect(e: DragEvent) {
  const dT = e.dataTransfer;
  if (copyDnD(e)) {
    dT.dropEffect = 'copy';
  } else {
    dT.dropEffect = 'move';
  }
}

/**
 * returns a d3 callable function to make an element dropable, managed the class css 'drag_over' for hovering effects
 * @param mimeTypes the mime types to be dropable
 * @param onDrop: handler when an element is dropped
 */
export function dropAble<T>(mimeTypes: string[], onDrop: (data: any, d: T, copy: boolean) => boolean) {
  return ($node) => {
    $node.on('dragenter', function () {
      const e = <DragEvent>(<any>d3event);
      //var xy = mouse($node.node());
      if (hasDnDType(e, mimeTypes)) {
        select(this).classed('drag_over', true);
        //sounds good
        return false;
      }
      //not a valid mime type
      select(this).classed('drag_over', false);
    }).on('dragover', function () {
      const e = <DragEvent>(<any>d3event);
      if (hasDnDType(e, mimeTypes)) {
        e.preventDefault();
        updateDropEffect(e);
        select(this).classed('drag_over', true);
        return false;
      }
    }).on('dragleave', function () {
      //
      select(this).classed('drag_over', false);
    }).on('drop', function (d: T) {
      const e = <DragEvent>(<any>d3event);
      e.preventDefault();
      select(this).classed('drag_over', false);
      //var xy = mouse($node.node());
      if (hasDnDType(e, mimeTypes)) {
        const data: any = {};
        //selects the data contained in the data transfer
        mimeTypes.forEach((mime) => {
          const value = e.dataTransfer.getData(mime);
          if (value !== '') {
            data[mime] = value;
          }
        });
        return onDrop(data, d, copyDnD(e));
      }
    });
  };
}


/**
 * utility function to sets attributes and styles in a nodes
 * @param node
 * @param attrs
 * @param styles
 * @return {T}
 */
export function attr<T extends (HTMLElement | SVGElement & SVGStylable)>(node: T, attrs = {}, styles = {}): T {
  Object.keys(attrs).forEach((attr) => node.setAttribute(attr, String(attrs[attr])));
  Object.keys(styles).forEach((attr) => node.style.setProperty(attr, styles[attr]));
  return node;
}

/**
 * for each item matching the selector execute the callback
 * @param node
 * @param selector
 * @param callback
 */
export function forEach<T extends Element>(node: T, selector: string, callback: (d: Element, i: number) => void) {
  Array.prototype.slice.call(node.querySelectorAll(selector)).forEach(callback);
}

export interface ITextRenderHints {
  readonly maxLetterWidth: number;
  readonly avgLetterWidth: number;
  readonly ellipsisWidth: number;
  readonly spinnerWidth: number;
}
const ellipsis = '…';

function measureFontAweSomeSpinner(ctx: CanvasRenderingContext2D) {
  ctx.font = '10pt FontAwesome';
  return ctx.measureText('\uf110').width;
}

export function createTextHints(ctx: CanvasRenderingContext2D, font: string): ITextRenderHints {
  const bak = ctx.font;
  const spinnerWidth = measureFontAweSomeSpinner(ctx);
  ctx.font = font;
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const testText = alphabet + (alphabet.toUpperCase()) + '0123456789';
  const r = {
    maxLetterWidth: ctx.measureText('M').width,
    avgLetterWidth: ctx.measureText(testText).width / testText.length,
    ellipsisWidth: ctx.measureText(ellipsis).width,
    spinnerWidth
  };
  ctx.font = bak;
  return r;
}

export function clipText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, hints: ITextRenderHints) {
  //based on http://stackoverflow.com/questions/10508988/html-canvas-text-overflow-ellipsis#10511598
  const render = (t: string) => ctx.fillText(t, x, y, maxWidth);

  //check if using heuristics
  if (hints.maxLetterWidth * text.length <= maxWidth || maxWidth <= hints.ellipsisWidth || text.length === 0) {
    return render(text);
  }

  //check precisely
  if (ctx.measureText(text).width <= maxWidth) {
    return render(text);
  }

  const availWidth = maxWidth - hints.ellipsisWidth;

  // use binary search
  let min = 0;
  let max = text.length - 1;
  // guess first based on average letter width
  let guess = Math.min(max, Math.floor(maxWidth / hints.avgLetterWidth));
  while (min < max) {
    const overflow = availWidth - ctx.measureText(text.substring(0, guess + 1)).width;
    if (overflow < 0) { //less characters needed
      max = guess - 1;
    } else if (overflow > 0) { // more characters possible
      min = guess + 1;
    } else { //hit it :)
      break;
    }
    guess = Math.floor((max + min) / 2); //compute next guess
  }
  return render(text.substring(0, min + 1) + ellipsis);
}

export function showOverlay(id: string, dx: number, dy: number) {
  let overlay = <HTMLDivElement>document.querySelector(`div.lu-overlay#O${id}`);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.classList.add('lu-overlay');
    overlay.id = 'O' + id;
    document.querySelector('.lu-body').appendChild(overlay);
  }
  overlay.style.display = 'block';
  overlay.style.left = dx + 'px';
  overlay.style.top = dy + 'px';
  return overlay;
}

export function hideOverlays() {
  forEach(document.querySelector('div.lu-body'), 'div.lu-overlay', (d: HTMLDivElement) => d.style.display = null);
}


/**
 * machtes the columns and the dom nodes representing them
 * @param node
 * @param columns
 * @param helperType
 */
export function matchColumns(node: SVGGElement | HTMLElement, columns: {column: Column, renderer: IDOMCellRenderer<any>}[], helperType = 'svg') {
  if (node.childElementCount === 0) {
    // initial call fast method
    node.innerHTML = columns.map((c) => c.renderer.template).join('');
    columns.forEach((col, i) => {
      const cnode = <Element>node.childNodes[i];
      // set attribute for finding again
      cnode.setAttribute('data-column-id', col.column.id);
      // store current renderer
      cnode.setAttribute('data-renderer', col.column.getRendererType());
    });
    return;
  }

  function matches(c: {column: Column}, i: number) {
    //do both match?
    const n = <Element>(node.childElementCount <= i ? null : node.childNodes[i]);
    return n != null && n.getAttribute('data-column-id') === c.column.id && n.getAttribute('data-renderer') === c.column.getRendererType();
  }

  if (columns.every(matches)) {
    return; //nothing to do
  }

  const idsAndRenderer = new Set(columns.map((c) => c.column.id + '@' + c.column.getRendererType()));
  //remove all that are not existing anymore
  Array.prototype.slice.call(node.childNodes).forEach((n) => {
    const id = n.getAttribute('data-column-id');
    const renderer = n.getAttribute('data-renderer');
    const idAndRenderer = id + '@' + renderer;
    if (!idsAndRenderer.has(idAndRenderer)) {
      node.removeChild(n);
    }
  });
  const helper = helperType === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', 'g') : document.createElement('div');
  columns.forEach((col) => {
    let cnode = node.querySelector(`[data-column-id="${col.column.id}"]`);
    if (!cnode) {
      //create one
      helper.innerHTML = col.renderer.template;
      cnode = <Element>helper.childNodes[0];
      cnode.setAttribute('data-column-id', col.column.id);
      cnode.setAttribute('data-renderer', col.column.getRendererType());
    }
    node.appendChild(cnode);
  });
}
