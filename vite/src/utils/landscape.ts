/** Mobile fullscreen nudge + persistent audio unlock until WebKit allows playback. */

import { audioManager } from '../audio/AudioManager';

function isCoarsePointerMobile(): boolean {
  if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
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

/** Fullscreen on first tap; keep unlocking audio on every gesture until it sticks. */
export function setupMobileChrome(): void {
  const tryUnlock = (): void => {
    audioManager.unlock();
  };

  // Capture phase so we run even if Pixi / canvas stop propagation.
  // Keep listening until unlock succeeds — first tap sometimes races asset load.
  const onGesture = (): void => {
    tryUnlock();
    if (audioManager.isUnlocked()) {
      window.removeEventListener('touchstart', onGesture, true);
      window.removeEventListener('pointerdown', onGesture, true);
    }
  };
  window.addEventListener('touchstart', onGesture, { capture: true, passive: true });
  window.addEventListener('pointerdown', onGesture, { capture: true });

  const onFirstGesture = (): void => {
    tryUnlock();
    void (async () => {
      if (isCoarsePointerMobile() && !isStandaloneDisplay()) {
        await tryFullscreen();
      }
      window.scrollTo(0, 1);
    })();
  };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
}
