import { filteredHistTemplate, initFilter } from '../../src/renderer/histogram';
import type { IFilterContext, IFilterInfo } from '../../src/renderer/histogram';

function createFilterContext(): IFilterContext<number> {
  return {
    percent: (v: number) => v,
    unpercent: (p: number) => p,
    format: (v: number) => String(v),
    formatRaw: (v: number) => String(v),
    parseRaw: (v: string) => Number(v),
    setFilter: jest.fn(),
    inputType: 'number',
    inputStep: 'any',
    domain: [0, 100],
  };
}

function createFilterInfo(): IFilterInfo<number> {
  return {
    filterMissing: false,
    filterMin: 0,
    filterMax: 100,
  };
}

function buildHistogramDOM(context: IFilterContext<number>, info: IFilterInfo<number>): HTMLElement {
  const node = document.createElement('div');
  node.innerHTML = filteredHistTemplate(context, info);
  return node;
}

describe('filteredHistTemplate', () => {
  it('shows the default drag hint and always-visible input fields', () => {
    const ctx = createFilterContext();
    const info = createFilterInfo();
    const html = filteredHistTemplate(ctx, info);

    expect(html).toContain('drag to change; edit exact values below');
    expect(html).toContain('lu-histogram-filter-input-min');
    expect(html).toContain('lu-histogram-filter-input-max');
    expect(html).toContain('type="number"');
    expect(html).toContain('value="0"');
    expect(html).toContain('value="100"');
  });
});

describe('initFilter', () => {
  let node: HTMLElement;
  let context: IFilterContext<number>;

  beforeEach(() => {
    context = createFilterContext();
    node = buildHistogramDOM(context, createFilterInfo());
    document.body.appendChild(node);
    initFilter(node, context);
  });

  afterEach(() => {
    document.body.removeChild(node);
  });

  it('attaches drag (mousedown) handlers to the filter handles', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;

    expect(min.onmousedown).not.toBeNull();
    expect(max.onmousedown).not.toBeNull();
  });

  it('updates the filter when the min input changes', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const minInput = node.querySelector('.lu-histogram-filter-input-min') as HTMLInputElement;

    minInput.value = '20';
    minInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(context.setFilter).toHaveBeenCalledWith(false, 20, 100);
    expect(min.dataset.raw).toBe('20');
    expect(min.style.left).toBe('20%');
  });

  it('clamps the min input to the current max value', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const minInput = node.querySelector('.lu-histogram-filter-input-min') as HTMLInputElement;
    const maxInput = node.querySelector('.lu-histogram-filter-input-max') as HTMLInputElement;

    maxInput.value = '40';
    maxInput.dispatchEvent(new Event('change', { bubbles: true }));
    minInput.value = '50';
    minInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(context.setFilter).toHaveBeenLastCalledWith(false, 40, 40);
    expect(min.dataset.raw).toBe('40');
    expect(minInput.value).toBe('40');
  });

  it('clamps the max input to the current min value', () => {
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;
    const minInput = node.querySelector('.lu-histogram-filter-input-min') as HTMLInputElement;
    const maxInput = node.querySelector('.lu-histogram-filter-input-max') as HTMLInputElement;

    minInput.value = '60';
    minInput.dispatchEvent(new Event('change', { bubbles: true }));
    maxInput.value = '50';
    maxInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(context.setFilter).toHaveBeenLastCalledWith(false, 60, 60);
    expect(max.dataset.raw).toBe('60');
    expect(maxInput.value).toBe('60');
  });

  it('updates handles and input fields when the update callback is called', () => {
    const update = initFilter(node, context);
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;
    const minInput = node.querySelector('.lu-histogram-filter-input-min') as HTMLInputElement;
    const maxInput = node.querySelector('.lu-histogram-filter-input-max') as HTMLInputElement;

    update(0, {
      filterMissing: false,
      filterMin: 30,
      filterMax: 70,
    });

    expect(min.dataset.raw).toBe('30');
    expect(max.dataset.raw).toBe('70');
    expect(min.style.left).toBe('30%');
    expect(max.style.right).toBe('30%');
    expect(minInput.value).toBe('30');
    expect(maxInput.value).toBe('70');
    expect(minInput.max).toBe('70');
    expect(maxInput.min).toBe('30');
  });
});
