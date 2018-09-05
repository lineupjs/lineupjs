import {equalArrays, fixCSS, equal} from '../../src/internal/utils';


describe('equalArrays', () => {
  it('empty', () => {
    expect(equalArrays([], [])).toBe(true);
  });

  it('same instance', () => {
    const a = [1, 2, 3, 5, 6, 7];
    expect(equalArrays(a, a)).toBe(true);
  });

  it('different length', () => {
    expect(equalArrays([1, 2, 3], [1, 2])).toBe(false);
  });

  it('same length different content', () => {
    expect(equalArrays([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it('same length different order', () => {
    expect(equalArrays([1, 2, 3], [1, 3, 2])).toBe(false);
  });

  it('same', () => {
    expect(equalArrays([1, 2, 3], [1, 2, 3])).toBe(true);
  });
});

describe('fixCSS', () => {
  it('same', () => {
    expect(fixCSS('abc')).toBe('abc');
  });

  it('replaced', () => {
    expect(fixCSS('#abc')).toBe('_abc');
    expect(fixCSS('$abc')).toBe('_abc');
    expect(fixCSS('$$abc')).toBe('_abc');
    expect(fixCSS('@abc')).toBe('_abc');
  });
});

describe('equal', () => {
  it('primitive', () => {
    expect(equal(1, 1)).toBe(true);
    expect(equal('a', 'a')).toBe(true);

    expect(equal(1, 2)).toBe(false);
    expect(equal('a', 'b')).toBe(false);
  });

  it('array', () => {
    expect(equal([], [])).toBe(true);
    expect(equal([1, 2], [1, 2])).toBe(true);
    expect(equal([1, 'a'], [1, 'a'])).toBe(true);
    expect(equal(['a'], ['a'])).toBe(true);

    expect(equal([1], [])).toBe(false);
    expect(equal([1], ['a'])).toBe(false);
  });

  it('object', () => {
    expect(equal({}, {})).toBe(true);
    expect(equal({a: 1}, {a: 1})).toBe(true);
    expect(equal({a: {a: 1}}, {a: {a: 1}})).toBe(true);

    expect(equal({}, {a: 1})).toBe(false);
    expect(equal({a: 1}, {a: 2})).toBe(false);
    expect(equal({a: {a: 1}}, {a: {a: 2}})).toBe(false);
  });
});
