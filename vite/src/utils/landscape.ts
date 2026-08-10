/** Landscape preference, fullscreen attempt, and portrait rotate overlay. */

function isPortrait(): boolean {
  if (window.matchMedia?.('(orientation: portrait)').matches) return true;
  if (window.matchMedia?.('(orientation: landscape)').matches) return false;
  return window.innerHeight > window.innerWidth;
}

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

async function tryLandscapeLock(): Promise<void> {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (mode: string) => Promise<void>;
  };
  if (typeof orientation?.lock !== 'function') return;
  try {
    await orientation.lock('landscape');
  } catch {
    // Requires fullscreen / PWA on many browsers.
  }
}

export function setupLandscapeLock(): void {
  const overlay = document.getElementById('rotate-overlay');

  const syncOverlay = (): void => {
    if (!overlay) return;
    const show = isCoarsePointerMobile() && isPortrait();
    overlay.classList.toggle('visible', show);
  };

  syncOverlay();
  window.addEventListener('resize', syncOverlay);
  window.addEventListener('orientationchange', syncOverlay);
  screen.orientation?.addEventListener?.('change', syncOverlay);

  const onFirstGesture = (): void => {
    void (async () => {
      if (isCoarsePointerMobile() && !isStandaloneDisplay()) {
        await tryFullscreen();
      }
      await tryLandscapeLock();
      // Nudge mobile browser chrome to collapse when possible.
      window.scrollTo(0, 1);
    })();
  };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true });
}
