import {ICategoricalColumnDesc, ICategory} from '../../model';
import ColumnBuilder from './ColumnBuilder';

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
   * define the category to use in case of missing or null values
   * @param {string | Partial<ICategory>} missingCategory
   */
  missingCategory(missingCategory: (string | Partial<ICategory>)) {
    this.desc.missingCategory = missingCategory;
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

  build(data: any[]): ICategoricalColumnDesc {
    if (!this.desc.categories) {
      // derive categories
      const categories = new Set(data.map((d) => <string>d[(<any>this.desc).column]));
      this.categories(Array.from(categories).sort());
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
