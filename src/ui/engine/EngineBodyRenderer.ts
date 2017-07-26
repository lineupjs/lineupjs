/**
 * Created by Samuel Gratzl on 18.07.2017.
 */
import {AEventDispatcher, forEach} from '../../utils';
import {IBodyRenderer} from '../ABodyRenderer';
import DataProvider from '../../provider/ADataProvider';
import {IStatistics, ICategoricalStatistics} from '../../model/Column';

export default class EngineBodyRenderer extends AEventDispatcher implements IBodyRenderer {

  histCache = new Map<string, Promise<IStatistics | ICategoricalStatistics> | IStatistics | ICategoricalStatistics | null>();

  readonly node: HTMLElement;

  constructor(private data: DataProvider, parent: Element) {
    super();
    this.node = parent.ownerDocument.createElement('main');
    parent.appendChild(this.node);
  }

  setOption(key: string, value: any) {
    //TODO
  }

  changeDataStorage(data: DataProvider) {
    this.data = data;
    //TODO rebuild;
  }

  select(dataIndex: number, additional?: boolean) {
    if (!additional) {
      forEach(this.node, `[data-data-index].selected`, (n: HTMLElement) => {
        n.classList.remove('selected');
      });
    }
    forEach(this.node, `[data-data-index="${dataIndex}]`, (n: HTMLElement) => {
      n.classList.add('selected');
    });
  }

  fakeHover(dataIndex: number) {
    const old = this.node.querySelector(`[data-data-index].hovered`);
    if (old) {
      old.classList.remove('hovered');
    }
    const item = this.node.querySelector(`[data-data-index="${dataIndex}"].hovered`);
    if (item) {
      item.classList.add('hovered');
    }
  }

  updateFreeze(left: number) {
    // nothing to do
  }

  scrolled(delta: number) {
    // internally nothing to do
  }

  update() {
    //TODO rebuild;
  }
}
