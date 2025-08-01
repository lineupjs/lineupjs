import { Category, toolbar, dialogAddons } from './annotations';
import Column, {
  widthChanged,
  labelChanged,
  metaDataChanged,
  dirty,
  dirtyHeader,
  dirtyValues,
  rendererTypeChanged,
  groupRendererChanged,
  summaryRendererChanged,
  visibilityChanged,
  dirtyCaches,
} from './Column';
import {
  defaultGroup,
  type IDataRow,
  type IGroup,
  ECompareValueType,
  type IValueColumnDesc,
  othersGroup,
  type ITypeFactory,
} from './interfaces';
import { missingGroup, isMissingValue } from './missing';
import type { dataLoaded } from './ValueColumn';
import ValueColumn from './ValueColumn';
import { equal, type IEventListener, type ISequence, isSeqEmpty } from '../internal';
import { integrateDefaults } from './internal';

/**
 * Parse a search query into terms and quoted phrases
 * @param query The search query string
 * @returns Array of search terms and quoted phrases
 * @internal
 */
function parseSearchQuery(query: string): string[] {
  const terms: string[] = [];
  const trimmed = query.trim();
  
  if (!trimmed) {
    return terms;
  }
  
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < trimmed.length) {
    const char = trimmed[i];
    
    if (char === '"') {
      if (inQuotes) {
        // End quote - add the quoted phrase if not empty
        if (current.trim()) {
          terms.push(current.trim());
        }
        current = '';
        inQuotes = false;
      } else {
        // Start quote - save any current term first
        if (current.trim()) {
          // Split by spaces/commas and add non-empty terms
          current.split(/[\s,]+/).forEach(term => {
            if (term.trim()) {
              terms.push(term.trim());
            }
          });
        }
        current = '';
        inQuotes = true;
      }
    } else if (inQuotes) {
      // Inside quotes, add everything
      current += char;
    } else if (char === ' ' || char === ',') {
      // Outside quotes, space or comma ends a term
      if (current.trim()) {
        terms.push(current.trim());
      }
      current = '';
    } else {
      // Regular character outside quotes
      current += char;
    }
    
    i++;
  }
  
  // Add any remaining term
  if (current.trim()) {
    if (inQuotes) {
      // Unclosed quote - treat as regular term
      terms.push(current.trim());
    } else {
      // Split by spaces/commas and add non-empty terms
      current.split(/[\s,]+/).forEach(term => {
        if (term.trim()) {
          terms.push(term.trim());
        }
      });
    }
  }
  
  return terms;
}

/**
 * Check if a text matches any of the search terms (case-insensitive)
 * @param text The text to search in
 * @param terms Array of search terms
 * @param filterType The type of search to perform
 * @returns true if any term matches
 * @internal
 */
function matchesAnyTerm(text: string, terms: string[], filterType: EStringFilterType = EStringFilterType.contains): boolean {
  const lowerText = text.toLowerCase();
  return terms.some(term => {
    const lowerTerm = term.toLowerCase();
    switch (filterType) {
      case EStringFilterType.startsWith:
        return lowerText.startsWith(lowerTerm);
      case EStringFilterType.contains:
      default:
        return lowerText.includes(lowerTerm);
    }
  });
}

export enum EAlignment {
  left = 'left',
  center = 'center',
  right = 'right',
}

export enum EStringGroupCriteriaType {
  value = 'value',
  startsWith = 'startsWith',
  regex = 'regex',
}

export interface IStringGroupCriteria {
  type: EStringGroupCriteriaType;
  values: (string | RegExp)[];
}

export interface IStringDesc {
  /**
   * column alignment: left, center, right
   * @default left
   */
  alignment?: EAlignment;

  /**
   * escape html tags
   */
  escape?: boolean;
}

export declare type IStringColumnDesc = IStringDesc & IValueColumnDesc<string>;

export enum EStringFilterType {
  contains = 'contains',
  startsWith = 'startsWith',
  regex = 'regex',
}

export interface IStringFilter {
  filter: string | RegExp | null;
  filterMissing: boolean;
  filterType?: EStringFilterType;
}

/**
 * emitted when the filter property changes
 * @asMemberOf StringColumn
 * @event
 */
export declare function filterChanged_SC(previous: string | RegExp | null, current: string | RegExp | null): void;

/**
 * emitted when the grouping property changes
 * @asMemberOf StringColumn
 * @event
 */
export declare function groupingChanged_SC(previous: (RegExp | string)[][], current: (RegExp | string)[][]): void;

/**
 * a string column with optional alignment
 */
