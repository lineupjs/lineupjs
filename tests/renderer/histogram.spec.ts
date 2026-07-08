import { filteredHistTemplate, initFilter } from '../../src/renderer/histogram';
import type { IFilterContext, IFilterInfo } from '../../src/renderer/histogram';

function createFilterContext(precisionMode?: boolean): IFilterContext<number> {
  return {
    percent: (v: number) => v,
    unpercent: (p: number) => p,
    format: (v: number) => String(v),
    formatRaw: (v: number) => String(v),
    parseRaw: (v: string) => Number(v),
    setFilter: jest.fn(),
    edit: jest.fn().mockResolvedValue(50),
    domain: [0, 100],
    precisionMode,
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
  it('shows "drag or double click to change" hint in default mode', () => {
    const ctx = createFilterContext();
    const info = createFilterInfo();
    const html = filteredHistTemplate(ctx, info);
    expect(html).toContain('drag or double click to change');
    expect(html).not.toContain('click to set exact value');
  });

  it('shows "click to set exact value" hint in precision mode', () => {
    const ctx = createFilterContext(true);
    const info = createFilterInfo();
    const html = filteredHistTemplate(ctx, info);
    expect(html).toContain('click to set exact value');
    expect(html).not.toContain('drag or double click to change');
  });

  it('shows "drag or double click to change" when precisionMode is false', () => {
    const ctx = createFilterContext(false);
    const info = createFilterInfo();
    const html = filteredHistTemplate(ctx, info);
    expect(html).toContain('drag or double click to change');
  });
});

describe('initFilter - default mode', () => {
  let node: HTMLElement;
  let context: IFilterContext<number>;

  beforeEach(() => {
    context = createFilterContext();
    const info = createFilterInfo();
    node = buildHistogramDOM(context, info);
    document.body.appendChild(node);
    initFilter(node, context);
  });

  afterEach(() => {
    document.body.removeChild(node);
  });

  it('does not open editor on plain click on min handle', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    min.dispatchEvent(evt);
    expect(context.edit).not.toHaveBeenCalled();
  });

  it('opens editor on shift+click on min handle', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true });
    min.dispatchEvent(evt);
    expect(context.edit).toHaveBeenCalledWith(expect.any(Number), min, 'min', expect.any(Number));
  });

  it('opens editor on ctrl+click on min handle', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    min.dispatchEvent(evt);
    expect(context.edit).toHaveBeenCalledWith(expect.any(Number), min, 'min', expect.any(Number));
  });

  it('opens editor on dblclick on min handle', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const evt = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    min.dispatchEvent(evt);
    expect(context.edit).toHaveBeenCalledWith(expect.any(Number), min, 'min', expect.any(Number));
  });

  it('does not open editor on plain click on max handle', () => {
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    max.dispatchEvent(evt);
    expect(context.edit).not.toHaveBeenCalled();
  });

  it('opens editor on shift+click on max handle', () => {
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true });
    max.dispatchEvent(evt);
    expect(context.edit).toHaveBeenCalledWith(expect.any(Number), max, 'max', expect.any(Number));
  });

  it('opens editor on dblclick on max handle', () => {
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;
    const evt = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    max.dispatchEvent(evt);
    expect(context.edit).toHaveBeenCalledWith(expect.any(Number), max, 'max', expect.any(Number));
  });

  it('attaches drag (mousedown) handler to min handle in default mode', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    expect(min.onmousedown).toBeDefined();
  });

  it('attaches drag (mousedown) handler to max handle in default mode', () => {
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;
    expect(max.onmousedown).toBeDefined();
  });
});

describe('initFilter - precision mode', () => {
  let node: HTMLElement;
  let context: IFilterContext<number>;

  beforeEach(() => {
    context = createFilterContext(true);
    const info = createFilterInfo();
    node = buildHistogramDOM(context, info);
    document.body.appendChild(node);
    initFilter(node, context);
  });

  afterEach(() => {
    document.body.removeChild(node);
  });

  it('opens editor on single click on min handle in precision mode', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    min.dispatchEvent(evt);
    expect(context.edit).toHaveBeenCalledWith(expect.any(Number), min, 'min', expect.any(Number));
  });

  it('opens editor on single click on max handle in precision mode', () => {
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    max.dispatchEvent(evt);
    expect(context.edit).toHaveBeenCalledWith(expect.any(Number), max, 'max', expect.any(Number));
  });

  it('does not attach drag (mousedown) handler to min handle in precision mode', () => {
    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    expect(min.onmousedown).toBeNull();
  });

  it('does not attach drag (mousedown) handler to max handle in precision mode', () => {
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;
    expect(max.onmousedown).toBeNull();
  });
});

describe('initFilter - filter update callback', () => {
  it('updates min and max handle positions when update function is called', () => {
    const context = createFilterContext();
    const info = createFilterInfo();
    const node = buildHistogramDOM(context, info);
    document.body.appendChild(node);

    const update = initFilter(node, context);

    const newFilter: IFilterInfo<number> = {
      filterMissing: false,
      filterMin: 20,
      filterMax: 80,
    };
    update(0, newFilter);

    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;

    expect(min.dataset.raw).toBe('20');
    expect(max.dataset.raw).toBe('80');
    expect(min.style.left).toBe('20%');
    expect(max.style.right).toBe('20%');

    document.body.removeChild(node);
  });

  it('works the same in precision mode for filter updates', () => {
    const context = createFilterContext(true);
    const info = createFilterInfo();
    const node = buildHistogramDOM(context, info);
    document.body.appendChild(node);

    const update = initFilter(node, context);

    const newFilter: IFilterInfo<number> = {
      filterMissing: false,
      filterMin: 30,
      filterMax: 70,
    };
    update(0, newFilter);

    const min = node.querySelector('.lu-histogram-min') as HTMLElement;
    const max = node.querySelector('.lu-histogram-max') as HTMLElement;

    expect(min.dataset.raw).toBe('30');
    expect(max.dataset.raw).toBe('70');
    expect(min.style.left).toBe('30%');
    expect(max.style.right).toBe('30%');

    document.body.removeChild(node);
  });
});
