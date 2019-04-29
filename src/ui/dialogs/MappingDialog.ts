import {ISequence, round} from '../../internal';
import {IMapAbleColumn, IMappingFunction, isMissingValue, isMapAbleColumn} from '../../model';
import {IRankingHeaderContext} from '../interfaces';
import ADialog, {IDialogContext} from './ADialog';
import {IMappingAdapter, MappingLine} from './MappingLineDialog';
import {cssClass} from '../../styles';
import {ScaleMappingFunction, ScriptMappingFunction} from '../../model/MappingFunction';

/** @internal */
export default class MappingDialog extends ADialog {

  private scale: IMappingFunction;

  private readonly mappingLines: MappingLine[] = [];
  private rawDomain: [number, number];

  private readonly data: Promise<ISequence<number>>;
  private readonly idPrefix: string;

  private readonly mappingAdapter: IMappingAdapter = {
    destroyed: (self: MappingLine) => {
      this.mappingLines.splice(this.mappingLines.indexOf(self), 1);
    },
    updated: () => this.updateLines(this.computeScale()),
    domain: () => this.rawDomain,
    normalizeRaw: this.normalizeRaw.bind(this),
    unnormalizeRaw: this.unnormalizeRaw.bind(this),
    dialog: this.dialog
  };

  constructor(private readonly column: IMapAbleColumn, dialog: IDialogContext, ctx: IRankingHeaderContext) {
    super(dialog, {
      fullDialog: true
    });

    this.idPrefix = `me${ctx.idPrefix}`;
    this.scale = this.column.getMapping().clone();
    const domain = this.scale.domain;
    this.rawDomain = [domain[0], domain[domain.length - 1]];

    this.data = Promise.resolve(ctx.provider.mappingSample(column));
  }

  private get scaleType() {
    if ((this.scale instanceof ScriptMappingFunction)) {
      return 'script';
    }
    if (this.scale instanceof ScaleMappingFunction) {
      const base = this.scale.scaleType;
      if (base !== 'linear') {
        return base;
      }
      // check if invert or absolute
      const r = this.scale.range;
      if (r.length === 2 && r[0] === 1 && r[1] === 0) {
        return 'linear_invert';
      }
      if (r.length === 3 && r[0] === 1 && r[1] === 0 && r[2] === 1) {
        return 'linear_abs';
      }
      return 'linear';
    }
    return 'unknown';
  }

  build(node: HTMLElement) {
    node.classList.add(cssClass('dialog-mapper'));

    const r = this.column.findMyRanker();
    const others = !r ? [] : r.flatColumns.filter((d) => isMapAbleColumn(d) && d !== this.column);

    node.insertAdjacentHTML('beforeend', `
        <div><label for="${this.idPrefix}mapping_type"><strong>Normalization Scaling:</strong></label><select id="${this.idPrefix}mapping_type" class="browser-default">
        <option value="linear">Linear</option>
        <option value="linear_invert">Invert</option>
        <option value="linear_abs">Absolute</option>
        <option value="log">Log</option>
        <option value="pow1.1">Pow 1.1</option>
        <option value="pow2">Pow 2</option>
        <option value="pow3">Pow 3</option>
        <option value="sqrt">Sqrt</option>
        <option value="script">Custom Script</option>
        <option value="unknown">Unknown</option>
        ${others.length > 0 ? `<optgroup label="Copy From">${others.map((d) => `<option value="copy_${d.id}">${d.label}</option>`).join('')}</optgroup>`: ''}
      </select>
      </div>
        <div><strong>Domain (min - max): </strong><input id="${this.idPrefix}min" required type="number" value="${round(this.rawDomain[0], 3)}" step="any"> - <input id="${this.idPrefix}max" required type="number" value="${round(this.rawDomain[1], 3)}" step="any"></div>
        <strong style="text-align: center">Input Domain (min - max)</strong>
        <svg class="${cssClass('dialog-mapper-details')}" viewBox="0 0 106 66">
           <g transform="translate(3,3)">
              <line x2="100"></line>
              <rect y="-3" width="100" height="10"></rect>
              <line y1="60" x2="100" y2="60"></line>
              <rect y="36" width="100" height="10"></rect>
           </g>
        </svg>
        <strong style="text-align: center; margin-top: 0">Output Normalized Domain (0 - 1)</strong>
        <div class="${cssClass('dialog-mapper-script')}">
          <strong>Custom Normalization Script</strong>
          <textarea class="${cssClass('textarea')}"></textarea>
        </div>`);

    const g = <SVGGElement>node.querySelector(`.${cssClass('dialog-mapper-details')} > g`);

    this.forEach(`.${cssClass('dialog-mapper-details')} rect`, (d: SVGRectElement) => d.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const bb = d.getBoundingClientRect();
      const x = round((evt.x - bb.left) * 100 / bb.width, 2);
      const m = new MappingLine(g, x, x, this.mappingAdapter);
      this.mappingLines.push(m);
    });

