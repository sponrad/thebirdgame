/** Mobile fullscreen nudge on first gesture (orientation is free). */

function isCoarsePointerMobile(): boolean {
  if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // iOS Safari home-screen
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function tryFullscreen(): Promise<void> {
  const el = document.documentElement;
  if (document.fullscreenElement) return;
  const req =
    el.requestFullscreen?.bind(el) ??
    (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.bind(el);
  if (!req) return;
  try {
    await req();
  } catch {
    // iOS Safari often blocks; Add to Home Screen / standalone is the reliable path.
  }
}

/** Optional fullscreen on first tap; portrait and landscape both allowed. */
export function setupMobileChrome(): void {
  const onFirstGesture = (): void => {
    void (async () => {
      if (isCoarsePointerMobile() && !isStandaloneDisplay()) {
        await tryFullscreen();
      }
      // Nudge mobile browser chrome to collapse when possible.
      window.scrollTo(0, 1);
    })();
  };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true });
}
