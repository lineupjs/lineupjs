import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import {ICategoricalDesc, ICategory, toCategories, toCategory} from './ICategoricalColumn';
import {IDataRow} from './interfaces';

export declare type ICategoricalsColumnDesc = ICategoricalDesc & IArrayColumnDesc<string | null>;

/**
 * a string column with optional alignment
 */
export default class CategoricalsColumn extends ArrayColumn<string | null> {
  readonly categories: ICategory[];

  private readonly missingCategory: ICategory | null;

  private readonly lookup = new Map<string, Readonly<ICategory>>();

  constructor(id: string, desc: Readonly<ICategoricalsColumnDesc>) {
    super(id, desc);
    this.categories = toCategories(desc);
    this.missingCategory = desc.missingCategory ? toCategory(desc.missingCategory, NaN) : null;
    this.categories.forEach((d) => this.lookup.set(d.name, d));
  }

  getCategories(row: IDataRow) {
    return super.getValues(row).map((v) => {
      if (!v) {
        return this.missingCategory;
      }
      const vs = String(v);
      return this.lookup.has(vs) ? this.lookup.get(vs)! : this.missingCategory;
    });
  }

  getSet(row: IDataRow) {
    const r = new Set(this.getCategories(row));
    r.delete(this.missingCategory);
    return r;
  }

  getValues(row: IDataRow) {
    return this.getCategories(row).map((v) => v ? v.name : null);
  }

  getLabels(row: IDataRow) {
    return this.getCategories(row).map((v) => v ? v.label : '');
  }
}
