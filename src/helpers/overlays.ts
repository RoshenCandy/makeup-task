import type { BrowserContext } from '@playwright/test';
import type { GlobalStore } from '../interfaces/global-store';

/**
 * Seed consent cookie + reward tooltip flag before page scripts run.
 * Call once per BrowserContext (via fixture).
 *
 * CookieBanner «Погоджуюсь» → `accepted=true`
 * Language → `lang=uk`
 * Rewards tooltip close → `localStorage.global-store.state.rewardModalWasShown`
 */
export async function seedDismissedOverlays(context: BrowserContext): Promise<void> {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;

  await context.addCookies([
    siteCookie('accepted', 'true', expires),
    siteCookie('lang', 'uk', expires),
  ]);

  await context.addInitScript(() => {
    const storageKey = 'global-store';
    const raw = window.localStorage.getItem(storageKey);
    const parsed: GlobalStore = raw ? (JSON.parse(raw) as GlobalStore) : {};

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...parsed,
        version: parsed.version ?? 0,
        state: { ...parsed.state, rewardModalWasShown: true },
      }),
    );
  });
}

function siteCookie(name: string, value: string, expires: number) {
  return {
    name,
    value,
    domain: 'makeup.com.ua',
    path: '/',
    expires,
    httpOnly: false,
    secure: true,
    sameSite: 'Lax' as const,
  };
}
