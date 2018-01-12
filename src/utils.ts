/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {dispatch, Dispatch, select, scale as d3scale, hsl as d3hsl} from 'd3';
import Column, {IColumnDesc} from './model/Column';
import {IDOMCellRenderer, IDOMGroupRenderer} from './renderer/IDOMCellRenderers';

export function round(v: number, precision: number = 0) {
  if (precision === 0) {
    return Math.round(v);
  }
  const scale = Math.pow(10, precision);
  return Math.round(v * scale) / scale;
}

export function findOption(options: any) {
  return (key: string, defaultValue: any): any => {
    if (key in options) {
      return options[key];
    }
    if (key.indexOf('.') > 0) {
      const p = key.substring(0, key.indexOf('.'));
      key = key.substring(key.indexOf('.') + 1);
      if (p in options && key in options[p]) {
        return options[p][key];
      }
    }
    return defaultValue;
  };
}

export function similar(a: number, b: number, delta = 0.5) {
  if (a === b) {
    return true;
  }
  return Math.abs(a - b) < delta;
}

interface IDebounceContext {
  self: any;
  args: any[];
}

/**
 * create a delayed call, can be called multiple times but only the last one at most delayed by timeToDelay will be executed
 * @param {(...args: any[]) => void} callback the callback to call
 * @param {number} timeToDelay delay the call in milliseconds
 * @return {(...args: any[]) => any} a function that can be called with the same interface as the callback but delayed
 */
export function debounce(callback: (...args: any[]) => void, timeToDelay = 100, choose?: (current: IDebounceContext, next: IDebounceContext)=>IDebounceContext) {
  let tm = -1;
  let ctx: IDebounceContext|null = null;
  return function (this: any, ...args: any[]) {
    if (tm >= 0) {
      clearTimeout(tm);
      tm = -1;
    }
    const next = { self: this, args};
    ctx = ctx && choose ? choose(ctx, next) : next;
    tm = <any>setTimeout(() => {
      console.assert(ctx != null);
      callback.call(ctx!.self, ...ctx!.args);
      ctx = null;
    }, timeToDelay);
  };
}

export function suffix(suffix: string, ...prefix: string[]) {
  return prefix.map((p) => `${p}${suffix}`);
}

export interface IEventContext {
  /**
   * who is sending this event
   */
  readonly source: AEventDispatcher;

  readonly origin: AEventDispatcher;
  /**
   * the event type
   */
  readonly type: string;
  /**
   * in case of multi propagation the 'main' event type
   */
  readonly primaryType: string;
  /**
   * the arguments to the listener
   */
  readonly args: any[];
}

/**
 * base class for event dispatching using d3 event mechanism
 */
export class AEventDispatcher {
  private listeners: Dispatch;
  private forwarder: (...args: any[]) => void;

  constructor() {
    this.listeners = dispatch(...this.createEventList());

    const that = this;
    this.forwarder = function (this: IEventContext, ...args: any[]) {
      that.fireImpl(this.type, this.primaryType, this.origin, ...args);
    };
  }

  on(type: string): (...args: any[]) => void;
  on(type: string | string[], listener: ((...args: any[]) => any) | null): AEventDispatcher;
  on(type: string | string[], listener?: ((...args: any[]) => any) | null): any {
    if (listener !== undefined) {
      if (Array.isArray(type)) {
        (<string[]>type).forEach((d) => this.listeners.on(d, listener!));
      } else {
        this.listeners.on(<string>type, listener!);
      }
      return this;
    }
    return this.listeners.on(<string>type);
  }

  /**
   * return the list of events to be able to dispatch
   * @return {Array} by default no events
   */
  protected createEventList(): string[] {
    return [];
  }

  protected fire(type: string | string[], ...args: any[]) {
    const primaryType = Array.isArray(type) ? type[0] : type;
    this.fireImpl(type, primaryType, this, ...args);
  }

  private fireImpl(type: string | string[], primaryType: string, origin: AEventDispatcher, ...args: any[]) {
    const fireImpl = (t: string) => {
      //local context per event, set a this argument
      const context: IEventContext = {
        source: this, //who is sending this event,
        origin,
        type: t, //the event type
        primaryType, //in case of multi propagation the 'main' event type
        args //the arguments to the listener
      };
      this.listeners[t].apply(context, args);
    };
    if (Array.isArray(type)) {
      type.forEach(fireImpl.bind(this));
    } else {
      fireImpl(<string>type);
    }
  }

