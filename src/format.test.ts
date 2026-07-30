import { describe, it, expect } from 'vitest';
import { formatUser } from './format';

describe('formatUser snapshot', () => {
  it('matches snapshot for Alice', () => {
    expect(formatUser('Alice', 30)).toMatchSnapshot();
  });

  it('matches snapshot for Bob', () => {
    expect(formatUser('Bob', 25)).toMatchSnapshot();
  });
});
