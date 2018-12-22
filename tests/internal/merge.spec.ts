import merge from '../../src/internal/merge';


describe('merge', () => {
  it('empty', () => {
    expect(merge({}, {})).toEqual({});
  });
  it('copy', () => {
    expect(merge({a: 1}, {})).toEqual({a: 1});
    expect(merge({}, {a: 1})).toEqual({a: 1});
    expect(merge({a: 0}, {a: 1})).toEqual({a: 1});
  });
  it('copy multi', () => {
    expect(merge({a: 1, b: 1}, {})).toEqual({a: 1, b: 1});
    expect(merge({}, {a: 1, b: 1})).toEqual({a: 1, b: 1});
    expect(merge({a: 0, b: 1}, {a: 1})).toEqual({a: 1, b: 1});
    expect(merge({a: 1}, {b: 1})).toEqual({a: 1, b: 1});
  });
  it('nested', () => {
    expect(merge({a: {a: 1}}, {})).toEqual({a: {a: 1}});
    expect(merge({a: {a: 1}}, {a: {b: 1}})).toEqual({a: {a: 1, b: 1}});
    expect(merge({a: {a: 0}}, {a: {a: 1}})).toEqual({a: {a: 1}});
    expect(merge({}, {a: {a: 1}})).toEqual({a: {a: 1}});
  });
  it('arr', () => {
    expect(merge({a: []}, {a: [1]})).toEqual({a: [1]});
    expect(merge({}, {a: [1]})).toEqual({a: [1]});
    expect(merge({a: [0]}, {a: [1]})).toEqual({a: [0, 1]});
  });
});
