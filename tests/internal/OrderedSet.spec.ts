import OrderedSet from '../../src/internal/OrderedSet';


describe('OrderedSet', () => {
  it('empty', () => {
    expect(Array.from(new OrderedSet())).toEqual([]);
  });
  it('arr', () => {
    expect(Array.from(new OrderedSet([1, 2, 3]))).toEqual([1, 2, 3]);
    expect(Array.from(new OrderedSet([3, 2, 1]))).toEqual([3, 2, 1]);
  });
  it('arr set', () => {
    expect(Array.from(new OrderedSet([1, 2, 1, 3]))).toEqual([1, 2, 3]);
    expect(Array.from(new OrderedSet([3, 2, 1, 3]))).toEqual([3, 2, 1]);
  });

  it('size', () => {
    const s = new OrderedSet<number>();
    expect(s.size).toBe(0);
    s.add(2);
    expect(s.size).toBe(1);
    s.add(3);
    expect(s.size).toBe(2);
    s.add(2);
    expect(s.size).toBe(2); // set
  });

  it('clear', () => {
    const s = new OrderedSet<number>();
    expect(s.size).toBe(0);
    s.add(2);
    expect(s.size).toBe(1);
    s.clear();
    expect(s.size).toBe(0);
  });

  it('order', () => {
    const s = new OrderedSet<number>();
    s.add(0);
    s.add(2);
    s.add(1);
    s.add(2);
    s.add(5);
    expect(Array.from(s)).toEqual([0, 2, 1, 5]);
    s.delete(2);
    expect(Array.from(s)).toEqual([0, 1, 5]);
  });
});
