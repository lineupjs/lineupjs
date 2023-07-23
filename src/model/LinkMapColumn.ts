import { toolbar } from './annotations';
import Column from './Column';
import type {
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
import type { dataLoaded } from './ValueColumn';
import type ValueColumn from './ValueColumn';
import type { IColumnDump, IDataRow, ITypeFactory } from './interfaces';
import { patternFunction, integrateDefaults } from './internal';
import MapColumn, { type IMapColumnDesc } from './MapColumn';
import LinkColumn, { type ILinkDesc } from './LinkColumn';
import type { IEventListener } from '../internal';
import { EAlignment } from './StringColumn';
import type { IKeyValue } from './IArrayColumn';
import type { ILink } from './LinkColumn';
import { restoreValue } from './diff';

export declare type ILinkMapColumnDesc = ILinkDesc & IMapColumnDesc<string>;

/**
 * emitted when the pattern property changes
 * @asMemberOf LinkMapColumn
 * @event
 */
export declare function patternChanged_LMC(previous: string, current: string): void;

/**
 * a string column with optional alignment
 */
@toolbar('rename', 'search', 'editPattern')
export default class LinkMapColumn extends MapColumn<string> {
  static readonly EVENT_PATTERN_CHANGED = LinkColumn.EVENT_PATTERN_CHANGED;

  readonly alignment: EAlignment;
  readonly escape: boolean;
  private pattern: string;
  private patternFunction: (value: string, raw: any, key: string) => string | null = null;
  readonly patternTemplates: string[];

  constructor(id: string, desc: Readonly<ILinkMapColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        width: 200,
        renderer: 'map',
      })
    );
    this.alignment = desc.alignment ?? EAlignment.left;
    this.escape = desc.escape !== false;
    this.pattern = desc.pattern ?? '';
    this.patternTemplates = desc.patternTemplates ?? [];
  }

  setPattern(pattern: string) {
    LinkColumn.prototype.setPattern.call(this, pattern);
  }

  getPattern() {
    return this.pattern;
  }

  protected override createEventList() {
    return super.createEventList().concat([LinkColumn.EVENT_PATTERN_CHANGED]);
  }

  override on(type: typeof LinkColumn.EVENT_PATTERN_CHANGED, listener: typeof patternChanged_LMC | null): this;
  override on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  override on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  override on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  override on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  override on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  override on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  override on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  override on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  override on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  override on(
    type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED,
    listener: typeof groupRendererChanged | null
  ): this;
  override on(
    type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED,
    listener: typeof summaryRendererChanged | null
  ): this;
  override on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  override on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  override on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type as any, listener);
  }

  override getValue(row: IDataRow) {
    const r = this.getLinkMap(row);
    return r.every((d) => d.value == null)
      ? null
      : r.map(({ key, value }) => ({
          key,
          value: value ? value.href : '',
        }));
  }

  override getLabels(row: IDataRow) {
    return this.getLinkMap(row).map(({ key, value }) => ({
      key,
      value: value ? value.alt : '',
    }));
  }

  getLinkMap(row: IDataRow): IKeyValue<ILink>[] {
    return super.getMap(row).map(({ key, value }) => ({
      key,
      value: this.transformValue(value, row, key),
    }));
  }

  private transformValue(v: any, row: IDataRow, key: string) {
    if (v == null || v === '') {
      return null;
    }
    if (typeof v === 'string') {
      if (!this.pattern) {
        return {
          alt: v,
          href: v,
        };
      }
      if (!this.patternFunction) {
        this.patternFunction = patternFunction(this.pattern, 'item', 'key');
      }
      return {
        alt: v,
        href: this.patternFunction.call(this, v, row.v, key),
      };
    }
    return v;
  }

  override toJSON() {
    const r = super.toJSON();
    r.pattern = this.pattern;
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);
    this.pattern = restoreValue(dump.pattern, this.pattern, changed, [
      LinkMapColumn.EVENT_PATTERN_CHANGED,
      Column.EVENT_DIRTY_HEADER,
      Column.EVENT_DIRTY_VALUES,
      Column.EVENT_DIRTY_CACHES,
      Column.EVENT_DIRTY,
    ]);
    return changed;
  }
}
