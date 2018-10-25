import {round, similar} from '../../internal/math';
import ADialog, {IDialogContext} from './ADialog';
import {cssClass} from '../../styles';
import {dragHandle, IDragHandleOptions} from '../../internal/drag';

function clamp(v: number) {
  return Math.max(Math.min(v, 100), 0);
}

/** @internal */
export interface IMappingAdapter {
  destroyed(self: MappingLine): void;

  updated(self: MappingLine): void;

  domain(): number[];

  normalizeRaw(v: number): number;

  unnormalizeRaw(v: number): number;

  dialog: IDialogContext;
}

/** @internal */
export default class MappingLineDialog extends ADialog {
  constructor(private readonly line: {destroy(): void, domain: number, range: number, frozen: boolean, update(domain: number, range: number): void}, dialog: IDialogContext, private readonly adapter: IMappingAdapter) {
    super(dialog);
  }

  build(node: HTMLElement) {
    const domain = this.adapter.domain();
    node.insertAdjacentHTML('beforeend', `
        <strong>Input Domain Value (min ... max)</strong>
        <input type="number" value="${round(this.adapter.unnormalizeRaw(this.line.domain), 3)}" ${this.line.frozen ? 'readonly' : ''} autofocus required min="${domain[0]}" max="${domain[1]}" step="any">
        <strong>Output Normalized Value (0 ... 1)</strong>
        <input type="number" value="${round(this.line.range / 100, 3)}" required min="0" max="1" step="any">
        <button type="button" ${this.line.frozen ? 'disabled' : ''} >Remove Mapping Line</button>
      `);

    this.forEach('input', (d: HTMLInputElement) => d.onchange = () => this.submit());
    this.find('button').addEventListener('click', () => {
      this.destroy();
      this.line.destroy();
    }, {
      passive: true
    });
  }

  protected submit() {
    if (!this.node.checkValidity()) {
      return false;
    }
    const domain = this.adapter.normalizeRaw(parseFloat(this.findInput('input[type=number]').value));
    const range = parseFloat(this.findInput('input[type=number]:last-of-type').value) * 100;
    this.line.update(domain, range);
    return true;
  }
}

/** @internal */
export class MappingLine {
  readonly node: SVGGElement;

  constructor(g: SVGGElement, public domain: number, public range: number, private readonly adapter: IMappingAdapter) {
    g.insertAdjacentHTML('beforeend', `<g class="${cssClass('dialog-mapper-mapping')}" transform="translate(${domain},0)">
      <line x1="0" x2="${range - domain}" y2="60"></line>
      <line x1="0" x2="${range - domain}" y2="60"></line>
      <circle r="3"></circle>
      <circle cx="${range - domain}" cy="60" r="3"></circle>
      <title>Drag the anchor circle to change the mapping, shift click to edit</title>
    </g>`);
    this.node = <SVGGElement>g.lastElementChild!;

    // freeze 0 and 100 domain = raw domain ones
    this.node.classList.toggle('lu-frozen', similar(0, domain) || similar(domain, 100));
    {
      let beforeDomain: number;
      let beforeRange: number;
      let shiftDomain: number;
      let shiftRange: number;

      const normalize = (x: number) => x * 100 / g.getBoundingClientRect().width;

      const common: Partial<IDragHandleOptions> =  {
        container: g.parentElement!,
        filter: (evt) => evt.button === 0 && !evt.shiftKey,
        onStart: (_, x) => {
          beforeDomain = this.domain;
          beforeRange = this.range;
          const normalized = normalize(x);
          shiftDomain = this.domain - normalized;
          shiftRange = this.range - normalized;
        } ,
        onEnd: () => {
          if (!similar(beforeDomain, this.domain) || !similar(beforeRange, this.range)) {
            this.adapter.updated(this);
          }
        }
      };

      const line = this.node.querySelector<SVGLineElement>('line:first-of-type')!;
      dragHandle(line, { // line
        ...common,
        onDrag: (_, x) => {
          const normalized = normalize(x);
          this.update(clamp(normalized + shiftDomain), clamp(normalized + shiftRange));
        },
      });

      const domainCircle = this.node.querySelector<SVGLineElement>('circle:first-of-type')!;
      dragHandle(domainCircle, {
        ...common,
        onDrag: (_, x) => {
          const normalized = normalize(x);
          this.update(clamp(normalized), this.range);
        },
      });
      const rangeCircle = this.node.querySelector<SVGLineElement>('circle:last-of-type')!;
      dragHandle(rangeCircle, {
        ...common,
        onDrag: (_, x) => {
          const normalized = normalize(x);
          this.update(this.domain, clamp(normalized));
        },
      });
    }

    this.node.onclick = (evt) => {
      if (!evt.shiftKey) {
        return;
      }
      const ctx = {
        manager: this.adapter.dialog.manager,
        level: this.adapter.dialog.level + 1,
        attachment: <any>this.node,
        idPrefix: this.adapter.dialog.idPrefix
      };
      const dialog = new MappingLineDialog(this, ctx, this.adapter);
      dialog.open();
    };
  }

  get frozen() {
    return this.node.classList.contains(cssClass('frozen'));
  }

  destroy() {
    this.node.remove();
    this.adapter.destroyed(this);
  }

  update(domain: number, range: number) {
    if (similar(domain, this.domain) && similar(range, this.range)) {
      return;
    }
    if (this.frozen) {
      domain = this.domain;
    }
    this.domain = domain;
    this.range = range;
    this.node.setAttribute('transform', `translate(${domain},0)`);
    const shift = range - domain;
    Array.from(this.node.querySelectorAll<SVGLineElement>('line')).forEach((d) => d.setAttribute('x2', String(shift)));
    this.node.querySelector<SVGCircleElement>('circle[cx]')!.setAttribute('cx', String(shift));
  }
}
