/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

///<reference path='../typings/tsd.d.ts' />
import d3 = require('d3');

/**
 * create a delayed call, can be called multiple times but only the last one at most delayed by timeToDelay will be executed
 * @param callback
 * @param thisCallback
 * @param timeToDelay
 * @return {function(...[any]): undefined}
 */
export function delayedCall(callback:() => void, timeToDelay = 100, thisCallback = this) {
  var tm = -1;
  return (...args:any[]) => {
    if (tm >= 0) {
      clearTimeout(tm);
      tm = -1;
    }
    args.unshift(thisCallback);
    tm = setTimeout(callback.bind.apply(callback, args), timeToDelay);
  };
}

/**
 * utility for AEventDispatcher to forward an event
 * @param to
 * @param event
 * @return {function(...[any]): undefined}
 */
export function forwardEvent(to: AEventDispatcher, event?: string) {
  return function(...args: any[]) {
    args.unshift(event || this.type);
    to.fire.apply(to, args);
  };
}

/**
 * base class for event dispatching using d3 event mechanism
 */
export class AEventDispatcher {
  private listeners:d3.Dispatch;
  private forwarder = forwardEvent(this);

  constructor() {
    this.listeners = d3.dispatch.apply(d3, this.createEventList());
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
      var context = {
        source: this,
        type: t,
        args: args
      };
      this.listeners[<string>t].apply(context, args);
    };
    if (Array.isArray(type)) {
      (<string[]>type).forEach(fireImpl.bind(this));
    } else {
      fireImpl(<string>type);
    }
  }

  forward(from: AEventDispatcher, ...types: string[]) {
    from.on(types, this.forwarder);
  }
  unforward(from: AEventDispatcher, ...types: string[]) {
    from.on(types, null);
  }
}

var TYPE_OBJECT = '[object Object]';
var TYPE_ARRAY  = '[object Array]';

//credits to https://github.com/vladmiller/dextend/blob/master/lib/dextend.js
export function merge(...args: any[]) {
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
      var value   = toMerge[keyName];

      if (Object.prototype.toString.call(value) === TYPE_OBJECT) {
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
    left: obj.left + window.pageXOffset ,
    top: obj.top + window.pageYOffset,
    width: obj.width,
    height: obj.height
  };
}

/**
 * content scroller utility
 */
export class ContentScroller extends AEventDispatcher {
  private options = {
    topShift: 0,
    backupRows: 5,
    rowHeight: 10
  };

  private prevScrollTop = 0;
  private shift = 0;

  constructor(private container:Element, private content:Element, options:any = {}) {
    super();
    merge(this.options, options);
    d3.select(container).on('scroll.scroller', () => this.onScroll());

    this.prevScrollTop = container.scrollTop;
    this.shift = offset(content).top - offset(container).top + this.options.topShift;
  }

  createEventList() {
    return super.createEventList().concat(['scroll', 'redraw']);
  }

  select(start:number, length:number, row2y:(i:number) => number) {
    var top = this.container.scrollTop - this.shift,
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
    this.fire('scroll', top, left);
    if (Math.abs(this.prevScrollTop - top) >= this.options.rowHeight * this.options.backupRows) {
      this.prevScrollTop = top;
      this.fire('redraw');
    }
  }

  destroy() {
    d3.select(this.container).on('scroll.scroller', null);
  }
}

/**
 * checks whether the given DragEvent has one of the given types
 */
export function hasDnDType(e: DragEvent, typesToCheck: string[]) {
  var types : any = e.dataTransfer.types;
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
  var dT = e.dataTransfer;
  return (e.ctrlKey && dT.effectAllowed.match(/copy/gi)) || (!dT.effectAllowed.match(/move/gi));
}

export function updateDropEffect(e: DragEvent) {
  var dT = e.dataTransfer;
  if (copyDnD(e)) {
    dT.dropEffect = 'copy';
  } else {
    dT.dropEffect = 'move';
  }
}

/**
 * returns a d3 callable function to make an element dropable
 * @param mimeTypes the mime types to be dropable
 * @param onDrop: handler when an element is dropped
 */
export function dropAble<T>(mimeTypes: string[], onDrop: (data: any, d: T, copy: boolean) => boolean) {
  return ($node) => {
    $node.on('dragenter', function() {
      var e = <DragEvent>(<any>d3.event);
      //var xy = d3.mouse($node.node());
      if (hasDnDType(e, mimeTypes)) {
        return false;
      }
      d3.select(this).classed('drag_over', true);
    }).on('dragover', () => {
      var e = <DragEvent>(<any>d3.event);
      if (hasDnDType(e, mimeTypes)) {
        e.preventDefault();
        updateDropEffect(e);
        return false;
      }
    }).on('dragleave', function() {
      //
      d3.select(this).classed('drag_over', false);
    }).on('drop', (d: T) => {
      var e = <DragEvent>(<any>d3.event);
      e.preventDefault();
      //var xy = d3.mouse($node.node());
      if (hasDnDType(e, mimeTypes)) {
        var data : any = {};
        mimeTypes.forEach((mime) => {
          var value = e.dataTransfer.getData(mime);
          if (value !== '') {
            data[mime] = value;
          }
        });
        return onDrop(data, d, e.dataTransfer.dropEffect.match(/.*copy.*/i) != null);
      }
    });
  };
}
