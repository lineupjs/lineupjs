import {ICategoricalDesc, ICategory, toCategories, toCategory} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import MapColumn, {IMapColumnDesc} from './MapColumn';

export declare type ICategoricalMapColumnDesc = ICategoricalDesc & IMapColumnDesc<string | null>;

export default class CategoricalMapColumn extends MapColumn<string | null> {
  readonly categories: ICategory[];

  private readonly missingCategory: ICategory | null;

  private readonly lookup = new Map<string, Readonly<ICategory>>();

  constructor(id: string, desc: Readonly<ICategoricalMapColumnDesc>) {
    super(id, desc);
    this.categories = toCategories(desc);
    this.missingCategory = desc.missingCategory ? toCategory(desc.missingCategory, NaN) : null;
    this.categories.forEach((d) => this.lookup.set(d.name, d));
  }


  private parseValue(v: any) {
    if (!v) {
      return this.missingCategory;
    }
    const vs = String(v);
    return this.lookup.has(vs) ? this.lookup.get(vs)! : this.missingCategory;
  }

  getCategories(row: IDataRow) {
    return super.getValue(row).map(({key, value}) => ({
      key,
      value: this.parseValue(value)
    }));
  }

  getValue(row: IDataRow) {
    return this.getCategories(row).map(({key, value}) => ({
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
