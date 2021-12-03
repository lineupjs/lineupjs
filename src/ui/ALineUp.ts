import {
  getUnsupportedBrowserError,
  SUPPORTED_CHROME_VERSION,
  SUPPORTED_EDGE_VERSION,
  SUPPORTED_FIREFOX_VERSION,
} from '../browser';
import type { ILineUpLike } from '../config';
import { AEventDispatcher, IEventListener, clear } from '../internal';
import type { Column } from '../model';
import { DataProvider, IDataProviderDump } from '../provider';
import { cssClass } from '../styles';
import DialogManager from './dialogs/DialogManager';
import type { ADialog } from './dialogs';
import { isPromiseLike } from '../provider/utils';

/**
 * emitted when the highlight changes
 * @asMemberOf ALineUp
 * @param dataIndex the highlighted data index or -1 for none
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
/**
 * emitted a dialog is opened
 * @asMemberOf ALineUp
 * @param dialog the opened dialog
 * @event
 */
export declare function dialogOpened(dialog: ADialog): void;
/**
 * emitted a dialog is closed
 * @asMemberOf ALineUp
 * @param dialog the closed dialog
 * @param action the action how the dialog was closed
 * @event
 */
export declare function dialogClosed(dialog: ADialog, action: 'cancel' | 'confirm'): void;

export abstract class ALineUp extends AEventDispatcher implements ILineUpLike {
  static readonly EVENT_SELECTION_CHANGED = DataProvider.EVENT_SELECTION_CHANGED;
  static readonly EVENT_DIALOG_OPENED = DialogManager.EVENT_DIALOG_OPENED;
  static readonly EVENT_DIALOG_CLOSED = DialogManager.EVENT_DIALOG_CLOSED;
  static readonly EVENT_HIGHLIGHT_CHANGED = 'highlightChanged';

  private highlightListeners = 0;

  readonly isBrowserSupported: boolean;

  constructor(public readonly node: HTMLElement, private _data: DataProvider, ignoreIncompatibleBrowser: boolean) {
    super();

    const error = getUnsupportedBrowserError();
    this.isBrowserSupported = ignoreIncompatibleBrowser || !error;

    if (!this.isBrowserSupported) {
      this.node.classList.add(cssClass('unsupported-browser'));
      this.node.innerHTML = `<span>${error}</span>
      <div class="${cssClass('unsupported-browser')}">
        <a href="https://www.mozilla.org/en-US/firefox/" rel="noopener" target="_blank" data-browser="firefox" data-version="${SUPPORTED_FIREFOX_VERSION}"></a>
        <a href="https://www.google.com/chrome/index.html" rel="noopener" target="_blank" data-browser="chrome" data-version="${SUPPORTED_CHROME_VERSION}" title="best support"></a>
        <a href="https://www.microsoft.com/en-us/windows/microsoft-edge" rel="noopener" target="_blank" data-browser="edge" data-version="${SUPPORTED_EDGE_VERSION}"></a>
      </div><span>use the <code>ignoreUnsupportedBrowser=true</code> option to ignore this error at your own risk</span>`;
    }

    this.forward(_data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
    _data.on(`${DataProvider.EVENT_BUSY}.busy`, (busy) => this.node.classList.toggle(cssClass('busy'), busy));
  }

  protected createEventList() {
    return super
      .createEventList()
      .concat([
        ALineUp.EVENT_HIGHLIGHT_CHANGED,
        ALineUp.EVENT_SELECTION_CHANGED,
        ALineUp.EVENT_DIALOG_OPENED,
        ALineUp.EVENT_DIALOG_CLOSED,
      ]);
  }

  on(type: typeof ALineUp.EVENT_HIGHLIGHT_CHANGED, listener: typeof highlightChanged | null): this;
  on(type: typeof ALineUp.EVENT_SELECTION_CHANGED, listener: typeof selectionChanged | null): this;
  on(type: typeof ALineUp.EVENT_DIALOG_OPENED, listener: typeof dialogOpened | null): this;
  on(type: typeof ALineUp.EVENT_DIALOG_CLOSED, listener: typeof dialogClosed | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  get data() {
    return this._data;
  }

  destroy() {
    // just clear since we hand in the node itself
    clear(this.node);
    this._data.destroy();
  }

  dump() {
    return this.data.dump();
  }

  restore(dump: IDataProviderDump) {
    this._data.restore(dump);
  }

  abstract update(): void;

  setDataProvider(data: DataProvider, dump?: IDataProviderDump) {
    if (this._data) {
      this.unforward(this._data, `${DataProvider.EVENT_SELECTION_CHANGED}.taggle`);
      this._data.on(`${DataProvider.EVENT_BUSY}.busy`, null);
    }
    this._data = data;
    if (dump) {
      data.restore(dump);
    }
    this.forward(data, `${DataProvider.EVENT_SELECTION_CHANGED}.taggle`);

    data.on(`${DataProvider.EVENT_BUSY}.busy`, (busy) => this.node.classList.toggle(cssClass('busy'), busy));
  }

  getSelection() {
    return this._data.getSelection();
  }

  setSelection(dataIndices: number[]) {
    this._data.setSelection(dataIndices);
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
      this.highlightListeners++;
      if (this.highlightListeners === 1) {
        // first
        this.enableHighlightListening(true);
      }
    } else {
      this.highlightListeners -= 1;
      if (this.highlightListeners === 0) {
        // last
        this.enableHighlightListening(false);
      }
    }
  }

  protected enableHighlightListening(_enable: boolean) {
    // hook
  }

  protected addCopyListener() {
    this.node.addEventListener('copy', (e) => {
      if (!this.data || !this.data.getFirstRanking()) {
        return;
      }
      const selections = this.data.getSelection();
      let data: Promise<string> | string;
      if (selections.length === 0) {
        // copy all
        data = this.data.exportTable(this.data.getFirstRanking());
      } else {
        // copy subset
        data = this.data.exportSelection();
      }
      e.preventDefault();
      if (isPromiseLike(data)) {
        data.then((csv) => {
          e.clipboardData.setData('text/plain', csv);
          e.clipboardData.setData('text/tsv', csv);
        });
      } else {
        e.clipboardData.setData('text/plain', data);
        e.clipboardData.setData('text/tsv', data);
      }
    });
  }
}

export default ALineUp;
