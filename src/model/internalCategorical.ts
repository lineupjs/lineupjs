import {ISequence, isSeqEmpty, empty} from '../internal';
import {FIRST_IS_MISSING, IDataRow, ECompareValueType, ICompareValue, ICategory, ICategoricalColumn, ICategoricalDesc, ICategoricalFilter} from '.';
import {colorPool} from './internal';
import {DEFAULT_COLOR} from './interfaces';
import {ICategoricalsColumn} from './ICategoricalColumn';

/** @internal */
export function toCategory(cat: (string | Partial<ICategory>), value: number, nextColor: () => string = () => DEFAULT_COLOR) {
  if (typeof cat === 'string') {
    //just the category value
    return {name: cat, label: cat, color: nextColor(), value};
  }
  const name = cat.name == null ? String(cat.value) : cat.name;
  return {
    name,
    label: cat.label || name,
    color: cat.color || nextColor(),
    value: cat.value != null ? cat.value : value
  };
}


/** @internal */
export function toCompareCategoryValue(v: ICategory | null) {
  if (v == null) {
    return NaN;
  }
  return v.value;
}

export const COMPARE_CATEGORY_VALUE_TYPES = ECompareValueType.FLOAT_ASC;

function findMostFrequent(rows: ISequence<ICategory | null>, valueCache?: ISequence<ICategory | null>): {cat: ICategory | null, count: number} {
  const hist = new Map<ICategory | null, number>();

  if (valueCache) {
    valueCache.forEach((cat) => {
      hist.set(cat, (hist.get(cat) || 0) + 1);
    });
  } else {
    rows.forEach((cat) => {
      hist.set(cat, (hist.get(cat) || 0) + 1);
    });
  }

  if (hist.size === 0) {
    return {
      cat: null,
      count: 0
    };
  }
  let topCat: ICategory | null = null;
  let topCount = 0;
  hist.forEach((count, cat) => {
    if (count > topCount) {
      topCat = cat;
      topCount = count;
    }
  });
  return {
    cat: topCat,
    count: topCount
  };
}

/** @internal */
export function toMostFrequentCategoricals(rows: ISequence<IDataRow>, col: ICategoricalsColumn): (ICategory | null)[] {
  if (isSeqEmpty(rows)) {
    return empty(col.dataLength!);
  }
  const maps = empty(col.dataLength!).map(() => new Map<ICategory | null, number>());
  rows.forEach((row) => {
    const vs = col.getCategories(row);
    if (!vs) {
      return;
    }
    for (let i = 0; i < maps.length; ++i) {
      const hist = maps[i];
      const cat = vs[i] || null;
      hist.set(cat, (hist.get(cat) || 0) + 1);
    }
  });

  return maps.map((hist) => {
    if (hist.size === 0) {
      return null;
    }
    let topCat: ICategory | null = null;
    let topCount = 0;
    hist.forEach((count, cat) => {
      if (count > topCount) {
        topCat = cat;
        topCount = count;
      }
    });
    return topCat;
  });
}

/** @internal */
export function toGroupCompareCategoryValue(rows: ISequence<IDataRow>, col: ICategoricalColumn, valueCache?: ISequence<ICategory | null>): ICompareValue[] {
  if (isSeqEmpty(rows)) {
    return [NaN, 0];
  }
  const mostFrequent = findMostFrequent(rows.map((d) => col.getCategory(d)), valueCache);
  if (mostFrequent.cat == null) {
    return [NaN, 0];
  }
  return [mostFrequent.cat.value, mostFrequent.count];
}

export const COMPARE_GROUP_CATEGORY_VALUE_TYPES = [ECompareValueType.FLOAT, ECompareValueType.COUNT];

/** @internal */
function compareCategory(a: ICategory | null, b: ICategory | null) {
  const aNull = a == null || isNaN(a.value);
  const bNull = b == null || isNaN(b.value);
  if (aNull || a == null) {
    return bNull ? 0 : FIRST_IS_MISSING;
  }
  if (bNull || b == null) {
    return -FIRST_IS_MISSING;
  }
  if (a.value === b.value) {
    return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
  }
  return a.value - b.value;
}

/** @internal */
export function toCategories(desc: ICategoricalDesc) {
  if (!desc.categories) {
    return [];
  }
  const nextColor = colorPool();
  const l = desc.categories.length - 1;
  const cats = desc.categories.map((cat, i) => toCategory(cat, i / l, nextColor));
  return cats.sort(compareCategory);
}

/** @internal */
function isEmptyFilter(f: ICategoricalFilter | null) {
  return f == null || (!f.filterMissing && (f.filter == null || f.filter === ''));
}

/** @internal */
export function isEqualCategoricalFilter(a: ICategoricalFilter | null, b: ICategoricalFilter | null) {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return isEmptyFilter(a) === isEmptyFilter(b);
  }
  if (a.filterMissing !== b.filterMissing || (typeof a.filter !== typeof b.filter)) {
    return false;
  }
  if (Array.isArray(a.filter)) {
    return arrayEquals(<string[]>a.filter, <string[]>b.filter);
  }
  return String(a.filter) === String(b.filter);
}

function arrayEquals<T>(a: T[], b: T[]) {
  const al = a != null ? a.length : 0;
  const bl = b != null ? b.length : 0;
  if (al !== bl) {
    return false;
  }
  if (al === 0) {
    return true;
  }
  return a.every((ai, i) => ai === b[i]);
}

/** @internal */
export function isCategoryIncluded(filter: ICategoricalFilter | null, category: ICategory | null) {
  if (filter == null) {
    return true;
  }
  if (category == null || isNaN(category.value)) {
    return !filter.filterMissing;
  }
  const filterObj = filter.filter;
  if (Array.isArray(filterObj)) { //array mode
    return filterObj.includes(category.name);
  }
  if (typeof filterObj === 'string' && filterObj.length > 0) { //search mode
    return category.name.toLowerCase().includes(filterObj.toLowerCase());
  }
  if (filterObj instanceof RegExp) { //regex match mode
    return filterObj.test(category.name);
  }
  return true;
}
