/** Mobile chrome helpers: fullscreen + audio unlock nudges. */

import { audioManager } from '../audio/AudioManager';

export function isCoarsePointerMobile(): boolean {
  if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function canFullscreen(): boolean {
  if (isStandaloneDisplay()) return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
}

/** iPhone Safari/Brave: no Element.requestFullscreen — Home Screen is the real fullscreen. */
export function needsHomeScreenFullscreen(): boolean {
  if (isStandaloneDisplay()) return false;
  if (canFullscreen()) return false;
  return isCoarsePointerMobile() || /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return isStandaloneDisplay();
}

export function isFullscreen(): boolean {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return !!(document.fullscreenElement || doc.webkitFullscreenElement);
}

export async function requestFullscreen(): Promise<void> {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  if (isFullscreen()) return;
  const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!req) return;
  try {
    await req();
  } catch {
    // iOS Safari often blocks; Add to Home Screen is the reliable path there.
  }
}

export async function exitFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  if (!isFullscreen()) return;
  const exit = document.exitFullscreen?.bind(document) ?? doc.webkitExitFullscreen?.bind(document);
  if (!exit) return;
  try {
    await exit();
  } catch {
    /* ignore */
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (isFullscreen()) await exitFullscreen();
  else await requestFullscreen();
}

/** Optional fullscreen on first tap; keep unlocking audio on every gesture until it sticks. */
export function setupMobileChrome(): void {
  const tryUnlock = (): void => {
    audioManager.unlock();
  };

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
      // Soft nudge only — title also has an explicit Fullscreen button.
      if (isCoarsePointerMobile() && !isStandaloneDisplay()) {
        await requestFullscreen();
      }
      window.scrollTo(0, 1);
    })();
  };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
}
