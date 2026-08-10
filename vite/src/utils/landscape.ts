/** Prefer landscape on mobile; show rotate overlay when stuck in portrait. */

function isPortrait(): boolean {
  if (window.matchMedia?.('(orientation: portrait)').matches) return true;
  if (window.matchMedia?.('(orientation: landscape)').matches) return false;
  return window.innerHeight > window.innerWidth;
}

function isCoarsePointerMobile(): boolean {
  if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function setupLandscapeLock(): void {
  const overlay = document.getElementById('rotate-overlay');

  const syncOverlay = (): void => {
    if (!overlay) return;
    const show = isCoarsePointerMobile() && isPortrait();
    overlay.classList.toggle('visible', show);
  };

  const tryLock = async (): Promise<void> => {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (mode: string) => Promise<void>;
    };
    if (typeof orientation?.lock !== 'function') return;
    try {
      await orientation.lock('landscape');
    } catch {
      // Browsers often require fullscreen / installed PWA; overlay covers the rest.
    }
  };

  syncOverlay();
  window.addEventListener('resize', syncOverlay);
  window.addEventListener('orientationchange', syncOverlay);
  screen.orientation?.addEventListener?.('change', syncOverlay);

  // Orientation lock usually needs a user gesture.
  const onFirstGesture = (): void => {
    void tryLock();
  };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true });
}
