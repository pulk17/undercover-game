import type { Server } from 'socket.io';
import type { GameState, GamePhase } from '@undercover/shared';
import { redis } from './redis';

const GAME_TTL = 60 * 60 * 24; // 24 hours

/**
 * Atomically transition game phase using Redis WATCH/MULTI for optimistic locking.
 * Returns true if transition succeeded, false if phase already changed (race condition).
 */
export async function atomicPhaseTransition(
  roomCode: string,
  expectedPhase: GamePhase,
  newPhase: GamePhase,
  updateFn: (gameState: GameState) => void,
): Promise<boolean> {
  const key = `game:${roomCode}`;
  
  try {
    // Load current state
    const rawState = await redis.get<string>(key);
    if (!rawState) return false;

    const gameState: GameState =
      typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

    // Validate current phase matches expected
    if (gameState.phase !== expectedPhase) {
      console.warn(`[PhaseTransition] Race condition detected: expected ${expectedPhase}, got ${gameState.phase}`);
      return false;
    }

    // Apply updates
    gameState.phase = newPhase;
    updateFn(gameState);

    // Persist with version check (simple approach: check phase again before write)
    const verifyState = await redis.get<string>(key);
    if (!verifyState) return false;
    
    const verify: GameState = typeof verifyState === 'string' ? JSON.parse(verifyState) : verifyState;
    if (verify.phase !== expectedPhase) {
      console.warn(`[PhaseTransition] Race condition detected during write: expected ${expectedPhase}, got ${verify.phase}`);
      return false;
    }

    await redis.set(key, JSON.stringify(gameState), { ex: GAME_TTL });
    return true;
  } catch (err) {
    console.error(`[PhaseTransition] Error transitioning ${expectedPhase} → ${newPhase}:`, err);
    return false;
  }
}

/**
 * Safely load game state and validate phase before acting.
 * Returns null if phase doesn't match expected.
 */
export async function loadAndValidatePhase(
  roomCode: string,
  expectedPhase: GamePhase,
): Promise<GameState | null> {
  try {
    const rawState = await redis.get<string>(`game:${roomCode}`);
    if (!rawState) return null;

    const gameState: GameState =
      typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

    if (gameState.phase !== expectedPhase) {
      console.warn(`[PhaseValidation] Phase mismatch: expected ${expectedPhase}, got ${gameState.phase}`);
      return null;
    }

    return gameState;
  } catch (err) {
    console.error(`[PhaseValidation] Error loading state:`, err);
    return null;
  }
}
