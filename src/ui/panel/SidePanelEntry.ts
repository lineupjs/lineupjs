/**
 * Created by Samuel Gratzl on 05.09.2017.
 */
import {default as Column, IColumnDesc} from '../../model/Column';


export default class SidePanelEntry {
  used = 0;

  constructor(public readonly desc: IColumnDesc) {

  }

  get name() {
    return this.desc.label;
  }

  get id() {
    return `${this.desc.type}@${this.desc.label}`;
  }

  render(column: Column) {
    console.assert(column.desc === this.desc);
  }
}
