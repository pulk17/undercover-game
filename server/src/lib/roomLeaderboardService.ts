import { createHash } from 'crypto';
import type { GameState, Player, Room, WinFaction } from '@undercover/shared';
import { adminFirestore } from './firebase';

const ROOM_LEADERBOARD_POINTS = {
  surviveRound: 1,
  correctVote: 2,
  winUndercover: 5,
  winMrWhite: 8,
} as const;

const COLLECTION = 'roomLeaderboards';

interface StoredParticipant {
  nickname: string;
  avatarUrl: string | null;
  userId: string | null;
}

interface StoredRoomLeaderboard {
  participantKeys: string[];
  scores: Record<string, number>;
  participants: Record<string, StoredParticipant>;
  gamesPlayed: number;
  updatedAt: number;
}

function normalizeGuestNickname(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getParticipantKey(player: Pick<Player, 'userId' | 'nickname'>): string {
  if (player.userId) {
    return `uid:${player.userId}`;
  }

  return `guest:${normalizeGuestNickname(player.nickname)}`;
}

export function getRoomGroupId(players: Array<Pick<Player, 'userId' | 'nickname'>>): string {
  const joined = players
    .map((player) => getParticipantKey(player))
    .sort()
    .join('|');

  return createHash('sha1').update(joined).digest('hex');
}

async function getLeaderboardDoc(room: Room): Promise<StoredRoomLeaderboard | null> {
  const groupId = getRoomGroupId(room.players);
  const snap = await adminFirestore.collection(COLLECTION).doc(groupId).get();
  if (!snap.exists) {
    return null;
  }

  return snap.data() as StoredRoomLeaderboard;
}

function correctVoterKeys(room: Room, gameState: GameState): Set<string> {
  const eliminatedId = gameState.eliminatedThisRound;
  if (!eliminatedId) {
    return new Set();
  }

  const correctVoterIds = new Set(
    gameState.votes
      .filter((vote) => vote.targetId === eliminatedId)
      .map((vote) => vote.voterId),
  );

  return new Set(
    room.players
      .filter((player) => correctVoterIds.has(player.id))
      .map((player) => getParticipantKey(player)),
  );
}

export async function getRoomLeaderboardScores(room: Room): Promise<Record<string, number>> {
  const leaderboard = await getLeaderboardDoc(room);
  const storedScores = leaderboard?.scores ?? {};

  return Object.fromEntries(
    room.players.map((player) => [player.id, storedScores[getParticipantKey(player)] ?? 0]),
  );
}

export async function awardRoomLeaderboardPoints(
  room: Room,
  gameState: GameState,
): Promise<Record<string, number>> {
  const groupId = getRoomGroupId(room.players);
  const docRef = adminFirestore.collection(COLLECTION).doc(groupId);
  const correctKeys = correctVoterKeys(room, gameState);
  const winner: WinFaction | null = gameState.winner;

  await adminFirestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);
    const current = snap.exists
      ? (snap.data() as StoredRoomLeaderboard)
      : {
          participantKeys: room.players.map((player) => getParticipantKey(player)).sort(),
          scores: {},
          participants: {},
          gamesPlayed: 0,
          updatedAt: Date.now(),
        };

    for (const player of room.players) {
      const participantKey = getParticipantKey(player);
      current.participants[participantKey] = {
        nickname: player.nickname,
        avatarUrl: player.avatarUrl ?? null,
        userId: player.userId,
      };

      current.scores[participantKey] = current.scores[participantKey] ?? 0;

      if (gameState.activePlayers.includes(player.id)) {
        current.scores[participantKey] += ROOM_LEADERBOARD_POINTS.surviveRound;
      }

      if (correctKeys.has(participantKey)) {
        current.scores[participantKey] += ROOM_LEADERBOARD_POINTS.correctVote;
      }

      if (winner === 'undercover' && player.role === 'undercover') {
        current.scores[participantKey] += ROOM_LEADERBOARD_POINTS.winUndercover;
      }

      if (winner === 'mr_white' && player.role === 'mr_white') {
        current.scores[participantKey] += ROOM_LEADERBOARD_POINTS.winMrWhite;
      }
    }

    current.gamesPlayed += 1;
    current.updatedAt = Date.now();

    transaction.set(docRef, current, { merge: true });
  });

  return getRoomLeaderboardScores(room);
}
