import { nanoid } from 'nanoid';
import type { PnPPlayer, PnPSettings, PlayerRole } from '../../../../../shared/types';

/**
 * Cryptographically secure shuffle using Web Crypto API
 * Uses Fisher-Yates algorithm with crypto.getRandomValues()
 */
function cryptoShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  const randomValues = new Uint32Array(a.length);
  crypto.getRandomValues(randomValues);
  
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  
  return a;
}

/**
 * Assigns roles and words to players using cryptographic randomization
 * This ensures fair, unpredictable role distribution
 */
export function assignRoles(
  names: string[],
  wordPair: { civilian: string; undercover: string },
  settings: PnPSettings
): PnPPlayer[] {
  const n = names.length;
  
  // Build role pool
  const roles: PlayerRole[] = [];
  if (settings.includeMrWhite) roles.push('MR_WHITE');
  for (let i = 0; i < settings.undercoverCount; i++) roles.push('UNDERCOVER');
  while (roles.length < n) roles.push('CIVILIAN');
  
  // Cryptographic shuffle
  const shuffledRoles = cryptoShuffle(roles);
  const shuffledNames = cryptoShuffle(names); // also shuffle player order
  
  return shuffledNames.map((name, i) => ({
    id: nanoid(),
    name,
    role: shuffledRoles[i],
    word: shuffledRoles[i] === 'CIVILIAN'
      ? wordPair.civilian
      : shuffledRoles[i] === 'UNDERCOVER'
      ? wordPair.undercover
      : null,
    isAlive: true,
    hasSeenWord: false,
    cluesThisRound: [],
    totalVotesReceived: 0,
  }));
}
