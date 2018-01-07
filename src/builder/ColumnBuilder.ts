import {IColumnDesc} from '../model';

export default class ColumnBuilder {
  private readonly desc: Partial<IColumnDesc> = {};

  constructor(type: string, label: string) {
    this.desc = {label, type};
  }

  color(color: string) {
    this.desc.color = color;
  }

  // TODO

  build() {
    return <IColumnDesc>this.desc;
  }
}