@toolbar('rename', 'clone', 'sort', 'sortBy', 'search', 'groupBy', 'sortGroupBy', 'filterString')
@dialogAddons('group', 'groupString')
@Category('string')
export default class StringColumn extends ValueColumn<string> {
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_GROUPING_CHANGED = 'groupingChanged';

  //magic key for filtering missing ones
  private static readonly FILTER_MISSING = '__FILTER_MISSING';
  private currentFilter: IStringFilter | null = null;

  readonly alignment: EAlignment;
  readonly escape: boolean;

  private currentGroupCriteria: IStringGroupCriteria = {
    type: EStringGroupCriteriaType.startsWith,
    values: [],
  };

  constructor(id: string, desc: Readonly<IStringColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        width: 200,
      })
    );
    this.alignment = desc.alignment ?? EAlignment.left;
    this.escape = desc.escape !== false;
  }

  protected createEventList() {
    return super.createEventList().concat([StringColumn.EVENT_GROUPING_CHANGED, StringColumn.EVENT_FILTER_CHANGED]);
  }

  on(type: typeof StringColumn.EVENT_FILTER_CHANGED, listener: typeof filterChanged_SC | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  on(type: typeof StringColumn.EVENT_GROUPING_CHANGED, listener: typeof groupingChanged_SC | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type as any, listener);
  }

  getValue(row: IDataRow): string | null {
    const v: any = super.getValue(row);
    return isMissingValue(v) ? null : String(v);
  }

  getLabel(row: IDataRow) {
    return this.getValue(row) || '';
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    if (this.currentFilter) {
      if (this.currentFilter.filter instanceof RegExp) {
        r.filter = {
          filter: `REGEX:${(this.currentFilter.filter as RegExp).source}`,
          filterMissing: this.currentFilter.filterMissing,
          filterType: this.currentFilter.filterType,
        };
      } else {
        r.filter = {
          filter: this.currentFilter.filter,
          filterMissing: this.currentFilter.filterMissing,
          filterType: this.currentFilter.filterType,
        };
      }
    } else {
      r.filter = this.currentFilter;
    }
    if (this.currentGroupCriteria) {
      const { type, values } = this.currentGroupCriteria;
      r.groupCriteria = {
        type,
        values: values.map((value) =>
          value instanceof RegExp && type === EStringGroupCriteriaType.regex ? value.source : value
        ),
      };
    }
    return r;
  }

  restore(dump: any, factory: ITypeFactory) {
    super.restore(dump, factory);
    if (dump.filter) {
      const filter = dump.filter;
      if (typeof filter === 'string') {
        // compatibility case
        if (filter.startsWith('REGEX:')) {
          this.currentFilter = {
            filter: new RegExp(filter.slice(6), 'm'),
            filterMissing: false,
            filterType: EStringFilterType.contains,
          };
        } else if (filter === StringColumn.FILTER_MISSING) {
          this.currentFilter = {
            filter: null,
            filterMissing: true,
            filterType: EStringFilterType.contains,
          };
        } else {
          this.currentFilter = {
            filter,
            filterMissing: false,
            filterType: EStringFilterType.contains,
          };
        }
      } else {
        this.currentFilter = {
          filter:
            filter.filter && (filter.filter as string).startsWith('REGEX:')
              ? new RegExp((filter.filter as string).slice(6), 'm')
              : filter.filter || '',
          filterMissing: filter.filterMissing === true,
          filterType: filter.filterType || EStringFilterType.contains,
        };
      }
    } else {
      this.currentFilter = null;
    }

    // tslint:disable-next-line: early-exit
    if (dump.groupCriteria) {
      const { type, values } = dump.groupCriteria as IStringGroupCriteria;
      this.currentGroupCriteria = {
        type,
        values: values.map((value) =>
          type === EStringGroupCriteriaType.regex ? new RegExp(value as string, 'm') : value
        ),
      };
    }
  }

  isFiltered() {
    return this.currentFilter != null;
  }

  filter(row: IDataRow) {
    if (!this.isFiltered()) {
      return true;
    }
    const r = this.getLabel(row);
    const filter = this.currentFilter!;
    const ff = filter.filter;
    const filterType = filter.filterType || EStringFilterType.contains;

    if (r == null || r.trim() === '') {
      return !filter.filterMissing;
    }
    if (!ff) {
      return true;
    }
    if (ff instanceof RegExp) {
      return r !== '' && r.match(ff) != null; // You can not use RegExp.test(), because of https://stackoverflow.com/a/6891667
    }
    
    // Multi-term search for string filters
    const searchTerms = parseSearchQuery(ff);
    if (searchTerms.length > 1) {
      // Multiple terms - match any of them with the specified filter type
      return r !== '' && matchesAnyTerm(r, searchTerms, filterType);
    } else if (searchTerms.length === 1) {
      // Single term - use the parsed term for consistency with the specified filter type
      const lowerText = r.toLowerCase();
      const lowerTerm = searchTerms[0].toLowerCase();
      switch (filterType) {
        case EStringFilterType.startsWith:
          return r !== '' && lowerText.startsWith(lowerTerm);
        case EStringFilterType.contains:
        default:
          return r !== '' && lowerText.includes(lowerTerm);
      }
    }
    
    // Fallback to original behavior for empty or invalid queries
    const lowerText = r.toLowerCase();
    const lowerFilter = ff.toLowerCase();
    switch (filterType) {
      case EStringFilterType.startsWith:
        return r !== '' && lowerText.startsWith(lowerFilter);
      case EStringFilterType.contains:
      default:
        return r !== '' && lowerText.includes(lowerFilter);
    }
  }

  getFilter() {
    return this.currentFilter;
  }

  setFilter(filter: IStringFilter | null) {
    if (filter === this.currentFilter) {
      return;
    }
    const current = this.currentFilter || { filter: null, filterMissing: false, filterType: EStringFilterType.contains };
    const target = filter || { filter: null, filterMissing: false, filterType: EStringFilterType.contains };
    
    // Ensure backward compatibility by setting default filterType if not provided
    if (filter && filter.filterType === undefined) {
      filter.filterType = EStringFilterType.contains;
    }
    
    if (
      current.filterMissing === target.filterMissing &&
      current.filterType === target.filterType &&
      (current.filter === target.filter ||
        (current.filter instanceof RegExp &&
          target.filter instanceof RegExp &&
          current.filter.source === target.filter.source))
    ) {
      return;
    }
    this.fire(
      [StringColumn.EVENT_FILTER_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY],
      this.currentFilter,
      (this.currentFilter = filter)
    );
  }

  clearFilter() {
    const was = this.isFiltered();
    this.setFilter(null);
    return was;
  }

  getGroupCriteria(): IStringGroupCriteria {
    return this.currentGroupCriteria;
  }

  setGroupCriteria(value: IStringGroupCriteria) {
    if (equal(this.currentGroupCriteria, value) || value == null) {
      return;
    }
    const bak = this.getGroupCriteria();
    this.currentGroupCriteria = value;
    this.fire([StringColumn.EVENT_GROUPING_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, value);
  }

  group(row: IDataRow): IGroup {
    if (this.getValue(row) == null) {
      return Object.assign({}, missingGroup);
    }

    if (!this.currentGroupCriteria) {
      return Object.assign({}, othersGroup);
    }
    const value = this.getLabel(row);

    if (!value) {
      return Object.assign({}, missingGroup);
    }

    const { type, values } = this.currentGroupCriteria;
    if (type === EStringGroupCriteriaType.value) {
      return {
        name: value,
        color: defaultGroup.color,
      };
    }
    if (type === EStringGroupCriteriaType.startsWith) {
      for (const groupValue of values) {
        if (typeof groupValue !== 'string' || !value.startsWith(groupValue)) {
          continue;
        }
        return {
          name: groupValue,
          color: defaultGroup.color,
        };
      }
      return Object.assign({}, othersGroup);
    }
    for (const groupValue of values) {
      if (!(groupValue instanceof RegExp) || !groupValue.test(value)) {
        continue;
      }
      return {
        name: groupValue.source,
        color: defaultGroup.color,
      };
    }
    return Object.assign({}, othersGroup);
  }

  toCompareValue(row: IDataRow) {
    const v = this.getValue(row);
    return v === '' || v == null ? null : v.toLowerCase();
  }

  toCompareValueType() {
    return ECompareValueType.STRING;
  }

  toCompareGroupValue(rows: ISequence<IDataRow>, _group: IGroup, valueCache?: ISequence<any>) {
    if (isSeqEmpty(rows)) {
      return null;
    }
    // take the smallest one
    if (valueCache) {
      return valueCache.reduce((acc, v) => (acc == null || v < acc ? v : acc), null as null | string);
    }
    return rows.reduce(
      (acc, d) => {
        const v = this.getValue(d);
        return acc == null || (v != null && v < acc) ? v : acc;
      },
      null as null | string
    );
  }

  toCompareGroupValueType() {
    return ECompareValueType.STRING;
  }
}
