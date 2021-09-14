import { round, similar, dragHandle, IDragHandleOptions } from '../../internal';
import ADialog, { IDialogContext } from './ADialog';
import { cssClass } from '../../styles';

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

  formatter(v: number): string;
}

/** @internal */
export default class MappingLineDialog extends ADialog {
  private readonly before: { domain: number; range: number };

  constructor(
    private readonly line: {
      destroy(): void;
      domain: number;
      range: number;
      frozen: boolean;
      update(domain: number, range: number, trigger: boolean): void;
    },
    dialog: IDialogContext,
    private readonly adapter: IMappingAdapter
  ) {
    super(dialog, {
      livePreview: 'dataMapping',
    });
    this.dialog.attachment.classList.add(cssClass('mapping-line-selected'));
    this.before = {
      domain: this.line.domain,
      range: this.line.range,
    };
  }

  build(node: HTMLElement) {
    const domain = this.adapter.domain();
    node.insertAdjacentHTML(
      'beforeend',
      `
        <button class="${cssClass('dialog-button')} lu-action-remove" title="Remove" type="button" ${
        this.line.frozen ? 'style="display: none"' : ''
      } ><span style="margin-left: 3px">Remove Mapping Line</span></button>
        <strong>Input Domain Value (min ... max)</strong>
        <input type="number" value="${this.adapter.formatter(this.adapter.unnormalizeRaw(this.line.domain))}" ${
        this.line.frozen ? 'readonly disabled' : ''
      } autofocus required min="${domain[0]}" max="${domain[1]}" step="any">
        <strong>Output Normalized Value (0 ... 1)</strong>
        <input type="number" value="${round(this.line.range / 100, 3)}" required min="0" max="1" step="any">
      `
    );
    this.find('button').addEventListener(
      'click',
      () => {
        this.destroy('confirm');
        this.line.destroy();
      },
      {
        passive: true,
      }
    );
    this.enableLivePreviews('input');
  }

  cleanUp(action: 'cancel' | 'confirm' | 'handled') {
    super.cleanUp(action);

    this.dialog.attachment.classList.remove(cssClass('mapping-line-selected'));
  }

  protected cancel() {
    this.line.update(this.before.domain, this.before.range, true);
  }

  protected reset() {
    this.findInput('input[type=number]').value = round(this.adapter.unnormalizeRaw(this.before.domain), 3).toString();
    this.findInput('input[type=number]:last-of-type').value = round(this.before.range / 100, 3).toString();
  }

  protected submit() {
    if (!this.node.checkValidity()) {
      return false;
    }
    const domain = this.adapter.normalizeRaw(this.findInput('input[type=number]').valueAsNumber);
    const range = this.findInput('input[type=number]:last-of-type').valueAsNumber * 100;
    this.line.update(domain, range, true);
    return true;
  }
}

/** @internal */
export class MappingLine {
  readonly node: SVGGElement;

  constructor(g: SVGGElement, public domain: number, public range: number, private readonly adapter: IMappingAdapter) {
    const h = 52;
    g.insertAdjacentHTML(
      'beforeend',
      `<g class="${cssClass('dialog-mapper-mapping')}" transform="translate(${domain},0)">
      <line x1="0" x2="${range - domain}" y2="${h}"></line>
      <line x1="0" x2="${range - domain}" y2="${h}"></line>
      <circle r="2"></circle>
      <circle cx="${range - domain}" cy="${h}" r="2"></circle>
      <text class="${cssClass('dialog-mapper-mapping-domain')} ${
        domain > 25 && domain < 75 ? cssClass('dialog-mapper-mapping-middle') : ''
      }${domain > 75 ? cssClass('dialog-mapper-mapping-right') : ''}" dy="-3">
        ${this.adapter.formatter(this.adapter.unnormalizeRaw(domain))}
      </text>
      <text class="${cssClass('dialog-mapper-mapping-range')} ${
        range > 25 && range < 75 ? cssClass('dialog-mapper-mapping-middle') : ''
      }${range > 50 ? cssClass('dialog-mapper-mapping-right') : ''}" dy="3" x="${range - domain}" y="${h}">
        ${round(range / 100, 3)}
      </text>
      <title>Drag the anchor circle to change the mapping, double click to edit</title>
    </g>`
    );
    this.node = g.lastElementChild! as SVGGElement;

    // freeze 0 and 100 domain = raw domain ones
    this.node.classList.toggle(cssClass('frozen'), similar(0, domain) || similar(domain, 100));
    {
      let beforeDomain: number;
      let beforeRange: number;
      let shiftDomain: number;
      let shiftRange: number;

      const normalize = (x: number) => (x * 100) / g.getBoundingClientRect().width;

      const common: Partial<IDragHandleOptions> = {
        container: g.parentElement!,
        filter: (evt) => evt.button === 0 && !evt.shiftKey,
        onStart: (_, x) => {
          beforeDomain = this.domain;
          beforeRange = this.range;
          const normalized = normalize(x);
          shiftDomain = this.domain - normalized;
          shiftRange = this.range - normalized;
        },
        onEnd: () => {
          if (!similar(beforeDomain, this.domain) || !similar(beforeRange, this.range)) {
            this.adapter.updated(this);
          }
        },
      };

      const line = this.node.querySelector<SVGLineElement>('line:first-of-type')!;
      dragHandle(line, {
        // line
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
      this.openDialog();
    };

    this.node.ondblclick = () => {
      this.openDialog();
    };
  }

  private openDialog() {
    const ctx = {
      manager: this.adapter.dialog.manager,
      level: this.adapter.dialog.level + 1,
      attachment: this.node as any,
      idPrefix: this.adapter.dialog.idPrefix,
      sanitize: this.adapter.dialog.sanitize,
    };
    const dialog = new MappingLineDialog(this, ctx, this.adapter);
    dialog.open();
  }

  get frozen() {
    return this.node.classList.contains(cssClass('frozen'));
  }

  destroy(handled = false) {
    this.node.remove();
    if (!handled) {
      this.adapter.destroyed(this);
    }
  }

  update(domain: number, range: number, trigger = false) {
    if (similar(domain, 100)) {
      domain = 100;
    }
    if (similar(domain, 0)) {
      domain = 0;
    }
    if (similar(range, 100)) {
      range = 100;
    }
    if (similar(range, 0)) {
      range = 0;
    }

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

    const t1 = this.node.querySelector<SVGTextElement>('text')!;
    t1.textContent = this.adapter.formatter(this.adapter.unnormalizeRaw(domain));
    t1.classList.toggle(cssClass('dialog-mapper-mapping-right'), domain > 75);
    t1.classList.toggle(cssClass('dialog-mapper-mapping-middle'), domain >= 25 && domain <= 75);

    const t2 = this.node.querySelector<SVGTextElement>('text[x]')!;
    t2.textContent = round(range / 100, 3).toString();
    t2.classList.toggle(cssClass('dialog-mapper-mapping-right'), range > 75);
    t2.classList.toggle(cssClass('dialog-mapper-mapping-middle'), range >= 25 && range <= 75);
    t2.setAttribute('x', String(shift));

    if (trigger) {
      this.adapter.updated(this);
    }
  }
}
