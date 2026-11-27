/**
 * Utility functions for generating, extracting, and formatting group invite links.
 */

export function extractInviteCode(rawCode?: string): string {
  if (!rawCode) return 'h8k2x9';
  const clean = rawCode.trim();
  if (clean.includes('/join/')) {
    const parts = clean.split('/join/');
    return parts[parts.length - 1].replace(/\/+$/, '');
  }
  if (clean.includes('/')) {
    const parts = clean.split('/');
    return parts[parts.length - 1];
  }
  return clean;
}

export function buildInviteLink(rawCode?: string): string {
  const code = extractInviteCode(rawCode);
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000';
  return `${origin}/?join=${encodeURIComponent(code)}`;
}

export function formatInviteDisplay(rawCode?: string): string {
  const code = extractInviteCode(rawCode);
  const host =
    typeof window !== 'undefined' && window.location?.host
      ? window.location.host
      : 'localhost:3000';
  return `${host}/?join=${code}`;
}

/**
 * Clears any invite parameters (?join=..., ?invite=...) or /join/... paths from the browser URL,
 * replacing the address bar history with the normal base path without reloading the page.
 */
export function clearInviteFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('rabapay_pending_invite');
  } catch {}
  try {
    const url = new URL(window.location.href);
    const hasJoinParam = url.searchParams.has('join') || url.searchParams.has('invite');
    const hasJoinPath = url.pathname.includes('/join/');
    if (hasJoinParam || hasJoinPath) {
      url.searchParams.delete('join');
      url.searchParams.delete('invite');
      let pathname = url.pathname;
      if (hasJoinPath) {
        pathname = '/';
      }
      const search = url.searchParams.toString();
      const cleanUrl = `${pathname}${search ? `?${search}` : ''}${url.hash || ''}`;
      window.history.replaceState({}, document.title, cleanUrl || '/');
    }
  } catch {
    // ignore
  }
}
