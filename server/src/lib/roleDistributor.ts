import type { Role, GameMode, WordPair } from '@undercover/shared';

export interface RoleAssignment {
  playerId: string;
  role: Role;
  word: string | null;
}

/** Standard distribution table: N → [civilians, undercovers, mr_whites] */
const DISTRIBUTION: Record<number, [number, number, number]> = {
  3:  [2, 1, 0],
  4:  [3, 1, 0],
  5:  [3, 1, 1],
  6:  [4, 1, 1],
  7:  [5, 1, 1],
  8:  [5, 2, 1],
  9:  [6, 2, 1],
  10: [7, 2, 1],
  11: [7, 3, 1],
  12: [8, 3, 1],
};

const MODE_PLAYER_LIMITS: Record<GameMode, { min: number; max: number }> = {
  classic: { min: 3, max: 12 },
  speed_round: { min: 4, max: 12 },
  team_mode: { min: 6, max: 12 },
  secret_alliance: { min: 5, max: 10 },
  double_agent: { min: 4, max: 8 },
  reverse_mode: { min: 4, max: 10 },
  mr_white_army: { min: 5, max: 12 },
  tournament: { min: 3, max: 12 },
};

/** Fisher-Yates in-place shuffle */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class RoleDistributor {
  static validateConfiguration(
    playerCount: number,
    mode: GameMode,
    detectiveEnabled: boolean,
  ): string | null {
    if (mode === 'team_mode') {
      return 'Team mode is not implemented yet';
    }

    const limits = MODE_PLAYER_LIMITS[mode];
    if (playerCount < limits.min || playerCount > limits.max) {
      return `${mode.replace(/_/g, ' ')} requires ${limits.min}-${limits.max} players`;
    }

    if (detectiveEnabled && playerCount < 4) {
      return 'Detective mode requires at least 4 players';
    }

    return null;
  }

  /**
   * Distribute roles to players.
   * Applies special mode overrides, then detective designation if enabled.
   */
  static distribute(
    playerIds: string[],
    mode: GameMode,
    detectiveEnabled: boolean,
    wordPair: WordPair,
  ): RoleAssignment[] {
    const n = playerIds.length;

    // Build the roles array based on mode
    const roles: Role[] = RoleDistributor.buildRoles(n, mode);

    // Shuffle player IDs for uniform random assignment
    const shuffledPlayers = shuffle([...playerIds]);

    // Assign roles
    const assignments: RoleAssignment[] = shuffledPlayers.map((playerId, i) => {
      const role = roles[i];
      const word = RoleDistributor.wordForRole(role, wordPair);
      return { playerId, role, word };
    });

    // Detective designation: secretly mark one civilian as detective
    if (detectiveEnabled && n >= 4) {
      const civilianIndices = assignments
        .map((a, i) => (a.role === 'civilian' ? i : -1))
        .filter((i) => i !== -1);

      if (civilianIndices.length > 0) {
        const pick = civilianIndices[Math.floor(Math.random() * civilianIndices.length)];
        assignments[pick] = {
          ...assignments[pick],
          role: 'detective',
        };
      }
    }

    return assignments;
  }

  /** Build the ordered roles array for N players given the game mode. */
  private static buildRoles(n: number, mode: GameMode): Role[] {
    switch (mode) {
      case 'double_agent':
        return RoleDistributor.buildDoubleAgentRoles(n);
      case 'secret_alliance':
        return RoleDistributor.buildDoubleAgentRoles(n);
      case 'mr_white_army':
        return RoleDistributor.buildMrWhiteArmyRoles(n);
      case 'reverse_mode':
        return RoleDistributor.buildReverseModeRoles(n);
      default:
        return RoleDistributor.buildStandardRoles(n);
    }
  }

  /** Standard distribution from the table. */
  private static buildStandardRoles(n: number): Role[] {
    const dist = DISTRIBUTION[n];
    if (!dist) {
      throw new Error(`No distribution defined for ${n} players`);
    }
    const [civilians, undercovers, mrWhites] = dist;
    return [
      ...Array<Role>(civilians).fill('civilian'),
      ...Array<Role>(undercovers).fill('undercover'),
      ...Array<Role>(mrWhites).fill('mr_white'),
    ];
  }

  /**
   * Double Agent: 2 undercovers, no Mr. White.
   * Remaining players are civilians.
   */
  private static buildDoubleAgentRoles(n: number): Role[] {
    const undercovers = 2;
    const civilians = n - undercovers;
    return [
      ...Array<Role>(civilians).fill('civilian'),
      ...Array<Role>(undercovers).fill('undercover'),
    ];
  }

  /**
   * Mr. White Army: 30–40% Mr. White, no undercovers.
   * Remaining players are civilians.
   */
  private static buildMrWhiteArmyRoles(n: number): Role[] {
    // Use 35% as the midpoint, clamped to at least 1
    const mrWhiteCount = Math.max(1, Math.round(n * 0.35));
    const civilians = n - mrWhiteCount;
    return [
      ...Array<Role>(civilians).fill('civilian'),
      ...Array<Role>(mrWhiteCount).fill('mr_white'),
    ];
  }

  /**
   * Reverse Mode: undercover majority (flip civilian/undercover counts).
   * Mr. White count stays the same as standard.
   */
  private static buildReverseModeRoles(n: number): Role[] {
    const dist = DISTRIBUTION[n];
    if (!dist) {
      throw new Error(`No distribution defined for ${n} players`);
    }
    const [civilians, undercovers, mrWhites] = dist;
    // Flip civilian and undercover counts
    return [
      ...Array<Role>(undercovers).fill('civilian'),
      ...Array<Role>(civilians).fill('undercover'),
      ...Array<Role>(mrWhites).fill('mr_white'),
    ];
  }

  /** Map a role to the word it receives. */
  private static wordForRole(role: Role, wordPair: WordPair): string | null {
    switch (role) {
      case 'civilian':
      case 'detective':
        return wordPair.wordA;
      case 'undercover':
        return wordPair.wordB;
      case 'mr_white':
        return null;
    }
  }
}
