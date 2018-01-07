import {IColumnDesc} from '../model';

export default class RankingBuilder {
  private readonly desc: Partial<IColumnDesc> = {};

  constructor(type: string, label: string) {
    this.desc = {label, type};
  }

  color(color: string) {
    this.desc.color = color;
  }

  // TODO

  build() {
    return this.desc;
  }
}
