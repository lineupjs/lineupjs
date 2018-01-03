import Column from '../../model/Column';
import {INumberFilter, isSameFilter, noNumberFilter} from '../../model/INumberColumn';
import {IMappingFunction, ScaleMappingFunction, ScriptMappingFunction} from '../../model/MappingFunction';
import {IMapAbleColumn} from '../../model/NumberColumn';
import {IRankingHeaderContext} from '../interfaces';
import NumberSummary from '../summary/number';
import ADialog from './ADialog';

export default class MappingsFilterDialog extends ADialog {

  private bak: IMappingFunction;
  private bakFilter: INumberFilter;
  private original: IMappingFunction;

  private summary: NumberSummary;

  private scale: IMappingFunction;

  constructor(private readonly column: IMapAbleColumn & Column, attachment: HTMLElement, private readonly ctx: IRankingHeaderContext) {
    super(attachment, {
      fullDialog: true
    });

    this.bakFilter = this.column.getFilter();
    this.bak = this.column.getMapping();

    this.original = this.column.getOriginalMapping();
    this.scale = this.bak.clone();
  }

  private get scaleType() {
    return this.scale instanceof ScaleMappingFunction ? this.scale.scaleType : 'script';
  }

  build(node: HTMLElement) {
    node.classList.add('lu-dialog-mapper');

    node.insertAdjacentHTML('beforeend', `
        <div><label for="me${this.ctx.idPrefix}mapping_type"><h4>Mapping / Scaling Type:</h4> <select id="me${this.ctx.idPrefix}mapping_type">
        <option value="linear">Linear</option>
        <option value="linear_invert">Invert</option>
        <option value="linear_abs">Absolute</option>
        <option value="log">Log</option>
        <option value="pow1.1">Pow 1.1</option>
        <option value="pow2">Pow 2</option>
        <option value="pow3">Pow 3</option>
        <option value="sqrt">Sqrt</option>
        <option value="script">Custom Script</option>
      </select>
      </label></div>
        <div class="lu-summary"></div>
        <h4 data-toggle>Mapping Details</h4>
        <div class="lu-details">
            <div><h4>Domain (min - max): </h4><input id="me${this.ctx.idPrefix}min" required type="number" value="${this.scale.domain[0]}" > - <input id="me${this.ctx.idPrefix}max" required type="number" value="${this.scale.domain[1]}" ></div>
        </div>
        <div class="lu-script">
          <h4>Custom Mapping Script</h4>
          <textarea></textarea>
        </div>`);
    this.summary = new NumberSummary(this.column, <HTMLElement>node.querySelector('.lu-summary')!, true);
    this.summary.update(this.ctx);

    this.find('[data-toggle]').onclick = (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      const elem = (<HTMLElement>evt.currentTarget).dataset;
      elem.toggle = elem.toggle === 'open'  ? '' : 'open';
    };

    const textarea = <HTMLTextAreaElement>this.find('textarea');

    {
      const select = <HTMLSelectElement>this.find('select');
      select.onchange = (evt) => {
        const select = <HTMLSelectElement>evt.currentTarget;
        const domain = this.scale.domain;
        switch (select.value) {
          case 'linear_invert':
            this.scale = new ScaleMappingFunction(domain, 'linear', [1, 0]);
            break;
          case 'linear_abs':
            this.scale = new ScaleMappingFunction([domain[0], (domain[1] - domain[0]) / 2, domain[1]], 'linear', [1, 0, 1]);
            break;
          case 'script':
            const s = new ScriptMappingFunction(domain);
            this.scale = s;
            textarea.value = s.code;
            break;
          default:
            this.scale = new ScaleMappingFunction(domain, select.value);
            break;
        }
        node.dataset.scale = select.value;
        this.submit();
      };
      const scaleType = node.dataset.scale = this.scaleType;
      select.selectedIndex = Array.from(select.options).findIndex((d) => d.value === scaleType);

      if (scaleType === 'script') {
        textarea.value = (<ScriptMappingFunction>this.scale).code;
      }
    }
  }

  private applyMapping(newScale: IMappingFunction, filter: { min: number, max: number, filterMissing: boolean }) {
    this.attachment.classList.toggle('lu-filtered', (!newScale.eq(this.original) || !isSameFilter(this.bakFilter, filter)));

    this.column.setMapping(newScale);
    this.column.setFilter(filter);
  }

  protected reset() {
    this.bak = this.column.getOriginalMapping();
    this.bakFilter = noNumberFilter();
    this.applyMapping(this.bak, this.bakFilter);
    this.summary.update(this.ctx);
  }

  protected submit() {
    if (this.scaleType === 'script') {
      (<ScriptMappingFunction>this.scale).code = this.node.querySelector('textarea')!.value;
    }
    this.applyMapping(this.scale, this.column.getFilter());
    return true;
  }
}
