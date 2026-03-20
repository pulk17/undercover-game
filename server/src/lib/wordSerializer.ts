import type { WordPair } from '@undercover/shared';

/** Canonical DB storage format (snake_case) */
export interface SerializedWordPair {
  id: string;
  word_a: string;
  word_b: string;
  category: string;
  difficulty: string;
  language: string;
  region: string;
  age_group: string;
}

export class WordSerializer {
  /**
   * Format a WordPair back to the canonical DB storage format (snake_case fields).
   */
  static serialize(pair: WordPair): SerializedWordPair {
    return {
      id: pair.id,
      word_a: pair.wordA,
      word_b: pair.wordB,
      category: pair.category,
      difficulty: pair.difficulty,
      language: pair.language,
      region: pair.region,
      age_group: pair.ageGroup,
    };
  }
}
