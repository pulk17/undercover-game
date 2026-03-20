import type { WordPair, Difficulty } from '@undercover/shared';

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const VALID_AGE_GROUPS = ['all', 'teen', 'adult'] as const;

type AgeGroup = 'all' | 'teen' | 'adult';

/** Raw DB row shape (snake_case) */
export interface RawWordPair {
  id: unknown;
  word_a: unknown;
  word_b: unknown;
  category: unknown;
  difficulty: unknown;
  language: unknown;
  region: unknown;
  age_group: unknown;
  [key: string]: unknown;
}

export type ParseResult =
  | { ok: true; value: WordPair }
  | { ok: false; error: string };

export class WordParser {
  /**
   * Parse a raw DB record into a typed WordPair.
   * Returns a descriptive error for missing or invalid fields.
   */
  static parse(raw: unknown): ParseResult {
    if (raw === null || typeof raw !== 'object') {
      return { ok: false, error: 'Record must be a non-null object' };
    }

    const r = raw as Record<string, unknown>;

    const missing: string[] = [];
    const required = ['id', 'word_a', 'word_b', 'category', 'difficulty', 'language', 'region', 'age_group'];
    for (const field of required) {
      if (r[field] === undefined || r[field] === null || r[field] === '') {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return { ok: false, error: `Missing or empty required fields: ${missing.join(', ')}` };
    }

    if (!VALID_DIFFICULTIES.includes(r.difficulty as Difficulty)) {
      return {
        ok: false,
        error: `Invalid difficulty "${r.difficulty}"; must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
      };
    }

    if (!VALID_AGE_GROUPS.includes(r.age_group as AgeGroup)) {
      return {
        ok: false,
        error: `Invalid age_group "${r.age_group}"; must be one of: ${VALID_AGE_GROUPS.join(', ')}`,
      };
    }

    return {
      ok: true,
      value: {
        id: String(r.id),
        wordA: String(r.word_a),
        wordB: String(r.word_b),
        category: String(r.category),
        difficulty: r.difficulty as Difficulty,
        language: String(r.language),
        region: String(r.region),
        ageGroup: r.age_group as AgeGroup,
      },
    };
  }
}
