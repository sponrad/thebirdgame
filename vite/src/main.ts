import { Application } from 'pixi.js';
import { Globals, resetForNewGame } from './game/Globals';
import { getSound, getMusic, getHighScore, setHighScore, getLowPowerMode, getAntialias } from './utils/storage';
import { isCoarsePointerMobile, setupMobileChrome } from './utils/landscape';
import { audioManager } from './audio/AudioManager';
import { startScoreRun } from './utils/leaderboardApi';
import { TitleScene } from './scenes/TitleScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { SkyScene } from './scenes/SkyScene';

type Scene = TitleScene | GameOverScene | SkyScene;

async function init(): Promise<void> {
  setupMobileChrome();

  Globals.sound = getSound();
  Globals.music = getMusic();
  Globals.highScore = getHighScore();
  Globals.lowPowerMode = getLowPowerMode(isCoarsePointerMobile());
  Globals.antialias = getAntialias(!Globals.lowPowerMode);

  const app = new Application();
  const lowPower = Globals.lowPowerMode;
  // Low power: fewer pixels + efficiency GPU hint. AA is independent.
  const resolution = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 2);

  await app.init({
    canvas: document.querySelector('#game') as HTMLCanvasElement,
    resizeTo: window,
    backgroundColor: 0x87ceeb,
    antialias: Globals.antialias,
    autoDensity: true,
    resolution,
    powerPreference: lowPower ? 'low-power' : 'high-performance',
  });

  // Kill browser text-selection / callout gestures on the game canvas.
  const canvas = app.canvas;
  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
  const canvasCss = canvas.style as CSSStyleDeclaration & {
    webkitUserSelect?: string;
    webkitTouchCallout?: string;
    webkitUserDrag?: string;
  };
  canvasCss.webkitUserSelect = 'none';
  canvasCss.webkitTouchCallout = 'none';
  canvasCss.webkitUserDrag = 'none';
  canvas.setAttribute('draggable', 'false');

  const blockGesture = (e: Event): void => {
    e.preventDefault();
  };
  canvas.addEventListener('selectstart', blockGesture);
  canvas.addEventListener('gesturestart', blockGesture);
  canvas.addEventListener('contextmenu', blockGesture);
  // Non-passive so iOS can't start callout / magnifier / text selection mid-flight.
  canvas.addEventListener('touchstart', blockGesture, { passive: false });
  canvas.addEventListener('touchmove', blockGesture, { passive: false });
  document.addEventListener('gesturestart', blockGesture, { passive: false });
  document.addEventListener('gesturechange', blockGesture, { passive: false });
  document.addEventListener('gestureend', blockGesture, { passive: false });

  await audioManager.init();

  const titleScene = await TitleScene.create(
    app,
    () => {
      resetForNewGame();
      audioManager.setMusicScene('game');
      void startScoreRun();
      switchTo(skyScene);
    },
    () => showLeaderboardOverlay(),
    () => showHowToPlayOverlay()
  );

  const gameOverScene = new GameOverScene(
    app,
    () => {
      hideGameOverOverlay();
      resetForNewGame();
      audioManager.setMusicScene('game');
      void startScoreRun();
      skyScene.start();
      currentScene = skyScene;
    },
    () => showLeaderboardOverlay(),
    () => showHowToPlayOverlay(),
    () => {
      audioManager.setMusicScene('menu');
      switchTo(titleScene);
    }
  );

  const leaderboardScene = new LeaderboardScene(app, () => hideLeaderboardOverlay());
  const howToPlayScene = new HowToPlayScene(app, () => hideHowToPlayOverlay());

  const skyScene = await SkyScene.create(app, () => {
    Globals.inGame = false;
    if (Globals.score > Globals.highScore) {
      Globals.highScore = Globals.score;
      setHighScore(Globals.score);
    } else {
      Globals.highScore = getHighScore();
    }
    showGameOverOverlay();
  });

  let currentScene: Scene = titleScene;
  app.stage.addChild(titleScene);

  function hideGameOverOverlay(): void {
    gameOverScene.hidePrompt();
    if (gameOverScene.parent) app.stage.removeChild(gameOverScene);
  }

  function showGameOverOverlay(): void {
    hideLeaderboardOverlay();
    hideHowToPlayOverlay();
    skyScene.freeze();
    audioManager.setMusicScene('menu');
    gameOverScene.refreshScores();
    if (!gameOverScene.parent) app.stage.addChild(gameOverScene);
    gameOverScene.updateLayout();
    skyScene.bringDebugOverlayToFront();
  }

  function showLeaderboardOverlay(): void {
    hideHowToPlayOverlay();
    if (!leaderboardScene.parent) app.stage.addChild(leaderboardScene);
    leaderboardScene.updateLayout();
    void leaderboardScene.refresh();
  }

  function hideLeaderboardOverlay(): void {
    if (leaderboardScene.parent) app.stage.removeChild(leaderboardScene);
  }

  function showHowToPlayOverlay(): void {
    hideLeaderboardOverlay();
    if (!howToPlayScene.parent) app.stage.addChild(howToPlayScene);
    howToPlayScene.updateLayout();
  }

  function hideHowToPlayOverlay(): void {
    if (howToPlayScene.parent) app.stage.removeChild(howToPlayScene);
  }

  function switchTo(scene: Scene): void {
    hideGameOverOverlay();
    hideLeaderboardOverlay();
    hideHowToPlayOverlay();
    if ('stop' in currentScene && typeof currentScene.stop === 'function') {
      currentScene.stop();
    }
    app.stage.removeChild(currentScene);
    currentScene = scene;
    app.stage.addChild(scene);
    if ('start' in scene && typeof scene.start === 'function') {
      scene.start();
    }
    if ('updateLayout' in scene && typeof scene.updateLayout === 'function') {
      scene.updateLayout();
    }
  }

  const layoutAll = (): void => {
    if (skyScene.parent) skyScene.updateLayout();
    if (titleScene.parent) titleScene.updateLayout();
    if (gameOverScene.parent) gameOverScene.updateLayout();
    if (leaderboardScene.parent) leaderboardScene.updateLayout();
    if (howToPlayScene.parent) howToPlayScene.updateLayout();
  };

  // iOS often settles size after orientationchange; resize alone can miss a frame.
  window.addEventListener('resize', layoutAll);
  window.addEventListener('orientationchange', () => {
    requestAnimationFrame(() => {
      layoutAll();
      window.setTimeout(layoutAll, 150);
    });
  });
  window.visualViewport?.addEventListener('resize', layoutAll);
  app.renderer.on('resize', layoutAll);

  hideBootLoader();
}

function hideBootLoader(): void {
  const loader = document.getElementById('boot-loader');
  if (!loader) return;
  loader.classList.add('hidden');
  loader.setAttribute('aria-busy', 'false');
  window.setTimeout(() => loader.remove(), 400);
}

init().catch((err) => {
  console.error(err);
  const loader = document.getElementById('boot-loader');
  if (loader) {
    const label = loader.querySelector('p');
    if (label) label.textContent = 'Failed to load';
    const spinner = loader.querySelector('.spinner');
    if (spinner) (spinner as HTMLElement).style.animation = 'none';
  }
});
