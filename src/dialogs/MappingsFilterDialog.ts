import AFilterDialog from './AFilterDialog';
import {IMapAbleColumn, IMappingFunction} from '../model/NumberColumn';
import Column from '../model/Column';
import {IDataProvider} from '../provider/ADataProvider';
import MappingEditor from '../mappingeditor';
import {noNumberFilter} from '../model/INumberColumn';

export default class MappingsFilterDialog extends AFilterDialog<IMapAbleColumn & Column> {

  /**
   * opens the mapping editor for a given NumberColumn
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param title optional title
   * @param data the data provider for illustrating the mapping by example
   * @param idPrefix dom id prefix
   */
  constructor(column: IMapAbleColumn & Column, header: HTMLElement, title = 'Change Mapping', private readonly data: IDataProvider, private readonly idPrefix: string) {
    super(column, header, title);
  }

  protected build():HTMLElement {
    const original = this.column.getOriginalMapping();
    let bakfilter = this.column.getFilter(),
      bak = this.column.getMapping(),
      act: IMappingFunction = bak.clone(),
      actfilter = bakfilter;

    const parent = this.attachment.ownerDocument.body;
    parent.insertAdjacentHTML('beforeend', `<div class="lu-popup">${this.dialogForm('<div class="mappingArea"></div>')}</div>`);
    const popup = <HTMLElement>parent.lastElementChild!;

    const applyMapping = (newscale: IMappingFunction, filter: { min: number, max: number, filterMissing: boolean }) => {
      act = newscale;
      actfilter = filter;
      this.markFiltered(!newscale.eq(original) || (bakfilter.min !== filter.min || bakfilter.max !== filter.min || bakfilter.filterMissing !== filter.filterMissing));

      this.column.setMapping(newscale);
      this.column.setFilter(filter);
    };

    const editorOptions = {
      idPrefix: this.idPrefix,
      callback: applyMapping,
      triggerCallback: 'dragend',
      padding_ver: 15
    };
    const dataSample = Promise.resolve(this.data.mappingSample(this.column));
    let editor = new MappingEditor(<HTMLElement>popup.querySelector('.mappingArea'), act, original, actfilter, dataSample, editorOptions);

    this.onButton(popup, {
      cancel: () => {
        this.column.setMapping(bak);
        this.markFiltered(!bak.eq(original));
      },
      reset: () => {
        bak = original;
        act = bak.clone();
        bakfilter = noNumberFilter();
        actfilter = bakfilter;
        applyMapping(act, actfilter);
        popup.querySelector('.mappingArea')!.innerHTML = '';
        editor = new MappingEditor(<HTMLElement>popup.querySelector('.mappingArea'), act, original, actfilter, dataSample, editorOptions);
      },
      submit: () => {
        applyMapping(editor.scale, editor.filter);
        return true;
      }
    });

    return popup;
  }
}
