import fc from 'fast-check';

describe('smoke tests', () => {
  it('fast-check is wired up', () => {
    fc.assert(fc.property(fc.integer(), (n) => typeof n === 'number'));
  });

  it('basic arithmetic works', () => {
    expect(1 + 1).toBe(2);
  });
});
