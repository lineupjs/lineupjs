/**
 * Created by Samuel Gratzl on 25.10.2017.
 */
import {AEventDispatcher} from '../../utils';

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
}

export default class SearchBox<T extends IItem> extends AEventDispatcher {
  static readonly EVENT_SELECT = 'select';

  private readonly options: Readonly<ISearchBoxOptions<T>> = {
    formatItem: (item) => item.text,
    doc: document,
    placeholder: 'Select...'
  };

  readonly node: HTMLElement;
  private search: HTMLInputElement;
  private body: HTMLElement;

  private values: (T | IGroupItem<T>)[] = [];

  constructor(options: Partial<ISearchBoxOptions<T>> = {}) {
    super();
    Object.assign(this.options, options);

    this.node = this.options.doc.createElement('div');
    this.node.classList.add('lu-search');
    this.node.innerHTML = `<input type="search" placeholder="${this.options.placeholder}"><div></div>`;

    this.search = this.node.querySelector('input')!;
    this.body = this.node.querySelector('div')!;

    this.search.onfocus = () => this.focus();
    this.search.onblur = () => this.blur();
    this.search.oninput = () => this.filter();
  }

  get data() {
    return this.values;
  }

  set data(data: (T | IGroupItem<T>)[]) {
    this.values = data;
    this.body.innerHTML = '';
    this.buildDialog(this.body, this.values);
  }

  private buildDialog(node: HTMLElement, values: (T | IGroupItem<T>)[]) {
    values.forEach((v) => {
      if (isItem(v)) {
        node.insertAdjacentHTML('beforeend', `<li class="lu-search-item"><span></span></li>`);
        const span = (<HTMLElement>node.lastElementChild!);
        span.onmousedown = (evt) => {
          // see https://stackoverflow.com/questions/10652852/jquery-fire-click-before-blur-event#10653160
          evt.preventDefault();
        };
        span.onclick = () => this.select(v);
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
    this.search.value = ''; // reset
    this.search.blur();
    this.filterResults(this.body, '');
    this.fire(SearchBox.EVENT_SELECT, item);
  }

  private focus() {
    this.search.focus();
    this.body.style.width = `${this.search.offsetWidth}px`;
    this.node.classList.add('lu-search-open');
  }

  private blur() {
    console.log('blur');
    this.search.value = '';
    this.node.classList.remove('lu-search-open');
  }

  private filter() {
    const empty = this.filterResults(this.body, this.search.value.toLowerCase());
    this.body.classList.toggle('lu-search-empty', empty);
  }

  private filterResults(node: HTMLElement, text: string) {
    if (text === '') {
      // show all
      Array.from(node.querySelectorAll('.hidden')).forEach((d: HTMLElement) => d.classList.remove('hidden'));
      return false;
    }
    const children = Array.from(node.children);
    children.forEach((d) => {
      const content = d.firstElementChild!.innerHTML.toLowerCase();
      let hidden = !content.includes(text);
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
