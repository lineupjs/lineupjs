/**
 * Created by Samuel Gratzl on 11.10.2017.
 */
import {IDataProvider} from '../../provider/ADataProvider';


export default class SelectionManager {

  constructor(private readonly ctx: {provider: IDataProvider}, body: HTMLElement) {

  }

  remove(node: HTMLElement) {
    node.onclick = <any>undefined;
  }

  add(node: HTMLElement) {
    node.onclick = (evt) => {
      const dataIndex = parseInt(node.dataset.dataIndex!, 10);
      this.ctx.provider.toggleSelection(dataIndex, evt.ctrlKey);
    };
  }

  updateState(node: HTMLElement, dataIndex: number) {
    if (this.ctx.provider.isSelected(dataIndex)) {
      node.classList.add('lu-selected');
    } else {
      node.classList.remove('lu-selected');
    }
  }
}
