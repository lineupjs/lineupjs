import {ILineUpLike} from '../interfaces';
import AEventDispatcher from '../internal/AEventDispatcher';
import Column from '../model/Column';
import DataProvider from '../provider/ADataProvider';
import {IEventListener} from '../internal/AEventDispatcher';

/**
 * emitted when the highlight changes
 * @asMemberOf ALineUp
 * @param dataIndex the highlghted data index or -1 for none
 * @event
 */
export declare function highlightChanged(dataIndex: number): void;

/**
 * emitted when the selection changes
 * @asMemberOf ALineUp
 * @param dataIndices the selected data indices
 * @event
 */
export declare function selectionChanged(dataIndices: number[]): void;

export abstract class ALineUp extends AEventDispatcher implements ILineUpLike {
  static readonly EVENT_SELECTION_CHANGED = DataProvider.EVENT_SELECTION_CHANGED;
  static readonly EVENT_HIGHLIGHT_CHANGED = 'highlightChanged';

  private highlightListeners = 0;

  constructor(public readonly node: HTMLElement, public data: DataProvider) {
    super();

    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
  }

  protected createEventList() {
    return super.createEventList().concat([ALineUp.EVENT_HIGHLIGHT_CHANGED, ALineUp.EVENT_SELECTION_CHANGED]);
  }

  on(type: typeof ALineUp.EVENT_HIGHLIGHT_CHANGED, listener: typeof highlightChanged | null): this;
  on(type: typeof ALineUp.EVENT_SELECTION_CHANGED, listener: typeof selectionChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  destroy() {
    // just clear since we hand in the node itself
    this.node.innerHTML = '';
  }

  dump() {
    return this.data.dump();
  }

  abstract update(): void;

  setDataProvider(data: DataProvider, dump?: any) {
    if (this.data) {
      this.unforward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.taggle`);
    }
    this.data = data;
    if (dump) {
      this.data.restore(dump);
    }
    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.taggle`);
  }

  getSelection() {
    return this.data.getSelection();
  }

  setSelection(dataIndices: number[]) {
    this.data.setSelection(dataIndices);
  }

  /**
   * sorts LineUp by he given column
   * @param column callback function finding the column to sort
   * @param ascending
   * @returns {boolean}
   */
  sortBy(column: string | ((col: Column) => boolean), ascending = false) {
    const col = this.data.find(column);
    if (col) {
      col.sortByMe(ascending);
    }
    return col != null;
  }

  abstract setHighlight(dataIndex: number, scrollIntoView: boolean): boolean;

  abstract getHighlight(): number;

  protected listenersChanged(type: string, enabled: boolean) {
    super.listenersChanged(type, enabled);
    if (!type.startsWith(ALineUp.EVENT_HIGHLIGHT_CHANGED)) {
      return;
    }
    if (enabled) {
      this.highlightListeners += 1;
      if (this.highlightListeners === 1) { // first
        this.enableHighlightListening(true);
      }
    } else {
      this.highlightListeners -= 1;
      if (this.highlightListeners === 0) { // last
        this.enableHighlightListening(false);
      }
    }
  }

  protected enableHighlightListening(_enable: boolean) {
    // hook
  }
}

export default ALineUp;
