import Column from '../../model/Column';
import {INumberFilter, noNumberFilter} from '../../model/INumberColumn';
import {IMappingFunction} from '../../model/MappingFunction';
import {IMapAbleColumn} from '../../model/NumberColumn';
import {IDataProvider} from '../../provider/ADataProvider';
import MappingEditor, {IMappingEditorOptions} from '../mappingeditor';
import ADialog from './ADialog';

export default class MappingsFilterDialog extends ADialog {

  private editor: MappingEditor;
  private bakFilter: INumberFilter;

  private original: IMappingFunction;
  private bak: IMappingFunction;
  private act: IMappingFunction;
  private actFilter: INumberFilter;

  private readonly dataSample: Promise<number[]>;
  private readonly editorOptions: Partial<IMappingEditorOptions>;

  constructor(private readonly column: IMapAbleColumn & Column, attachment: HTMLElement, private readonly data: IDataProvider, private readonly idPrefix: string) {
    super(attachment, {
      fullDialog: true
    });

    this.bakFilter = this.column.getFilter();
    this.bak = this.column.getMapping();


    this.original = this.column.getOriginalMapping();
    this.act = this.bak.clone();
    this.actFilter = this.bakFilter;

    this.editorOptions = {
      idPrefix: this.idPrefix,
      callback: this.applyMapping.bind(this),
      triggerCallback: 'dragend',
      padding_ver: 15
    };
    this.dataSample = Promise.resolve(this.data.mappingSample(this.column));
  }

  build(node: HTMLElement) {

    node.insertAdjacentHTML('beforeend', `<div class="mappingArea"></div>`);

    this.editor = new MappingEditor(<HTMLElement>node.querySelector('.mappingArea'), this.act, this.original, this.actFilter, this.dataSample, this.editorOptions);
  }

  private applyMapping(newscale: IMappingFunction, filter: { min: number, max: number, filterMissing: boolean }) {
    this.act = newscale;
    this.actFilter = filter;
    this.node.classList.toggle('lu-filtered', (!newscale.eq(this.original) || (this.bakFilter.min !== filter.min || this.bakFilter.max !== filter.min || this.bakFilter.filterMissing !== filter.filterMissing)));

    this.column.setMapping(newscale);
    this.column.setFilter(filter);
  }

  protected reset() {
    this.bak = this.column.getOriginalMapping();
    this.act = this.bak.clone();
    this.bakFilter = noNumberFilter();
    this.actFilter = this.bakFilter;
    this.applyMapping(this.act, this.actFilter);
    this.find('.mappingArea')!.innerHTML = '';
    this.editor = new MappingEditor(<HTMLElement>this.find('.mappingArea'), this.act, this.original, this.actFilter, this.dataSample, this.editorOptions);
  }

  protected submit() {
    this.applyMapping(this.editor.scale, this.editor.filter);
    return true;
  }
}
