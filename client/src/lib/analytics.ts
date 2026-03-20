import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

export function logScreenView(screenName: string): void {
  if (!analytics) return;
  logEvent(analytics, 'screen_view' as string, { screen_name: screenName });
}

export function logGameEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}
