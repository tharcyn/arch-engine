import { describe, it, expect } from 'vitest';
import pkg from '../../package.json';

describe('package exports map freeze contract', () => {
  it('matches approved exports map', () => {
    expect(pkg.exports).toMatchSnapshot();
  });
});
