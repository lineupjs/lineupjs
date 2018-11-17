import {ICategoricalDesc, ICategory, toCategories} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import MapColumn, {IMapColumnDesc} from './MapColumn';

export declare type ICategoricalMapColumnDesc = ICategoricalDesc & IMapColumnDesc<string | null>;

export default class CategoricalMapColumn extends MapColumn<string | null> {
  readonly categories: ICategory[];

  private readonly lookup = new Map<string, Readonly<ICategory>>();

  constructor(id: string, desc: Readonly<ICategoricalMapColumnDesc>) {
    super(id, desc);
    this.categories = toCategories(desc);
    this.categories.forEach((d) => this.lookup.set(d.name, d));
  }


  private parseValue(v: any) {
    if (!v) {
      return null;
    }
    const vs = String(v);
    return this.lookup.has(vs) ? this.lookup.get(vs)! : null;
  }

  getCategories(row: IDataRow) {
    return super.getMap(row).map(({key, value}) => ({
      key,
      value: this.parseValue(value)
    }));
  }

  getValue(row: IDataRow) {
    const r = this.getCategories(row);
    return r.length === 0 ? null : r.map(({key, value}) => ({
      key,
      value: value ? value.name : null
    }));
  }

  getLabels(row: IDataRow) {
    return this.getCategories(row).map(({key, value}) => ({
      key,
      value: value ? value.label : ''
    }));
  }
}
