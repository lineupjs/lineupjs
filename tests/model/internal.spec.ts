import {unifyParents} from '../../src/model/internal';
import {IGroupParent, IOrderedGroup} from '../../src/model';

function groupGen(name: string, parent?: IGroupParent): IOrderedGroup {
  const r = {
    color: 'gray',
    name,
    order: [],
    parent
  };
  if (parent) {
    parent.subGroups.push(r);
  }
  return r;
}

function parentGen(name: string, parent?: IGroupParent): IGroupParent {
  const r = {
    name,
    color: 'gray',
    parent,
    subGroups: []
  };
  if (parent) {
    parent.subGroups.push(r);
  }
  return r;
}

describe('unifyParents', () => {
  it('[]', () => {
    expect(unifyParents([])).toEqual([]);
  });
  it('single', () => {
    const a = groupGen('a');
    expect(unifyParents([a])).toEqual([a]);
  });
  it('different', () => {
    const a = groupGen('a');
    const b = groupGen('b');
    expect(unifyParents([a, b])).toEqual([a, b]);
  });
  it('common parent', () => {
    const p = parentGen('p');
    const pClone = parentGen('p');
    const a = groupGen('a', p);
    const b = groupGen('b', pClone);
    unifyParents([a, b]);
    expect(a.parent).toBe(b.parent);
    expect(a.parent!.parent).toBeUndefined();
  });
  it('different parent', () => {
    const p = parentGen('p');
    const p2 = parentGen('p2');
    const a = groupGen('a', p);
    const b = groupGen('b', p2);
    unifyParents([a, b]);
    expect(a.parent).not.toBe(b.parent);
  });
  it('different in the middle', () => {
    const p = parentGen('p');
    const pClone = parentGen('p');
    const p2 = parentGen('p2');
    const a = groupGen('a', p);
    const b = groupGen('b', p2);
    const c = groupGen('c', pClone); // same as p
    unifyParents([a, b, c]);
    expect(a.parent).not.toBe(b.parent);
    expect(a.parent).toBe(c.parent);
    expect(b.parent).not.toBe(c.parent);
  });

  it('same - different - separate', () => {
    const r = parentGen('r');
    const rClone = parentGen('r');
    const rClone2 = parentGen('r');

    const p = parentGen('p', r);
    const pClone = parentGen('p', rClone);
    const p2 = parentGen('p2', rClone2);
    const a = groupGen('a', p);
    const b = groupGen('b', p2);
    const c = groupGen('c', pClone);

    // r
    // p  p2
    // ac b
    unifyParents([a, b, c]);
    expect(a.parent!.parent).toBe(b.parent!.parent);
    expect(a.parent!.parent).toBe(c.parent!.parent);

    expect(a.parent).not.toBe(b.parent);
    expect(a.parent).toBe(c.parent);
    expect(b.parent).not.toBe(c.parent);

    const root = a.parent!.parent!;
    expect(root.subGroups).toHaveLength(2);
    expect(a.parent!.subGroups).toHaveLength(2);
    expect(b.parent!.subGroups).toHaveLength(1);
  });
});
