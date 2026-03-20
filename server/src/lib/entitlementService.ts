import { adminFirestore } from './firebase';
import type { GameMode } from '@undercover/shared';

const PREMIUM_MODES: Set<GameMode> = new Set([
  'team_mode',
  'secret_alliance',
  'double_agent',
  'reverse_mode',
  'mr_white_army',
]);

export class EntitlementService {
  /**
   * Check whether the given user (host) is entitled to use the specified game mode.
   * Premium modes require the user's Firestore document to contain 'premium'
   * in the `purchasedPacks` array.
   */
  static async checkPremium(
    uid: string,
    mode: GameMode,
  ): Promise<{ entitled: boolean }> {
    // Non-premium modes are always allowed
    if (!PREMIUM_MODES.has(mode)) {
      return { entitled: true };
    }

    try {
      const doc = await adminFirestore.collection('users').doc(uid).get();
      if (!doc.exists) {
        return { entitled: false };
      }

      const data = doc.data();
      const purchasedPacks: string[] = data?.purchasedPacks ?? [];
      return { entitled: purchasedPacks.includes('premium') };
    } catch {
      // On Firestore error, deny access conservatively
      return { entitled: false };
    }
  }
}
