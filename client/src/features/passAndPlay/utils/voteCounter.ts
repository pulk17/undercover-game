import type { PnPVote, PnPPlayer } from '../../../../../shared/types';

export interface VoteTallyResult {
  eliminatedPlayerId: string | null;
  voteCount: number;
  wasTie: boolean;
  tiedPlayerIds: string[];
}

/**
 * Tallies votes and determines elimination
 * Returns null eliminatedPlayerId if tie or all abstained
 */
export function tallyVotes(
  votes: PnPVote[],
  alivePlayers: PnPPlayer[]
): VoteTallyResult {
  const voteCounts = new Map<string, number>();
  
  // Count votes (excluding abstentions)
  for (const vote of votes) {
    if (vote.targetId) {
      voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) || 0) + 1);
    }
  }
  
  // Handle all abstentions
  if (voteCounts.size === 0) {
    return {
      eliminatedPlayerId: null,
      voteCount: 0,
      wasTie: false,
      tiedPlayerIds: [],
    };
  }
  
  // Find max votes
  const maxVotes = Math.max(...voteCounts.values());
  const playersWithMaxVotes = Array.from(voteCounts.entries())
    .filter(([_, count]) => count === maxVotes)
    .map(([playerId]) => playerId);
  
  // Check for tie
  if (playersWithMaxVotes.length > 1) {
    return {
      eliminatedPlayerId: null,
      voteCount: maxVotes,
      wasTie: true,
      tiedPlayerIds: playersWithMaxVotes,
    };
  }
  
  return {
    eliminatedPlayerId: playersWithMaxVotes[0],
    voteCount: maxVotes,
    wasTie: false,
    tiedPlayerIds: [],
  };
}

/**
 * Randomly selects one player from tied players
 * Uses crypto.getRandomValues for fairness
 */
export function randomTieBreaker(tiedPlayerIds: string[]): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const index = randomValues[0] % tiedPlayerIds.length;
  return tiedPlayerIds[index];
}
