import { Redis } from '@upstash/redis';

/**
 * Redis key schema used in this project:
 *
 *   room:{code}                → JSON(Room)          TTL: 24h  — room metadata
 *   game:{code}                → JSON(GameState)     TTL: 24h  — hot game state
 *   role:{code}:{playerId}     → JSON({role, word})  TTL: 24h  — private role data (never broadcast)
 *   votes:{code}:{round}       → JSON(VoteRecord[])  TTL: 1h   — vote buffer (hidden until reveal)
 *   used_words:{code}          → Set<wordPairId>     TTL: 24h  — anti-repeat word tracking
 *   reconnect:{code}:{playerId}→ "1"                 TTL: 60s  — reconnect reservation slot
 *   host_transfer:{code}       → playerId            TTL: 90s  — host transfer candidate
 *   revote_restore:{code}      → JSON(string[])      TTL: 24h  — original activePlayers during re-vote
 *   self_reveal:{code}         → playerId            TTL: 24h  — Undercover player in self-reveal window
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
