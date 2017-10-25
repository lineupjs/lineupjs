/**
 * Created by Samuel Gratzl on 25.10.2017.
 */
import {AEventDispatcher} from '../../utils';
import ADialog from '../../dialogs/ADialog';

export interface IItem {
  id: string;
  text: string;
}

export interface IGroupItem<T extends IItem> {
  text: string;
  children: (T | IGroupItem<T>)[];
}

function isItem<T extends IItem>(v: T | IGroupItem<T>): v is T {
  return (<T>v).id !== undefined;
}

export interface ISearchBoxOptions<T extends IItem> {
  doc: Document;

  formatItem(item: T | IGroupItem<T>, node: HTMLElement): string;

  placeholder: string;
  noResults: string;
}

export default class SearchBox<T extends IItem> extends AEventDispatcher {
  static readonly EVENT_SELECT = 'select';

  private readonly options: Readonly<ISearchBoxOptions<T>> = {
    formatItem: (item) => item.text,
    doc: document,
    placeholder: 'Select...',
    noResults: 'No results found'
  };

  readonly node: HTMLInputElement;
  readonly body: HTMLElement;
  private readonly dialog: ADialog;

  private values: (T | IGroupItem<T>)[] = [];
  private current: HTMLElement | null = null;

  constructor(options: Partial<ISearchBoxOptions<T>> = {}) {
    super();
    Object.assign(this.options, options);

    this.node = this.options.doc.createElement('input');
    this.node.type = 'search';
    this.node.placeholder = this.options.placeholder;
    this.node.onfocus = () => this.focus();
    this.node.onblur = () => this.blur();
    this.node.oninput = () => this.filterResults(this.body, this.node.value.toLowerCase());

    this.body = this.options.doc.createElement('div');

    const that = this;
    this.dialog = new (class extends ADialog {
      openDialog() {
        const p = this.makeMenuPopup('');
        p.classList.add('lu-search-box');
        p.appendChild(that.body);
        that.current = p;
      }
    })(this.node, this.options.placeholder);
  }

  get data() {
    return this.values;
  }

  set data(data: (T | IGroupItem<T>)[]) {
    this.values = data;
    this.buildDialog(this.body, this.values);
  }

  private buildDialog(node: HTMLElement, values: (T | IGroupItem<T>)[]) {
    values.forEach((v) => {
      if (isItem(v)) {
        node.insertAdjacentHTML('beforeend', `<li class="lu-search-item"><span></span></li>`);
        (<HTMLElement>node.lastElementChild!).onclick = (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          this.select(v);
        }
      } else {
        node.insertAdjacentHTML('beforeend', `<li class="lu-search-group"><span></span><ul></ul></li>`);
        const ul = <HTMLElement>node.lastElementChild!.lastElementChild!;
        this.buildDialog(ul, v.children);
      }
      const item = <HTMLElement>node.lastElementChild!.firstElementChild!;
      item.innerHTML = this.options.formatItem(v, item);
    });
  }

  private select(item: T) {
    this.node.value = ''; // reset
    this.filterResults(this.body, '');
    this.fire(SearchBox.EVENT_SELECT, item);
  }

  private focus() {
    this.dialog.openDialog();
  }

  private blur() {
    if (!this.current) {
      return;
    }
    ADialog.removePopup(this.current!);
    this.node.value = '';
    this.current = null;
  }

  private filterResults(node: HTMLElement, text: string) {
    if (text === '') {
      // show all
      Array.from(node.querySelectorAll('.hidden')).forEach((d: HTMLElement) => d.classList.remove('hidden'));
      return false;
    }
    const children = Array.from(node.children);
    children.forEach((d) => {
      let hidden = d.firstElementChild!.innerHTML.toLowerCase().includes(text) !== null;
      if (d.classList.contains('lu-search-group')) {
        const ul = <HTMLElement>d.lastElementChild!;
        const allChildrenHidden = this.filterResults(ul, text);
        hidden = hidden && allChildrenHidden;
      }
      d.classList.toggle('hidden', hidden);
    });

    return children.every((d) => d.classList.contains('hidden'));
  }

  protected createEventList() {
    return super.createEventList().concat([SearchBox.EVENT_SELECT]);
  }
}
