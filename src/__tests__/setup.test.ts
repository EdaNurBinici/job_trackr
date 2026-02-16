import fc from 'fast-check';

describe('Testing Framework Setup', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('fast-check is working correctly', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });

  test('fast-check can generate strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return s.length >= 0;
      }),
      { numRuns: 100 }
    );
  });
});
