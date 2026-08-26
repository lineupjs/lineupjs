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

/** Reproduce the formatInput / parseInput logic from createFilterContext */
function formatInput(v: number): string {
  if (Number.isNaN(v)) {
    return '';
  }
  const d = new Date(v);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInput(v: string): number {
  if (!v || v.trim() === '') {
    return NaN;
  }
  const parts = v.split('-');
  if (parts.length !== 3) {
    return NaN;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return NaN;
  }
  return new Date(year, month, day).getTime();
}

function createDateContext(
  setFilter: (filterMissing: boolean, min: number, max: number) => void,
  domain: [number, number]
): IFilterContext<number> {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const percent = (v: number) => clamp(Math.round((100 * (v - domain[0])) / (domain[1] - domain[0])));
  const unpercent = (v: number) => (v / 100) * (domain[1] - domain[0]) + domain[0];
  return {
    percent,
    unpercent,
    domain,
    format: (v) => (Number.isNaN(v) ? '' : new Date(v).toLocaleDateString()),
    formatRaw: String,
    parseRaw: (v) => Number.parseInt(v, 10),
    inputType: 'date',
    formatInput,
    parseInput,
    setFilter,
  };
}

function getLastFilterCall(setFilter: jest.Mock) {
  return setFilter.mock.calls[setFilter.mock.calls.length - 1] as [boolean, number, number];
}

// Two fixed timestamps for the domain
const MIN_DATE = new Date(2020, 0, 1).getTime(); // 2020-01-01 local midnight
const MAX_DATE = new Date(2020, 11, 31).getTime(); // 2020-12-31 local midnight

describe('date histogram filter', () => {
  beforeEach(() => {
    (internal.dragHandle as jest.Mock).mockClear();
  });

  describe('formatInput / parseInput round-trip', () => {
    it('formats a timestamp as YYYY-MM-DD', () => {
      expect(formatInput(new Date(2020, 5, 15).getTime())).toBe('2020-06-15');
    });

    it('pads month and day with leading zeros', () => {
      expect(formatInput(new Date(2021, 0, 9).getTime())).toBe('2021-01-09');
    });

    it('returns empty string for NaN', () => {
      expect(formatInput(NaN)).toBe('');
    });

    it('round-trips: formatInput then parseInput returns original local midnight', () => {
      const original = new Date(2020, 5, 15).getTime();
      expect(parseInput(formatInput(original))).toBe(original);
    });

    it('parses YYYY-MM-DD as local midnight', () => {
      const expected = new Date(2020, 5, 15).getTime(); // local midnight
      expect(parseInput('2020-06-15')).toBe(expected);
    });

    it('returns NaN for empty string', () => {
      expect(parseInput('')).toBeNaN();
    });

    it('returns NaN for invalid date string', () => {
      expect(parseInput('not-a-date')).toBeNaN();
    });

    it('returns NaN for partial date string', () => {
      expect(parseInput('2020-06')).toBeNaN();
    });
  });

  describe('filteredHistTemplate with inputType="date"', () => {
    it('renders inputs with type="date"', () => {
      const context = createDateContext(jest.fn(), [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });

      const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
      const maxInput = node.querySelector(`.${cssClass('histogram-max-input')}`) as HTMLInputElement;

      expect(minInput.type).toBe('date');
      expect(maxInput.type).toBe('date');
    });

    it('does not include step="any" attribute for date inputs', () => {
      const context = createDateContext(jest.fn(), [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });

      const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
      expect(minInput.hasAttribute('step')).toBe(false);
    });

    it('renders input values as YYYY-MM-DD strings, not timestamps', () => {
      const context = createDateContext(jest.fn(), [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });

      const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
      const maxInput = node.querySelector(`.${cssClass('histogram-max-input')}`) as HTMLInputElement;

      expect(minInput.value).toBe('2020-01-01');
      expect(maxInput.value).toBe('2020-12-31');
      // Confirm they are NOT raw timestamps
      expect(minInput.value).not.toBe(String(MIN_DATE));
      expect(maxInput.value).not.toBe(String(MAX_DATE));
    });
  });

  describe('initFilter with date inputs', () => {
    it('calls setFilter with correct timestamps when a date string is entered in min input', () => {
      const setFilter = jest.fn();
      const context = createDateContext(setFilter, [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });
      initFilter(node, context);

      const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
      minInput.value = '2020-03-15';
      minInput.dispatchEvent(new Event('change'));

      expect(setFilter).toHaveBeenCalled();
      const [, minValue] = getLastFilterCall(setFilter);
      expect(minValue).toBe(new Date(2020, 2, 15).getTime());
    });

    it('calls setFilter with correct timestamps when a date string is entered in max input', () => {
      const setFilter = jest.fn();
      const context = createDateContext(setFilter, [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });
      initFilter(node, context);

      const maxInput = node.querySelector(`.${cssClass('histogram-max-input')}`) as HTMLInputElement;
      maxInput.value = '2020-09-01';
      maxInput.dispatchEvent(new Event('change'));

      expect(setFilter).toHaveBeenCalled();
      const [, , maxValue] = getLastFilterCall(setFilter);
      expect(maxValue).toBe(new Date(2020, 8, 1).getTime());
    });

    it('clamps min input value to domain minimum', () => {
      const setFilter = jest.fn();
      const context = createDateContext(setFilter, [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });
      initFilter(node, context);

      const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
      // Enter a date before the domain start
      minInput.value = '2019-01-01';
      minInput.dispatchEvent(new Event('change'));

      const [, minValue] = getLastFilterCall(setFilter);
      expect(minValue).toBe(MIN_DATE);
    });

    it('clamps max input value to domain maximum', () => {
      const setFilter = jest.fn();
      const context = createDateContext(setFilter, [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });
      initFilter(node, context);

      const maxInput = node.querySelector(`.${cssClass('histogram-max-input')}`) as HTMLInputElement;
      // Enter a date after domain end
      maxInput.value = '2022-01-01';
      maxInput.dispatchEvent(new Event('change'));

      const [, , maxValue] = getLastFilterCall(setFilter);
      expect(maxValue).toBe(MAX_DATE);
    });

    it('does not call setFilter and restores input when empty string is entered', () => {
      const setFilter = jest.fn();
      const context = createDateContext(setFilter, [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });
      initFilter(node, context);

      const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
      minInput.value = '';
      minInput.dispatchEvent(new Event('change'));

      expect(setFilter).not.toHaveBeenCalled();
      // Input should be restored to the current min value
      expect(minInput.value).toBe('2020-01-01');
    });

    it('updates input value from drag handle (via updateMin callback)', () => {
      const setFilter = jest.fn();
      const context = createDateContext(setFilter, [MIN_DATE, MAX_DATE]);
      const node = document.createElement('div');
      node.innerHTML = filteredHistTemplate(context, {
        filterMissing: false,
        filterMin: MIN_DATE,
        filterMax: MAX_DATE,
      });
      Object.defineProperty(node, 'clientWidth', { value: 100, configurable: true });

      const updateFilter = initFilter(node, context);

      // Simulate an external update (e.g., histogram re-render resetting the filter)
      const newMin = new Date(2020, 5, 1).getTime();
      updateFilter(0, { filterMissing: false, filterMin: newMin, filterMax: MAX_DATE });

      const minInput = node.querySelector(`.${cssClass('histogram-min-input')}`) as HTMLInputElement;
      expect(minInput.value).toBe('2020-06-01');
    });
  });
});
