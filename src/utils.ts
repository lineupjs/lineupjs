/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {dispatch, select, event as d3event, Dispatch} from 'd3';

/**
 * create a delayed call, can be called multiple times but only the last one at most delayed by timeToDelay will be executed
 * @param callback the callback to call
 * @param timeToDelay delay the call in milliseconds
 * @param thisCallback this argument of the callback
 * @return {function(...[any]): undefined} a function that can be called with the same interface as the callback but delayed
 */
export function delayedCall(callback:(...args:any[]) => void, timeToDelay = 100, thisCallback = this) {
  var tm = -1;
  return function (...args:any[]) {
    if (tm >= 0) {
      clearTimeout(tm);
      tm = -1;
    }
    args.unshift(thisCallback === null ? this : thisCallback);
    tm = setTimeout(callback.bind.apply(callback, args), timeToDelay);
  };
}

/**
 * utility for AEventDispatcher to forward an event
 * @param to
 * @param event
 * @return {function(...[any]): undefined}
 */
export function forwardEvent(to:AEventDispatcher, event?:string) {
  return function (...args:any[]) {
    args.unshift(event || this.type);
    to.fire.apply(to, args);
  };
}

/**
 * base class for event dispatching using d3 event mechanism
 */
export class AEventDispatcher {
  private listeners:Dispatch;
  private forwarder = forwardEvent(this);

  constructor() {
    this.listeners = dispatch(...this.createEventList());
  }

