import {INumberColumnDesc} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class NumberColumnBuilder extends ColumnBuilder<INumberColumnDesc> {

  constructor(column: string) {
    super('number', column);
  }

  domain(domain: [number, number]) {
    this.desc.domain = domain;
    return this;
  }
}

export function buildNumberColumn(column: string, domain?: [number, number]) {
  const r = new NumberColumnBuilder(column);
  if (domain) {
    r.domain(domain);
  }
  return r;
}
