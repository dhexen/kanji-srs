// Guided onboarding tour for brand-new 'user'-role accounts (students).
// Mirrors the double-guard pattern used by lib/help-context.tsx (local flag +
// per-account DB state), but scoped to role 'user' and kept independent so the
// two auto-open behaviors never race or double-fire.

const ONBOARDING_DONE_KEY = 'onboarding_done_v1'

export function isOnboardingDoneLocally(): boolean {
  try { return localStorage.getItem(ONBOARDING_DONE_KEY) === '1' } catch { return false }
}

export function setOnboardingDoneLocally() {
  try { localStorage.setItem(ONBOARDING_DONE_KEY, '1') } catch { /* incognito */ }
}

export type EffectiveRole = 'admin' | 'contributor' | 'user'

/**
 * True only for accounts that have never seen any help/tutorial content AND
 * whose effective role is 'user' — i.e. brand-new students, not existing
 * accounts that already got the old HelpDrawer intro, and not staff.
 *
 * `helpSeenConfirmed` must be true before `helpSeen` can be trusted — right
 * after login, `helpSeen` starts out empty and is only populated once the
 * account's real DB state finishes loading (via syncDown), so treating that
 * transient empty array as "confirmed empty" would flash the tour at
 * existing students on a slow connection. Pass `state.helpSeenLoaded ||
 * state.justSignedUp` (a brand-new signup never went through syncDown, so
 * there's nothing to wait for).
 */
export function isPendingOnboarding(effectiveRole: EffectiveRole, helpSeen: string[], helpSeenConfirmed: boolean): boolean {
  if (effectiveRole !== 'user') return false
  if (!helpSeenConfirmed) return false
  if (helpSeen.length > 0) return false
  if (isOnboardingDoneLocally()) return false
  return true
}