  on(type:string):(...args:any[]) => void;
  on(type:string|string[], listener:(...args:any[]) => any):AEventDispatcher;
  on(type:string|string[], listener?:(...args:any[]) => any):any {
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
  createEventList():string[] {
    return [];
  }

  fire(type:string|string[], ...args:any[]) {
    var fireImpl = (t) => {
      //local context per event, set a this argument
      var context = {
        source: this, //who is sending this event
        type: t, //the event type
        args: args //the arguments to the listener
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
   * i.e. when one of the given events is fired in 'from' it will be forwared to all my listeners
   * @param from the event dispatcher to forward from
   * @param types the event types to forward
   */
  forward(from:AEventDispatcher, ...types:string[]) {
    from.on(types, this.forwarder);
  }

  /**
   * removes the forwarding declarations
   * @param from
   * @param types
   */
  unforward(from:AEventDispatcher, ...types:string[]) {
    from.on(types, null);
  }
}

const TYPE_OBJECT = '[object Object]';
const TYPE_ARRAY = '[object Array]';

//credits to https://github.com/vladmiller/dextend/blob/master/lib/dextend.js
export function merge(...args:any[]) {
  var result = null;

  for (var i = 0; i < args.length; i++) {
    var toMerge = args[i],
      keys = Object.keys(toMerge);

    if (result === null) {
      result = toMerge;
      continue;
    }

    for (var j = 0; j < keys.length; j++) {
      var keyName = keys[j];
      var value = toMerge[keyName];

      //merge just POJOs
      if (Object.prototype.toString.call(value) === TYPE_OBJECT && (Object.getPrototypeOf(value) === Object.prototype)) { //pojo
        if (result[keyName] === undefined) {
          result[keyName] = {};
        }
        result[keyName] = merge(result[keyName], value);
      } else if (Object.prototype.toString.call(value) === TYPE_ARRAY) {
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
  var obj = element.getBoundingClientRect();
  return {
    left: obj.left + window.pageXOffset,
    top: obj.top + window.pageYOffset,
    width: obj.width,
    height: obj.height
  };
}

/**
 * content scroller utility
 *
 * a class for efficiently selecting a range of data items that are currently visible according to the scrolled position
 */
export class ContentScroller extends AEventDispatcher {
  private options = {
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
  constructor(private container:Element, private content:Element, options:any = {}) {
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
  createEventList() {
    return super.createEventList().concat(['scroll', 'redraw']);
  }

  scrollIntoView(start: number, length: number, index: number, row2y:(i:number) => number) {
    const range = this.select(start, length, row2y);
    if (range.from <= index && index <= range.to) {
      return; //already visible
    }

    var top = this.container.scrollTop - this.shift - this.options.topShift(),
      bottom = top + this.container.clientHeight,
      i = 0, j;
    if (top > 0) {
      i = Math.round(top / this.options.rowHeight);
      //count up till really even partial rows are visible
      while (i >= start && row2y(i + 1) > top) {
        i--;
      }
      i -= this.options.backupRows; //one more row as backup for scrolling
    }
    { //some parts from the bottom aren't visible
      j = Math.round(bottom / this.options.rowHeight);
      //count down till really even partial rows are visible
      while (j <= length && row2y(j - 1) < bottom) {
        j++;
      }
      j += this.options.backupRows; //one more row as backup for scrolling
    }
  }

  /**
   * selects a range identified by start and length and the row2y position callback returning the slice to show according to the current user scrolling position
   * @param start start of the range
   * @param length length of the range
   * @param row2y lookup for computing the y position of a given row
   * @returns {{from: number, to: number}} the slide to show
   */
  select(start:number, length:number, row2y:(i:number) => number) {
    var top = this.container.scrollTop - this.shift - this.options.topShift(),
      bottom = top + this.container.clientHeight,
      i = 0, j;
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
      i -= this.options.backupRows; //one more row as backup for scrolling
    }
    { //some parts from the bottom aren't visible
      j = Math.round(bottom / this.options.rowHeight);
      //count down till really even partial rows are visible
      while (j <= length && row2y(j - 1) < bottom) {
        j++;
      }
      j += this.options.backupRows; //one more row as backup for scrolling
    }
    return {
      from: Math.max(i, start),
      to: Math.min(j, length)
    };
  }

  private onScroll() {
    var top = this.container.scrollTop;
    var left = this.container.scrollLeft;
    //at least one row changed
    //console.log(top, left);
    this.fire('scroll', top, left);
    if (Math.abs(this.prevScrollTop - top) >= this.options.rowHeight * this.options.backupRows) {
      //we scrolled out of our backup rows, so we have to redraw the content
      this.prevScrollTop = top;
      this.fire('redraw');
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
export function hasDnDType(e:DragEvent, typesToCheck:string[]) {
  var types:any = e.dataTransfer.types;
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
export function copyDnD(e:DragEvent) {
  var dT = e.dataTransfer;
  return (e.ctrlKey && dT.effectAllowed.match(/copy/gi) != null) || (dT.effectAllowed.match(/move/gi) == null);
}

/**
 * updates the drop effect according to the currently selected meta keys
 * @param e
 */
export function updateDropEffect(e:DragEvent) {
  var dT = e.dataTransfer;
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
export function dropAble<T>(mimeTypes:string[], onDrop:(data:any, d:T, copy:boolean) => boolean) {
  return ($node) => {
    $node.on('dragenter', function () {
      var e = <DragEvent>(<any>d3event);
      //var xy = mouse($node.node());
      if (hasDnDType(e, mimeTypes)) {
        select(this).classed('drag_over', true);
        //sounds good
        return false;
      }
      //not a valid mime type
      select(this).classed('drag_over', false);
    }).on('dragover', function () {
      var e = <DragEvent>(<any>d3event);
      if (hasDnDType(e, mimeTypes)) {
        e.preventDefault();
        updateDropEffect(e);
        select(this).classed('drag_over', true);
        return false;
      }
    }).on('dragleave', function () {
      //
      select(this).classed('drag_over', false);
    }).on('drop', function (d:T) {
      var e = <DragEvent>(<any>d3event);
      e.preventDefault();
      select(this).classed('drag_over', false);
      //var xy = mouse($node.node());
      if (hasDnDType(e, mimeTypes)) {
        var data:any = {};
        //selects the data contained in the data transfer
        mimeTypes.forEach((mime) => {
          var value = e.dataTransfer.getData(mime);
          if (value !== '') {
            data[mime] = value;
          }
        });
        return onDrop(data, d, copyDnD(e));
      }
    });
  };
}