  /**
   * forwards one or more events from a given dispatcher to the current one
   * i.e. when one of the given events is fired in 'from' it will be forwarded to all my listeners
   * @param {AEventDispatcher} from the event dispatcher to forward from
   * @param {string[]} types the event types to forward
   */
  protected forward(from: AEventDispatcher, ...types: string[]) {
    from.on(types, this.forwarder);
  }

  /**
   * removes the forwarding declarations
   * @param {AEventDispatcher} from the originated dispatcher
   * @param {string[]} types event types to forward
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
 * @param {Element} element element to compute the offset of
 * @return {{left: number, top: number, width: number, height: number}} offset of the element
 */
export function offset(element: Element) {
  const obj = element.getBoundingClientRect();
  return {
    left: obj.left + window.pageXOffset,
    top: obj.top + window.pageYOffset,
    width: obj.width,
    height: obj.height
  };
}

export interface IContentScrollerOptions {
  pageSize?: number;
  rowHeight?: number;
  backupRows?: number;
}

/**
 * content scroller utility
 *
 * a class for efficiently selecting a range of data items that are currently visible according to the scrolled position
 */
export class ContentScroller extends AEventDispatcher {
  static readonly EVENT_SCROLL = 'scroll';
  static readonly EVENT_REDRAW = 'redraw';

  private readonly options: IContentScrollerOptions = {
    pageSize: 100,
    rowHeight: 20,
    backupRows: 5
  };

  private prevScrollTop = 0;
  private shift = 0;

