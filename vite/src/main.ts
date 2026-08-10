import { Application } from 'pixi.js';
import { Globals, resetForNewGame } from './game/Globals';
import { getSound, getHighScore, setHighScore } from './utils/storage';
import { setupLandscapeLock } from './utils/landscape';
import { audioManager } from './audio/AudioManager';
import { TitleScene } from './scenes/TitleScene';
import { GameOverScene } from './scenes/GameOverScene';
import { SkyScene } from './scenes/SkyScene';

type Scene = TitleScene | GameOverScene | SkyScene;

async function init(): Promise<void> {
  setupLandscapeLock();

  Globals.sound = getSound();
  Globals.highScore = getHighScore();

  const app = new Application();

  await app.init({
    canvas: document.querySelector('#game') as HTMLCanvasElement,
    resizeTo: window,
    backgroundColor: 0x87ceeb,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });

  // Kill browser text-selection / callout gestures on the game canvas.
  const canvas = app.canvas;
  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
  (canvas.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = 'none';
  const blockGesture = (e: Event): void => {
    e.preventDefault();
  };
  canvas.addEventListener('selectstart', blockGesture);
  canvas.addEventListener('gesturestart', blockGesture);
  canvas.addEventListener('contextmenu', blockGesture);

  await audioManager.init();

  const titleScene = await TitleScene.create(app, () => {
    resetForNewGame();
    switchTo(skyScene);
  });

  const gameOverScene = new GameOverScene(app, () => {
    hideGameOverOverlay();
    resetForNewGame();
    skyScene.start();
    currentScene = skyScene;
  });

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
    if (gameOverScene.parent) app.stage.removeChild(gameOverScene);
  }

  function showGameOverOverlay(): void {
    skyScene.freeze();
    gameOverScene.refreshScores();
    if (!gameOverScene.parent) app.stage.addChild(gameOverScene);
    gameOverScene.updateLayout();
  }

  function switchTo(scene: Scene): void {
    hideGameOverOverlay();
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

  window.addEventListener('resize', () => {
    if (skyScene.parent) skyScene.updateLayout();
    if (titleScene.parent) titleScene.updateLayout();
    if (gameOverScene.parent) gameOverScene.updateLayout();
  });
}

init().catch(console.error);
