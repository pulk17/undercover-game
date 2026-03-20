import { logger } from './logger';

const MAX_CLUE_LENGTH = 60;
const MAX_GUESS_LENGTH = 100;
const MAX_TITLE_LENGTH = 50;
const MAX_NICKNAME_LENGTH = 12;
const MIN_NICKNAME_LENGTH = 1;

/**
 * Sanitize HTML tags and trim whitespace
 */
export function sanitizeText(input: string): string {
  return String(input ?? '').replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate and sanitize clue input
 */
export function validateClue(clue: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(clue).slice(0, MAX_CLUE_LENGTH);
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Clue cannot be empty' };
  }
  
  if (sanitized.length > MAX_CLUE_LENGTH) {
    return { valid: false, sanitized, error: `Clue too long (max ${MAX_CLUE_LENGTH} chars)` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize word guess
 */
export function validateGuess(guess: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(guess).slice(0, MAX_GUESS_LENGTH);
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Guess cannot be empty' };
  }
  
  if (sanitized.length > MAX_GUESS_LENGTH) {
    return { valid: false, sanitized, error: `Guess too long (max ${MAX_GUESS_LENGTH} chars)` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize title vote
 */
export function validateTitle(title: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(title).slice(0, MAX_TITLE_LENGTH);
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Title cannot be empty' };
  }
  
  if (sanitized.length > MAX_TITLE_LENGTH) {
    return { valid: false, sanitized, error: `Title too long (max ${MAX_TITLE_LENGTH} chars)` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize nickname
 */
export function validateNickname(nickname: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(nickname).slice(0, MAX_NICKNAME_LENGTH);
  
  if (!sanitized || sanitized.length < MIN_NICKNAME_LENGTH) {
    return { valid: false, sanitized, error: `Nickname must be ${MIN_NICKNAME_LENGTH}-${MAX_NICKNAME_LENGTH} chars` };
  }
  
  if (sanitized.length > MAX_NICKNAME_LENGTH) {
    return { valid: false, sanitized, error: `Nickname too long (max ${MAX_NICKNAME_LENGTH} chars)` };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate room code format
 */
export function validateRoomCode(code: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = String(code ?? '').toUpperCase().trim();
  
  if (normalized.length !== 6) {
    return { valid: false, normalized, error: 'Room code must be 6 characters' };
  }
  
  if (!/^[A-Z2-9]+$/.test(normalized)) {
    return { valid: false, normalized, error: 'Room code contains invalid characters' };
  }
  
  return { valid: true, normalized };
}

/**
 * Validate player count for game start
 */
export function validatePlayerCount(count: number, min: number, max: number): { valid: boolean; error?: string } {
  if (count < min) {
    return { valid: false, error: `Need at least ${min} players to start` };
  }
  
  if (count > max) {
    return { valid: false, error: `Too many players (max ${max})` };
  }
  
  return { valid: true };
}

/**
 * Validate that player is active in game
 */
export function validateActivePlayer(playerId: string, activePlayers: string[]): { valid: boolean; error?: string } {
  if (!activePlayers.includes(playerId)) {
    return { valid: false, error: 'You are not an active player' };
  }
  
  return { valid: true };
}

/**
 * Validate that player is connected
 */
export function validateConnectedPlayer(playerId: string, players: Array<{ id: string; isConnected: boolean }>): { valid: boolean; error?: string } {
  const player = players.find((p) => p.id === playerId);
  
  if (!player) {
    return { valid: false, error: 'Player not found' };
  }
  
  if (!player.isConnected) {
    return { valid: false, error: 'Player is disconnected' };
  }
  
  return { valid: true };
}

/**
 * Log validation failure
 */
export function logValidationError(context: string, error: string, details?: Record<string, unknown>): void {
  logger.warn(`Validation failed: ${context}`, { error, ...details });
}
