import {dispatch, Dispatch} from 'd3-dispatch';

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
export default class AEventDispatcher {
  private listeners: Dispatch<any>;
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
      this.listeners.apply(t, context, args);
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
