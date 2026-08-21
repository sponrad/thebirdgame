/** Mobile chrome helpers: fullscreen, safe-area, audio unlock nudges. */

import { audioManager } from '../audio/AudioManager';

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const ZERO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function parseCssPx(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Read resolved safe-area via a probe element (WebKit often won't resolve env() through custom props). */
function measureProbeInsets(): SafeAreaInsets {
  const probe = document.getElementById('safe-area-probe');
  if (!probe) return { ...ZERO_INSETS };
  const style = getComputedStyle(probe);
  return {
    top: parseCssPx(style.paddingTop),
    right: parseCssPx(style.paddingRight),
    bottom: parseCssPx(style.paddingBottom),
    left: parseCssPx(style.paddingLeft),
  };
}

function insetsSum(s: SafeAreaInsets): number {
  return s.top + s.right + s.bottom + s.left;
}

/**
 * When WebKit reports 0 but the webview is edge-to-edge (standalone / landscape),
 * approximate cutouts from aspect ratio. Safari portrait usually has real chrome
 * covering the notch, so we skip that case.
 */
function iphoneCutoutFallback(): SafeAreaInsets {
  if (!/iPhone/i.test(navigator.userAgent)) return { ...ZERO_INSETS };

  const w = window.innerWidth;
  const h = window.innerHeight;
  const shortSide = Math.min(w, h);
  const longSide = Math.max(w, h);
  // Pre-notch ≈ 16:9 (1.78); notched / Dynamic Island ≈ 19.5:9+ (≥ ~1.9).
  if (longSide / shortSide < 1.9) return { ...ZERO_INSETS };

  const landscape = w > h;
  const standalone = isStandaloneDisplay();
  // In Safari portrait the browser chrome already clears the notch — don't double-pad.
  if (!landscape && !standalone) return { ...ZERO_INSETS };

  if (landscape) {
    const side = Math.round(Math.min(59, Math.max(44, shortSide * 0.12)));
    const home = Math.round(Math.min(24, Math.max(16, shortSide * 0.055)));
    const angle =
      screen.orientation?.angle ??
      (window as Window & { orientation?: number }).orientation ??
      0;
    // 90°: notch on the left; -90° / 270°: notch on the right.
    const notchOnLeft = angle === 90;
    return {
      top: 0,
      bottom: home,
      left: notchOnLeft ? side : 0,
      right: notchOnLeft ? 0 : side,
    };
  }

  return {
    top: Math.round(Math.min(59, Math.max(47, shortSide * 0.12))),
    bottom: Math.round(Math.min(34, Math.max(21, shortSide * 0.085))),
    left: 0,
    right: 0,
  };
}

/** Effective insets: probe first, then iPhone fallback when env() wrongly reports 0. */
export function getSafeAreaInsets(): SafeAreaInsets {
  const measured = measureProbeInsets();
  if (insetsSum(measured) > 0) return measured;
  return iphoneCutoutFallback();
}

/** True when any inset is present (notch, Dynamic Island, home indicator, etc.). */
export function hasDisplayCutout(): boolean {
  return insetsSum(getSafeAreaInsets()) > 0;
}

/**
 * Keep the game canvas inside the safe rectangle. CSS env() padding is the
 * baseline; JS overrides when WebKit reports 0 but a cutout is still present.
 */
export function applySafeAreaShell(): void {
  const shell = document.getElementById('game-shell');
  if (!shell) return;
  const s = getSafeAreaInsets();
  shell.style.paddingTop = `${s.top}px`;
  shell.style.paddingRight = `${s.right}px`;
  shell.style.paddingBottom = `${s.bottom}px`;
  shell.style.paddingLeft = `${s.left}px`;
}

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
  applySafeAreaShell();

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
      applySafeAreaShell();
    })();
  };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
}
