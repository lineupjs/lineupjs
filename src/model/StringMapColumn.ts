import { toolbar } from './annotations';
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
import type Column from './Column';
import type { dataLoaded } from './ValueColumn';
import type ValueColumn from './ValueColumn';
import type { IDataRow } from './interfaces';
import MapColumn, { IMapColumnDesc } from './MapColumn';
import { EAlignment, IStringDesc } from './StringColumn';
import type { IEventListener } from '../internal';
import { isMissingValue } from './missing';
import { integrateDefaults } from './internal';

export declare type IStringMapColumnDesc = IStringDesc & IMapColumnDesc<string>;

/**
 * a string column with optional alignment
 */
@toolbar('rename', 'search')
export default class StringMapColumn extends MapColumn<string> {
  readonly alignment: EAlignment;
  readonly escape: boolean;

  constructor(id: string, desc: Readonly<IStringMapColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        width: 200,
        renderer: 'map',
      })
    );
    this.alignment = desc.alignment ?? EAlignment.left;
    this.escape = desc.escape !== false;
  }

  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
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

  getValue(row: IDataRow) {
    const r = this.getMapValue(row);
    return r.every((d) => d.value === '') ? null : r;
  }

  getMapValue(row: IDataRow) {
    return super.getMap(row).map(({ key, value }) => ({
      key,
      value: isMissingValue(value) ? '' : String(value),
    }));
  }
}
