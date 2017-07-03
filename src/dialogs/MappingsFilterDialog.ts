import AFilterDialog from './AFilterDialog';
import {IMapAbleColumn, IMappingFunction, noNumberFilter} from '../model/NumberColumn';
import Column from '../model/Column';
import {offset} from '../utils';
import {select} from 'd3';
import DataProvider from '../provider/ADataProvider';
import MappingEditor from '../mappingeditor';

export default class MappingsFilterDialog extends AFilterDialog<IMapAbleColumn & Column> {

  /**
   * opens the mapping editor for a given NumberColumn
   * @param column the column to rename
   * @param $header the visual header element of this column
   * @param title optional title
   * @param data the data provider for illustrating the mapping by example
   * @param idPrefix dom id prefix
   */
  constructor(column: IMapAbleColumn & Column, $header: d3.Selection<IMapAbleColumn & Column>, title: string = 'Change Mapping', private readonly data: DataProvider, private readonly idPrefix: string) {
    super(column, $header, title);
  }

  openDialog() {
    const pos = offset(this.attachment.node()),
      original = this.column.getOriginalMapping();
    let bakfilter = this.column.getFilter(),
      bak = this.column.getMapping(),
      act: IMappingFunction = bak.clone(),
      actfilter = bakfilter;

    const popup = select('body').append('div')
      .attr({
        'class': 'lu-popup'
      }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
      })
      .html(this.dialogForm('<div class="mappingArea"></div>'));

    const applyMapping = (newscale: IMappingFunction, filter: {min: number, max: number, filterMissing: boolean}) => {
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
    const dataSample = this.data.mappingSample(this.column);
    let editor = new MappingEditor(<HTMLElement>popup.select('.mappingArea').node(), act, original, actfilter, dataSample, editorOptions);


    popup.select('.ok').on('click', function () {
      applyMapping(editor.scale, editor.filter);
      popup.remove();
    });
    popup.select('.cancel').on('click', () => {
      this.column.setMapping(bak);
      this.markFiltered(!bak.eq(original));
      popup.remove();
    });
    popup.select('.reset').on('click', function () {
      bak = original;
      act = bak.clone();
      bakfilter = noNumberFilter();
      actfilter = bakfilter;
      applyMapping(act, actfilter);
      popup.selectAll('.mappingArea *').remove();
      editor = new MappingEditor(<HTMLElement>popup.select('.mappingArea').node(), act, original, actfilter, dataSample, editorOptions);
    });
  }
}
