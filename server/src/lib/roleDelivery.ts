import type { Server } from 'socket.io';
import { redis } from './redis';
import type { RoleAssignment } from './roleDistributor';

const ROLE_TTL = 60 * 60 * 24; // 24 hours in seconds

/**
 * Store each role assignment in Redis and emit `game:role_assigned`
 * to each player's private socket channel.
 */
export async function deliverRoles(
  roomCode: string,
  assignments: RoleAssignment[],
  /** Map of playerId → socketId */
  playerSocketMap: Record<string, string>,
  io: Server,
): Promise<void> {
  await Promise.all(
    assignments.map(async ({ playerId, role, word }) => {
      // Persist to Redis: role:{roomCode}:{playerId}
      const key = `role:${roomCode}:${playerId}`;
      await redis.set(key, JSON.stringify({ role, word }), { ex: ROLE_TTL });

      // Emit privately to the player's socket
      const socketId = playerSocketMap[playerId];
      if (socketId) {
        io.to(socketId).emit('game:role_assigned', { role, word });
      }
    }),
  );
}