  /**
   * utility for scrolling
   * @param {Element} container the container element wrapping the content with a fixed height for enforcing scrolling
   * @param {Element} content the content element to scroll
   * @param {IContentScrollerOptions} options options see attribute
   */
  constructor(private readonly container: Element, content: Element, options: IContentScrollerOptions = {}) {
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
   * @returns {string[]} list of events
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
   * @param {number} start start of the range
   * @param {number} length length of the range
   * @param {(i: number) => number} row2y lookup for computing the y position of a given row
   * @return {{from: number; to: number}} the slide to show
   */
  select(start: number, length: number, row2y: (i: number) => number) {
    return this.selectImpl(start, length, row2y, this.options.backupRows!);
  }

  private selectImpl(start: number, length: number, row2y: (i: number) => number, backupRows: number) {
    const top = this.container.scrollTop - this.shift,
      bottom = top + this.container.clientHeight;
    let i = 0, j;
    /*console.log(window.matchMedia('print').matches, window.matchMedia('screen').matches, top, bottom);
     if (typeof window.matchMedia === 'function' && window.matchMedia('print').matches) {
     console.log('show all');
     return [0, data.length];
     }*/
    if (top > 0) {
      i = Math.round(top / this.options.rowHeight!);
      //count up till really even partial rows are visible
      while (i >= start && row2y(i + 1) > top) {
        i--;
      }
      i -= backupRows; //one more row as backup for scrolling
    }
    { //some parts from the bottom aren't visible
      j = Math.round(bottom / this.options.rowHeight!);
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
    if (Math.abs(this.prevScrollTop - top) < this.options.pageSize!) {
      return;
    }
    //we scrolled out of our backup rows, so we have to redraw the content
    const delta = this.prevScrollTop - top;
    this.prevScrollTop = top;
    this.fire(ContentScroller.EVENT_REDRAW, delta);
  }

  /**
   * removes the listeners
   */
  destroy() {
    select(this.container).on('scroll.scroller', null!);
  }
}

/**
 * utility function to sets attributes and styles in a nodes
 * @param node
 * @param attrs
 * @param styles
 * @param text
 * @return {T}
 */
export function attr<T extends (HTMLElement | SVGElement)>(node: T, attrs: { [key: string]: any } = {}, styles: { [key: string]: any } = {}, text?: string): T {
  Object.keys(attrs).forEach((attr) => {
    const v = String(attrs[attr]);
    if (node.getAttribute(attr) !== v) {
      node.setAttribute(attr, v);
    }
  });
  Object.keys(styles).forEach((attr) => {
    const v = styles[attr];
    if ((<any>node).style.getPropertyValue(attr) !== v) {
      (<any>node).style.setProperty(attr, v);
    }
  });
  return setText(node, text);
}

export function setText<T extends Node>(node: T, text?: string): T {
  if (text === undefined) {
    return node;
  }
  //no performance boost if setting the text node directly
  //const textNode = <Text>node.firstChild;
  //if (textNode == null) {
  //  node.appendChild(node.ownerDocument.createTextNode(text));
  //} else {
  //  textNode.data = text;
  //}
  if (node.textContent !== text) {
    node.textContent = text;
  }
  return node;
}

/**
 * for each item matching the selector execute the callback
 * @param node
 * @param selector
 * @param callback
 */
export function forEach<T extends Element>(node: T, selector: string, callback: (d: Element, i: number) => void) {
  Array.from(node.querySelectorAll(selector)).forEach(callback);
}

export function forEachChild<T extends Element>(node: T, callback: (d: Element, i: number) => void) {
  Array.from(node.children).forEach(callback);
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
  const testText = `${alphabet}${alphabet.toUpperCase()}0123456789`;
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

export function showOverlay(parentElement: HTMLElement, id: string, dx: number, dy: number) {
  let overlay = <HTMLDivElement>parentElement.querySelector(`div.lu-overlay#O${id}`);
  if (!overlay) {
    overlay = parentElement.ownerDocument.createElement('div');
    overlay.classList.add('lu-overlay');
    overlay.id = `O${id}`;
    parentElement.appendChild(overlay);
  }
  overlay.style.display = 'block';
  overlay.style.left = `${dx}px`;
  overlay.style.top = `${dy}px`;
  return overlay;
}

export function hideOverlays(parentElement: HTMLElement) {
  forEach(parentElement, 'div.lu-overlay', (d: HTMLDivElement) => d.style.display = null);
}


/**
 * matches the columns and the dom nodes representing them
 * @param {SVGGElement | HTMLElement} node row
 * @param {{column: Column; renderer: IDOMCellRenderer}[]} columns columns to check
 * @param {string} helperType create types of
 */
export function matchColumns(node: SVGGElement | HTMLElement, columns: { column: Column, renderer: IDOMCellRenderer, groupRenderer: IDOMGroupRenderer }[], render: 'group' | 'detail', helperType = 'svg') {
  const renderer = render === 'detail' ? (col: { column: Column }) => col.column.getRendererType() : (col: { column: Column }) => col.column.getGroupRenderer();
  if (node.childElementCount === 0) {
    // initial call fast method
    node.innerHTML = columns.map((c) => (render === 'detail' ? c.renderer : c.groupRenderer).template).join('');
    columns.forEach((col, i) => {
      const cnode = <Element>node.childNodes[i];
      // set attribute for finding again
      cnode.setAttribute('data-column-id', col.column.id);
      // store current renderer
      cnode.setAttribute('data-renderer', renderer(col));
    });
    return;
  }

  function matches(c: { column: Column }, i: number) {
    //do both match?
    const n = <Element>(node.childElementCount <= i ? null : node.childNodes[i]);
    return n != null && n.getAttribute('data-column-id') === c.column.id && n.getAttribute('data-renderer') === renderer(c);
  }

  if (columns.every(matches)) {
    return; //nothing to do
  }

  const idsAndRenderer = new Set(columns.map((c) => `${c.column.id}@${renderer(c)}`));
  //remove all that are not existing anymore
  Array.from(node.childNodes).forEach((n: Element) => {
    const id = n.getAttribute('data-column-id');
    const renderer = n.getAttribute('data-renderer');
    const idAndRenderer = `${id}@${renderer}`;
    if (!idsAndRenderer.has(idAndRenderer)) {
      node.removeChild(n);
    }
  });
  const helper = helperType === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', 'g') : document.createElement('div');
  columns.forEach((col) => {
    let cnode = node.querySelector(`[data-column-id="${col.column.id}"]`);
    if (!cnode) {
      //create one
      helper.innerHTML = (render === 'detail' ? col.renderer : col.groupRenderer).template;
      cnode = <Element>helper.childNodes[0];
      cnode.setAttribute('data-column-id', col.column.id);
      cnode.setAttribute('data-renderer', renderer(col));
    }
    node.appendChild(cnode);
  });
}


export function equalArrays<T>(a: T[], b: T[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((ai, i) => ai === b[i]);
}


/**
 * assigns colors to columns if they are numbers and not yet defined
 * @param columns
 * @returns {IColumnDesc[]}
 */
export function deriveColors(columns: IColumnDesc[]) {
  const colors = d3scale.category10().range().slice();
  columns.forEach((col: any) => {
    switch (col.type) {
      case 'number':
        col.color = colors.shift() || 'gray';
        break;
    }
  });
  return columns;
}

/**
 * Adapts the text color for a given background color
 * @param {string} bgColor as `#ff0000`
 * @returns {string} returns `black` or `white` for best contrast
 */
export function adaptTextColorToBgColor(bgColor:string):string {
  return d3hsl(bgColor).l > 0.5 ? 'black' : 'white';
}
