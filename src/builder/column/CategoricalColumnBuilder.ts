import {ICategoricalColumnDesc, ICategory} from '../../model';
import ColumnBuilder from './ColumnBuilder';
import {cleanCategories} from '../../provider/utils';

export default class CategoricalColumnBuilder extends ColumnBuilder<ICategoricalColumnDesc> {

  constructor(column: string) {
    super('categorical', column);
  }

  /**
   * converts this type to an ordinal column type, such that categories are mapped to numbers
   */
  asOrdinal() {
    this.desc.type = 'ordinal';
    return this;
  }

  /**
   * specify the categories of this categorical column
   * @param {(string | Partial<ICategory>)[]} categories
   */
  categories(categories: (string | Partial<ICategory>)[]) {
    this.desc.categories = categories;
    return this;
  }

  /**
   * converts this type to a set column, i.e. multiple unique category in a value
   * @param {string} separator optional separator separating a string value
   */
  asSet(separator?: string) {
    if (separator) {
      (<any>this.desc).separator = separator;
    }
    this.desc.type = 'set';
    return this;
  }

  private derive(data: any[]) {
    // derive categories
    const categories = new Set<string>();
    const isSet = this.desc.type === 'set';
    const separator = (<any>this.desc).separator || ';';
    const val = (vi: any) => {
      if (typeof vi === 'string' && vi !== '') {
        return vi;
      }
      if (vi != null && typeof vi.value === 'string' && vi.value !== '') {
        return vi.value;
      }
      return null;
    };
    data.forEach((d) => {
      const v = d[(<any>this.desc).column];
      if (Array.isArray(v)) {
        v.forEach((vi) => categories.add(val(vi)));
      } else if (v != null && v !== '') {
        const vs: string[] = isSet ? [v.toString()] : v.toString().split(separator);
        vs.forEach((vi) => categories.add(val(vi)));
      }
    });
    this.categories(cleanCategories(categories));
  }

  build(data: any[]): ICategoricalColumnDesc {
    if (!this.desc.categories) {
      this.derive(data);
    }
    return super.build(data);
  }
}

/**
 * build a categorical column type
 * @param {string} column column which contains the associated data
 * @param {(string | Partial<ICategory>)[]} categories optional category definition
 * @returns {CategoricalColumnBuilder}
 */
export function buildCategoricalColumn(column: string, categories?: (string | Partial<ICategory>)[]) {
  const r = new CategoricalColumnBuilder(column);
  if (categories) {
    r.categories(categories);
  }
  return r;
}
