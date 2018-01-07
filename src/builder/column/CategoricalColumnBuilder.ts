import {ICategoricalColumnDesc, ICategory} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class CategoricalColumnBuilder extends ColumnBuilder<ICategoricalColumnDesc> {

  constructor(column: string) {
    super('categorical', column);
  }

  categories(categories: (string | Partial<ICategory>)[]) {
    this.desc.categories = categories;
    return this;
  }

  missingCategory(missingCategory: (string | Partial<ICategory>)) {
    this.desc.missingCategory = missingCategory;
    return this;
  }
}

export function buildCategoricalColumn(column: string, categories?: (string | Partial<ICategory>)[]) {
  const r = new CategoricalColumnBuilder(column);
  if (categories) {
    r.categories(categories);
  }
  return r;
}
