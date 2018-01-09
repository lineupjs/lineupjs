import {EAdvancedSortMethod, ESortMethod, INumberColumnDesc} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class NumberColumnBuilder extends ColumnBuilder<INumberColumnDesc> {

  constructor(column: string) {
    super('number', column);
  }

  mapping(type: 'linear'|'sqrt'|'pow1.1'|'pow2'|'pow3', domain: [number, number], range?: [number, number]) {
    if (type === 'linear') {
      this.desc.domain = domain;
      if (range) {
        this.desc.range = range;
      }
      return;
    }
    this.desc.map = {
      type, domain, range: range || [0, 1]
    };
    return this;
  }

  scripted(code: string, domain: [number, number]) {
    this.desc.map = {domain, code, type: 'script'};
    return this;
  }

  asArray(labels?: string[] | number, sort?: EAdvancedSortMethod) {
    if (sort) {
      (<any>this.desc).sort = sort;
    }
    return super.asArray(labels);
  }

  asMap(sort?: EAdvancedSortMethod) {
    if (sort) {
      (<any>this.desc).sort = sort;
    }
    return super.asMap();
  }

  asBoxPlot(sort?: ESortMethod) {
    if (sort) {
      (<any>this.desc).sort = sort;
    }
    this.desc.type = 'boxplot';
    return this;
  }
}

export function buildNumberColumn(column: string, domain?: [number, number]) {
  const r = new NumberColumnBuilder(column);
  if (domain) {
    r.mapping('linear', domain);
  }
  return r;
}
