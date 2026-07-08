import { filteredHistTemplate, initFilter, type IFilterContext } from '../../src/renderer/histogram';
import { cssClass } from '../../src/styles';
import * as internal from '../../src/internal';

jest.mock('../../src/internal', () => {
  const actual = jest.requireActual('../../src/internal');
  return {
    ...actual,
    dragHandle: jest.fn(),
  };
});

function createContext(setFilter: (filterMissing: boolean, min: number, max: number) => void): IFilterContext<number> {
  return {
    percent: (v) => Math.max(0, Math.min(100, Math.round(v * 10))),
    unpercent: (v) => v / 10,
    format: (v) => v.toFixed(2),
    formatRaw: String,
    parseRaw: Number.parseFloat,
    setFilter,
    domain: [0, 10],
  };
}

function getLastFilterCall(setFilter: jest.Mock) {
  return setFilter.mock.calls[setFilter.mock.calls.length - 1] as [boolean, number, number];
}

describe('histogram number filter', () => {
  beforeEach(() => {
    (internal.dragHandle as jest.Mock).mockClear();
  });

  it('renders always-visible min/max inputs below histogram', () => {
    const node = document.createElement('div');
    node.innerHTML = filteredHistTemplate(createContext(jest.fn()), {
      filterMissing: false,
      filterMin: 1.23456789,
      filterMax: 9.87654321,
    });

    const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
    const maxInput = node.querySelector(`.${cssClass('histogram-max-input')}`) as HTMLInputElement;
    const minLabel = node.querySelector(`.${cssClass('histogram-min-input-label')}`) as HTMLElement;
    const maxLabel = node.querySelector(`.${cssClass('histogram-max-input-label')}`) as HTMLElement;
    const minHandle = node.querySelector(`.${cssClass('histogram-min')}`) as HTMLElement;
    const maxHandle = node.querySelector(`.${cssClass('histogram-max')}`) as HTMLElement;

    expect(minInput).not.toBeNull();
    expect(maxInput).not.toBeNull();
    expect(minLabel.textContent?.trim()).toBe('Min');
    expect(maxLabel.textContent?.trim()).toBe('Max');
    expect(minInput.value).toBe('1.23456789');
    expect(maxInput.value).toBe('9.87654321');
    expect(minHandle.hasAttribute('data-value')).toBe(false);
    expect(maxHandle.hasAttribute('data-value')).toBe(false);
  });

  it('updates filters from input edits with min/max constraints', () => {
    const setFilter = jest.fn();
    const node = document.createElement('div');
    node.innerHTML = filteredHistTemplate(createContext(setFilter), {
      filterMissing: false,
      filterMin: 1,
      filterMax: 9,
    });
    initFilter(node, createContext(setFilter));

    const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
    const maxInput = node.querySelector(`.${cssClass('histogram-max-input')}`) as HTMLInputElement;

    minInput.value = '8.123456789';
    minInput.dispatchEvent(new Event('change'));

    let [, minValue, maxValue] = getLastFilterCall(setFilter);
    expect(minValue).toBeCloseTo(8.123456789);
    expect(maxValue).toBe(9);

    maxInput.value = '7';
    maxInput.dispatchEvent(new Event('change'));

    [, minValue, maxValue] = getLastFilterCall(setFilter);
    expect(minValue).toBeCloseTo(8.123456789);
    expect(maxValue).toBeCloseTo(8.123456789);
    expect(maxInput.value).toBe('8.123456789');

    minInput.value = '-1';
    minInput.dispatchEvent(new Event('change'));

    [, minValue, maxValue] = getLastFilterCall(setFilter);
    expect(minValue).toBe(0);
    expect(maxValue).toBeCloseTo(8.123456789);
    expect(minInput.value).toBe('0');
  });

  it('keeps drag handles working and clamps crossing drags', () => {
    const setFilter = jest.fn();
    const node = document.createElement('div');
    node.innerHTML = filteredHistTemplate(createContext(setFilter), {
      filterMissing: false,
      filterMin: 1,
      filterMax: 9,
    });
    Object.defineProperty(node, 'clientWidth', { value: 100, configurable: true });

    initFilter(node, createContext(setFilter));

    const minHandle = node.querySelector(`.${cssClass('histogram-min')}`) as HTMLElement;
    expect(minHandle.onclick).toBeNull();
    expect(minHandle.ondblclick).toBeNull();
    expect(internal.dragHandle).toHaveBeenCalledTimes(2);

    const dragOptions = (internal.dragHandle as jest.Mock).mock.calls[0][1];
    dragOptions.onDrag(minHandle, 95);
    dragOptions.onEnd(minHandle);

    const [, minValue, maxValue] = getLastFilterCall(setFilter);
    expect(minValue).toBe(9);
    expect(maxValue).toBe(9);
  });
});
