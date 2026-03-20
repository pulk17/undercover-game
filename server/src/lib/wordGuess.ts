function normalizeWordGuess(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

export function isWordGuessCorrect(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeWordGuess(guess);
  const normalizedAnswer = normalizeWordGuess(answer);

  if (!normalizedGuess || !normalizedAnswer) return false;
  if (normalizedGuess === normalizedAnswer) return true;

  const distance = levenshtein(normalizedGuess, normalizedAnswer);
  const tolerance = normalizedAnswer.length >= 8 ? 2 : 1;
  return distance <= tolerance;
}