    {

      const select = <HTMLSelectElement>this.find('select');
      const textarea = <HTMLTextAreaElement>this.find('textarea');
      select.onchange = (evt) => {
        const select = <HTMLSelectElement>evt.currentTarget;
        switch (select.value) {
          case 'linear_invert':
            this.scale = new ScaleMappingFunction(this.rawDomain.slice(), 'linear', [1, 0]);
            break;
          case 'linear_abs':
            this.scale = new ScaleMappingFunction([this.rawDomain[0], (this.rawDomain[1] - this.rawDomain[0]) / 2, this.rawDomain[1]], 'linear', [1, 0, 1]);
            break;
          case 'script':
            const s = new ScriptMappingFunction(this.rawDomain.slice());
            this.scale = s;
            textarea.value = s.code;
            break;
          case 'unknown':
            // clone original again
            this.scale = this.column.getOriginalMapping().clone();
            break;
          default:
            if (select.value.startsWith('copy_')) {
              this.copyMapping(select.value.slice('copy_'.length));
              return;
            }
            this.scale = new ScaleMappingFunction(this.rawDomain.slice(), select.value, [0, 1]);
            break;
        }
        this.createMappings();
        node.dataset.scale = select.value;
        this.updateLines();
      };
      const scaleType = node.dataset.scale = this.scaleType;
      select.selectedIndex = Array.from(select.options).findIndex((d) => d.value === scaleType);

      if (scaleType === 'script') {
        textarea.value = (<ScriptMappingFunction>this.scale).code;
      }
      this.createMappings();
    }

    {
      this.forEach(`.${cssClass('dialog-mapper-details')} input[type=number]`, (d: HTMLInputElement, i) => d.onchange = () => {
        const v = d.valueAsNumber;
        if (v === this.rawDomain[i]) {
          d.setCustomValidity('');
          return;
        }
        const other = this.rawDomain[1 - i];
        if (isNaN(v) || (i === 0 && v >= other) || (i === 1 && v <= other)) {
          d.setCustomValidity(`value has to be ${i === 0 ? '<= max' : '>= min'}`);
          return;
        }
        d.setCustomValidity('');
        this.rawDomain[i] = v;
        this.scale.domain = this.rawDomain.slice();
        this.applyMapping(this.scale);
        this.updateLines();
      });
    }

    this.data.then((values) => {
      values.forEach((v) => {
        if (!isMissingValue(v)) {
          g.insertAdjacentHTML('afterbegin', `<line data-v="${v}" x1="${round(this.normalizeRaw(v), 2)}" x2="${round(this.scale.apply(v) * 100, 2)}" y2="60"></line>`);
        }
      });
    });
  }

  private createMappings() {
    this.mappingLines.splice(0, this.mappingLines.length).forEach((d) => d.destroy());
    if (!(this.scale instanceof ScaleMappingFunction)) {
      return;
    }
    const g = <SVGGElement>this.node.querySelector(`.${cssClass('dialog-mapper-details')} > g`);
    const domain = this.scale.domain;
    const range = this.scale.range;
    for (let i = 0; i < domain.length; ++i) {
      this.mappingLines.push(new MappingLine(g, this.normalizeRaw(domain[i]), range[i] * 100, this.mappingAdapter));
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
    this.forEach(`.${cssClass('dialog-mapper-details')} input[type=number]`, (d: HTMLInputElement, i) => {
      d.value = String(domain[i]);
    });
  }

  private updateLines(scale = this.scale) {
    this.forEach(`.${cssClass('dialog-mapper-details')}  > g > line[x1]`, (d: SVGLineElement) => {
      const v = parseFloat(d.getAttribute('data-v')!);
      d.setAttribute('x1', round(this.normalizeRaw(v), 2).toString());
      d.setAttribute('x2', round(scale.apply(v) * 100, 2).toString());
    });
  }

  private applyMapping(newScale: IMappingFunction) {
    this.column.setMapping(newScale);
  }

  protected reset() {
    this.scale = this.column.getOriginalMapping();
    this.rawDomain = <[number, number]>this.scale.domain.slice();
    this.applyMapping(this.scale);
    this.update();
    this.updateLines();
    this.createMappings();
  }

  private copyMapping(columnId: string) {
    const r = this.column.findMyRanker();
    if (!r) {
      return;
    }
    const ref = <IMapAbleColumn>r.find(columnId)!;
    this.scale = ref.getMapping().clone();
    this.rawDomain = <[number, number]>this.scale.domain.slice();
    this.applyMapping(this.scale);
    this.update();
    this.updateLines();
  }

  private normalizeRaw(d: number) {
    const v = (d - this.rawDomain[0]) * 100 / (this.rawDomain[1] - this.rawDomain[0]);
    return Math.max(Math.min(v, 100), 0); // clamp
  }

  private unnormalizeRaw(d: number) {
    return (d) * (this.rawDomain[1] - this.rawDomain[0]) / 100 + this.rawDomain[0];
  }

  private computeScale() {
    const type = this.scaleType;
    if (type === 'script') {
      return new ScriptMappingFunction(this.rawDomain.slice(), this.node.querySelector('textarea')!.value);
    }
    this.mappingLines.sort((a, b) => a.domain - b.domain);
    const domain = this.mappingLines.map((d) => this.unnormalizeRaw(d.domain));
    const range = this.mappingLines.map((d) => d.range / 100);
    return new ScaleMappingFunction(domain, type, range);
  }

  protected submit() {
    if (!this.node.checkValidity()) {
      return false;
    }
    const scale = this.computeScale();
    this.applyMapping(scale);
    return true;
  }
}
