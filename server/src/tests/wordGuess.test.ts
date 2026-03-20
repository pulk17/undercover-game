import { describe, expect, it } from 'vitest';
import { isWordGuessCorrect } from '../lib/wordGuess';

describe('word guess validation', () => {
  it('matches case-insensitively and ignores punctuation', () => {
    expect(isWordGuessCorrect(' New-York! ', 'new york')).toBe(true);
  });

  it('accepts small typos for normal gameplay', () => {
    expect(isWordGuessCorrect('bananna', 'banana')).toBe(true);
    expect(isWordGuessCorrect('air plane', 'airplane')).toBe(true);
  });

  it('rejects unrelated guesses', () => {
    expect(isWordGuessCorrect('coffee', 'banana')).toBe(false);
  });
});
