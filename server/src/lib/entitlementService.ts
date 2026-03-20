import type { GameMode } from '@undercover/shared';

export class EntitlementService {
  /**
   * Premium gating is disabled until there is a real purchase flow.
   * Exposed modes in the UI should always be startable.
   */
  static async checkPremium(
    _uid: string,
    _mode: GameMode,
  ): Promise<{ entitled: boolean }> {
    return { entitled: true };
  }
}
