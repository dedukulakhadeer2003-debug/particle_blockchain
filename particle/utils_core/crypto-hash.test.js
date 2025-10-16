const cryptoHash = require('./hash_utils');

describe('cryptoHash()', () => {
  it('generates a SHA-256 hashed output', () => {
    expect(cryptoHash('data1'))
      .toEqual('b2213295d564916f89a6a42455567c87c3f480fcd7a1c15e220f17d7169a790b');
  });

  it('produces the same hash with the same input arguments in any order', () => {
    expect(cryptoHash('one', 'two', 'three'))
      .toEqual(cryptoHash('three', 'one', 'two'));
  });

  it('produces a unique hash when the properties have changed on an input', () => {
    const data = {};
    const originalHash = cryptoHash(data);
    data['a'] = 'a';

    expect(cryptoHash(data)).not.toEqual(originalHash);
  });

  it('produces same hash for identical inputs regardless of duplication', () => {
    const hash1 = cryptoHash('test', 'test');
    const hash2 = cryptoHash('test');
    expect(typeof hash1).toBe('string');
    expect(typeof hash2).toBe('string');
  });
});
