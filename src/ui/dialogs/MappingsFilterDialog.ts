import {D3DragEvent, drag} from 'd3-drag';
import {event as d3event, select, Selection} from 'd3-selection';
import {round, similar} from '../../internal/math';
import Column from '../../model/Column';
import {isSameFilter, noNumberFilter} from '../../model/INumberColumn';
import {IMappingFunction, ScaleMappingFunction, ScriptMappingFunction} from '../../model/MappingFunction';
import {IMapAbleColumn} from '../../model/NumberColumn';
import {IRankingHeaderContext} from '../interfaces';
import NumberSummary from '../summary/number';
import ADialog from './ADialog';

function clamp(v: number) {
  return Math.max(Math.min(v, 100), 0);
}

class MappingLine {
  readonly node: SVGGElement;

  private readonly $select: Selection<SVGGElement, any, any, any>;

  constructor(g: SVGGElement, public domain: number, public range: number, updated: () => void) {
    g.insertAdjacentHTML('beforeend', `<g class="lu-mapping" transform="translate(${domain},0)">
      <line x1="0" x2="${range - domain}" y2="100"></line>
      <line x1="0" x2="${range - domain}" y2="100"></line>
      <circle r="3"></circle>
      <circle cx="0" cy="100" r="3"></circle>
      <title>Drag the anchor circle to change the mapping, shift click to edit</title>
    </g>`);
    this.node = <SVGGElement>g.lastElementChild!;

    this.$select = select(this.node);
    {
      let beforeDomain: number;
      let beforeRange: number;
      let shiftDomain: number;
      let shiftRange: number;
      this.$select.selectAll('line:first-of-type, circle').call(drag()
        .container(function (this: SVGCircleElement) {
          return <any>this.parentNode!.parentNode;
        }).filter(() => d3event.button === 0 && !d3event.shiftKey)
        .on('start', () => {
          beforeDomain = this.domain;
          beforeRange = this.range;
          const evt = (<D3DragEvent<any, any, any>>d3event);
          shiftDomain = this.domain - evt.x;
          shiftRange = this.range - evt.x;
        }).on('drag', (_, i) => {
          const evt = (<D3DragEvent<any, any, any>>d3event);
          switch(i) {
            case 0: // line
              this.update(clamp(evt.x + shiftDomain), clamp(evt.x + shiftRange));
              break;
            case 1: // domain circle
              this.update(clamp(evt.x), this.range);
              break;
            case 2: // range circle
              this.update(this.domain, clamp(evt.x));
              break;
          }
        }).on('end', () => {
          if (!similar(beforeDomain, this.domain) && !similar(beforeRange, this.range)) {
            updated();
          }
        })
      );
    }
  }

  update(domain: number, range: number) {
    if (similar(domain, this.domain) && similar(range, this.range)) {
      return;
    }
    this.domain = domain;
    this.range = range;
    this.node.setAttribute('transform', `translate(${domain},0)`);
    const shift = range - domain;
    this.$select.selectAll('line')!.attr('x2', String(shift));
    this.$select.select('circle[cx]').attr('cx', String(shift));
  }
}

export default class MappingsFilterDialog extends ADialog {

  private original: IMappingFunction;
  private summary: NumberSummary;
  private scale: IMappingFunction;

  private mappingLines: MappingLine[] = [];

  constructor(private readonly column: IMapAbleColumn & Column, attachment: HTMLElement, private readonly ctx: IRankingHeaderContext) {
    super(attachment, {
      fullDialog: true
    });

    this.original = this.column.getOriginalMapping();
    this.scale = this.column.getMapping().clone();
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
        <div class="lu-details"><h4>Domain (min - max): </h4><input id="me${this.ctx.idPrefix}min" required type="number" value="${round(this.scale.domain[0], 3)}" > - <input id="me${this.ctx.idPrefix}max" required type="number" value="${round(this.scale.domain[1], 3)}" ></div>
        <h4 class="lu-details" style="text-align: center">Input Domain</h4>
        <svg class="lu-details" viewBox="0 0 106 106">
           <g transform="translate(3,3)">
              <line x2="100"></line>
              <rect y="-3" width="100" height="10"></rect>
              <line y1="100" x2="100" y2="100"></line>
              <rect y="96" width="100" height="10"></rect>
           </g>
        </svg>
        <h4 class="lu-details" style="text-align: center; margin-top: 0">Output Normalized Domain</h4>
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

    const g = <SVGGElement>node.querySelector('.lu-details > g');

    Array.from(node.querySelectorAll('.lu-details rect')).forEach((d: SVGRectElement) => d.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const bb = d.getBoundingClientRect();
      const x = round((evt.x - bb.left) * 100 / bb.width, 2);
      const m = new MappingLine(g, x, x, () => {
        // TODO
      });
      this.mappingLines.push(m);
    });

    {
      const select = <HTMLSelectElement>this.find('select');
      const textarea = <HTMLTextAreaElement>this.find('textarea');
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

    {
      this.forEach('.lu-details input[type=number]', (d: HTMLInputElement, i) => d.onchange = () => {
        const v = parseFloat(d.value);
        const other = this.scale.domain[1 - i];
        if (isNaN(v) || (i === 0 && v >= other) || (i === 1 && v <= other)) {
          d.setCustomValidity(`value has to be ${i === 0 ? '<= max' : '>= min'}`);
          return;
        }
        d.setCustomValidity('');
        this.scale.domain = i === 0 ? [v, other] : [other, v];
        this.submit();
      });
    }
  }

  private update() {
    const scaleType = this.node.dataset.scale = this.scaleType;
    const select = <HTMLSelectElement>this.find('select');
    select.selectedIndex = Array.from(select.options).findIndex((d) => d.value === scaleType);
    if (scaleType === 'script') {
      (<HTMLTextAreaElement>this.find('textarea')).value = (<ScriptMappingFunction>this.scale).code;
    }
    const domain = this.scale.domain;
    this.forEach('.lu-details input[type=number]', (d: HTMLInputElement, i) => {
      d.value = String(domain[i]);
    });
  }

  private applyMapping(newScale: IMappingFunction, filter: { min: number, max: number, filterMissing: boolean }) {
    this.attachment.classList.toggle('lu-filtered', (!newScale.eq(this.original) || !isSameFilter(noNumberFilter(), filter)));

    this.column.setMapping(newScale);
    this.column.setFilter(filter);
  }

  protected reset() {
    this.scale = this.column.getOriginalMapping();
    this.applyMapping(this.scale, noNumberFilter());
    this.update();
    this.summary.update(this.ctx);
  }

  protected submit() {
    if (this.node.checkValidity()) {
      return false;
    }
    if (this.scaleType === 'script') {
      (<ScriptMappingFunction>this.scale).code = this.node.querySelector('textarea')!.value;
    }
    this.applyMapping(this.scale, this.column.getFilter());
    return true;
  }
}
