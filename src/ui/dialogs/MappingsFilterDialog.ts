import Column from '../../model/Column';
import {INumberFilter, noNumberFilter} from '../../model/INumberColumn';
import {IMappingFunction} from '../../model/MappingFunction';
import {IMapAbleColumn} from '../../model/NumberColumn';
import {IRankingHeaderContext} from '../interfaces';
import NumberSummary from '../summary/number';
import ADialog from './ADialog';

export default class MappingsFilterDialog extends ADialog {

  private bak: IMappingFunction;
  private bakFilter: INumberFilter;
  private original: IMappingFunction;

  constructor(private readonly column: IMapAbleColumn & Column, attachment: HTMLElement, private readonly ctx: IRankingHeaderContext) {
    super(attachment, {
      fullDialog: true
    });

    this.bakFilter = this.column.getFilter();
    this.bak = this.column.getMapping();


    this.original = this.column.getOriginalMapping();
  }

  build(node: HTMLElement) {
    node.classList.add('lu-dialog-mapper');
    node.insertAdjacentHTML('beforeend', `<div class="lu-summary"></div>`);
    const summary = new NumberSummary(this.column, <HTMLElement>node.querySelector('.lu-summary')!, true);
    summary.update(this.ctx);
  }

  private applyMapping(newscale: IMappingFunction, filter: { min: number, max: number, filterMissing: boolean }) {
    this.node.classList.toggle('lu-filtered', (!newscale.eq(this.original) || (this.bakFilter.min !== filter.min || this.bakFilter.max !== filter.min || this.bakFilter.filterMissing !== filter.filterMissing)));

    this.column.setMapping(newscale);
    this.column.setFilter(filter);
  }

  protected reset() {
    this.bak = this.column.getOriginalMapping();
    this.bakFilter = noNumberFilter();
    this.applyMapping(this.bak, this.bakFilter);
  }

  protected submit() {
    return true;
  }
}
