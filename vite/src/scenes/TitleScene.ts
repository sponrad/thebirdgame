import {
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  Assets,
} from 'pixi.js';
import type { Application } from 'pixi.js';
import { Globals } from '../game/Globals';
import { setSound, setLowPowerMode, setAntialias } from '../utils/storage';
import { audioManager } from '../audio/AudioManager';
import { canFullscreen, isFullscreen, toggleFullscreen, needsHomeScreenFullscreen, isCoarsePointerMobile } from '../utils/landscape';
import { addButtonPressJuice } from '../game/Juice';

const TITLE_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 52,
  fill: 0x111111,
  fontWeight: 'bold',
  letterSpacing: 1,
  // round joins: miter spikes look like "horns" on sharp letters (M).
  stroke: { color: 0xffffff, width: 6, join: 'round' },
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 22,
  fill: 0xffffff,
  fontWeight: 'bold',
  dropShadow: {
    color: 0x000000,
    alpha: 0.55,
    blur: 4,
    distance: 2,
    angle: Math.PI / 3,
  },
});

const START_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 28,
  fill: 0x111111,
  fontWeight: 'bold',
});

const SECONDARY_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 20,
  fill: 0x222222,
});

const SOUND_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 18,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
  stroke: { color: 0xffffff, width: 4, join: 'round' },
});

const TAP_PROMPT_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 22,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
  stroke: { color: 0xffffff, width: 4, join: 'round' },
});

const TIP_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 14,
  fill: 0x1a1a1a,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 280,
  stroke: { color: 0xffffff, width: 3, join: 'round' },
});

function makeButton(
  label: string,
  labelStyle: TextStyle,
  width: number,
  height: number
): Container {
  const btn = new Container();
  btn.eventMode = 'static';
  btn.cursor = 'pointer';

  const bg = new Graphics();
  bg.roundRect(-width / 2, -height / 2, width, height, 6).fill({ color: 0xffffff });
  bg.stroke({ color: 0xdddddd, width: 1, alpha: 0.9 });
  btn.addChild(bg);

  const text = new Text({ text: label, style: labelStyle });
  text.anchor.set(0.5);
  btn.addChild(text);
  addButtonPressJuice(btn);
  return btn;
}

function makeCheckRow(label: string): {
  row: Container;
  bg: Graphics;
  mark: Graphics;
} {
  const row = new Container();
  row.eventMode = 'static';
  row.cursor = 'pointer';

  const bg = new Graphics();
  const mark = new Graphics();
  row.addChild(bg);
  row.addChild(mark);

  const text = new Text({ text: label, style: SOUND_LABEL_STYLE });
  text.x = 28;
  text.y = -10;
  row.addChild(text);
  return { row, bg, mark };
}

export class TitleScene extends Container {
  private app: Application;
  private onPlay: () => void;
  private onLeaderboard: () => void;
  private onHowToPlay: () => void;
  private clipMask!: Graphics;
  private splash!: Sprite;
  private title!: Text;
  private subtitle!: Text;
  private tapPrompt!: Text;
  private startBtn!: Container;
  private leaderboardBtn!: Container;
  private howToPlayBtn!: Container;
  private fullscreenBtn!: Container | null;
  private installTip!: Text;
  private landscapeTip!: Text;
  private soundRow!: Container;
  private soundCheckBg!: Graphics;
  private soundCheckMark!: Graphics;
  private lowPowerRow!: Container;
  private lowPowerCheckBg!: Graphics;
  private lowPowerCheckMark!: Graphics;
  private antialiasRow!: Container;
  private antialiasCheckBg!: Graphics;
  private antialiasCheckMark!: Graphics;
  private menuReady = false;
  private priming = false;

  private constructor(
    app: Application,
    onPlay: () => void,
    onLeaderboard: () => void,
    onHowToPlay: () => void
  ) {
    super();
    this.app = app;
    this.onPlay = onPlay;
    this.onLeaderboard = onLeaderboard;
    this.onHowToPlay = onHowToPlay;
  }

  static async create(
    app: Application,
    onPlay: () => void,
    onLeaderboard: () => void,
    onHowToPlay: () => void
  ): Promise<TitleScene> {
    const scene = new TitleScene(app, onPlay, onLeaderboard, onHowToPlay);
    const splashTexture = await Assets.load<Texture>('/sprites/icon-swooping-bird.png');
    scene.build(splashTexture);
    return scene;
  }

  private build(splashTexture: Texture): void {
    this.clipMask = new Graphics();
    this.addChild(this.clipMask);
    this.mask = this.clipMask;

    this.splash = new Sprite(splashTexture);
    this.splash.anchor.set(0.5);
    this.addChild(this.splash);

    this.title = new Text({ text: 'THE BIRD GAME', style: TITLE_STYLE });
    this.title.anchor.set(0.5);
    this.addChild(this.title);

    this.subtitle = new Text({ text: 'Vista Spa Club', style: SUBTITLE_STYLE });
    this.subtitle.anchor.set(0.5);
    this.addChild(this.subtitle);

    this.tapPrompt = new Text({ text: 'Tap to continue', style: TAP_PROMPT_STYLE });
    this.tapPrompt.anchor.set(0.5);
    this.addChild(this.tapPrompt);

    this.startBtn = makeButton('START', START_LABEL_STYLE, 220, 56);
    this.startBtn.on('pointerdown', () => this.onPlay());
    this.addChild(this.startBtn);

    this.leaderboardBtn = makeButton('Leaderboard', SECONDARY_LABEL_STYLE, 180, 42);
    this.leaderboardBtn.alpha = 0.85;
    this.leaderboardBtn.on('pointerdown', () => this.onLeaderboard());
    this.addChild(this.leaderboardBtn);

    this.howToPlayBtn = makeButton('How to Play', SECONDARY_LABEL_STYLE, 180, 42);
    this.howToPlayBtn.alpha = 0.85;
    this.howToPlayBtn.on('pointerdown', () => this.onHowToPlay());
    this.addChild(this.howToPlayBtn);

    this.fullscreenBtn = null;
    if (canFullscreen()) {
      this.fullscreenBtn = makeButton('Fullscreen', SECONDARY_LABEL_STYLE, 180, 42);
      this.fullscreenBtn.alpha = 0.85;
      this.fullscreenBtn.on('pointerdown', () => {
        void (async () => {
          await toggleFullscreen();
          this.redrawFullscreenLabel();
        })();
      });
      this.addChild(this.fullscreenBtn);
      document.addEventListener('fullscreenchange', this.onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    } else if (needsHomeScreenFullscreen()) {
      // iPhone Safari/Brave: Apple doesn't expose Fullscreen API — Home Screen is the path.
      this.fullscreenBtn = makeButton('Add to Home Screen', SECONDARY_LABEL_STYLE, 220, 42);
      this.fullscreenBtn.alpha = 0.85;
      this.fullscreenBtn.on('pointerdown', () => {
        this.installTip.visible = !this.installTip.visible;
        this.updateLayout();
      });
      this.addChild(this.fullscreenBtn);
    }

    this.installTip = new Text({
      text: 'Share → Add to Home Screen\nOpens fullscreen like an app',
      style: TIP_STYLE,
    });
    this.installTip.anchor.set(0.5);
    this.installTip.visible = false;
    this.addChild(this.installTip);

    this.landscapeTip = new Text({
      text: 'Best played in landscape',
      style: TIP_STYLE,
    });
    this.landscapeTip.anchor.set(0.5);
    this.landscapeTip.visible = false;
    this.addChild(this.landscapeTip);

    const sound = makeCheckRow('Sound');
    this.soundRow = sound.row;
    this.soundCheckBg = sound.bg;
    this.soundCheckMark = sound.mark;
    this.soundRow.on('pointerdown', this.toggleSound, this);
    this.addChild(this.soundRow);

    const lowPower = makeCheckRow('Low power mode');
    this.lowPowerRow = lowPower.row;
    this.lowPowerCheckBg = lowPower.bg;
    this.lowPowerCheckMark = lowPower.mark;
    this.lowPowerRow.on('pointerdown', this.toggleLowPower, this);
    this.addChild(this.lowPowerRow);

    const antialias = makeCheckRow('Antialiasing');
    this.antialiasRow = antialias.row;
    this.antialiasCheckBg = antialias.bg;
    this.antialiasCheckMark = antialias.mark;
    this.antialiasRow.on('pointerdown', this.toggleAntialias, this);
    this.addChild(this.antialiasRow);

    this.redrawSoundCheck();
    this.redrawLowPowerCheck();
    this.redrawAntialiasCheck();
    this.updateLayout();

    // Desktop may already be primed after init; mobile needs a gesture first.
    if (audioManager.isReady()) {
      this.showMenu();
    } else {
      this.showTapToEnable();
    }
  }

  private showTapToEnable(): void {
    this.menuReady = false;
    this.startBtn.visible = false;
    this.leaderboardBtn.visible = false;
    this.howToPlayBtn.visible = false;
    if (this.fullscreenBtn) this.fullscreenBtn.visible = false;
    this.installTip.visible = false;
    this.soundRow.visible = false;
    this.lowPowerRow.visible = false;
    this.antialiasRow.visible = false;
    this.tapPrompt.visible = true;
    this.tapPrompt.text = 'Tap to continue';

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', this.onFirstTap, this);
  }

  private onFirstTap = (): void => {
    if (this.menuReady || this.priming) return;
    this.priming = true;
    this.off('pointerdown', this.onFirstTap, this);
    this.cursor = 'default';
    this.tapPrompt.text = 'Loading…';

    void (async () => {
      try {
        await audioManager.whenReady();
      } finally {
        this.priming = false;
        this.showMenu();
      }
    })();
  };

  private showMenu(): void {
    this.menuReady = true;
    this.eventMode = 'passive';
    this.cursor = 'default';
    this.tapPrompt.visible = false;
    this.startBtn.visible = true;
    this.leaderboardBtn.visible = true;
    this.howToPlayBtn.visible = true;
    if (this.fullscreenBtn) {
      this.fullscreenBtn.visible = true;
      this.redrawFullscreenLabel();
    }
    this.soundRow.visible = true;
    this.lowPowerRow.visible = true;
    this.antialiasRow.visible = true;
    this.updateLayout();
  }

  private onFullscreenChange = (): void => {
    this.redrawFullscreenLabel();
  };

  private redrawFullscreenLabel(): void {
    if (!this.fullscreenBtn) return;
    const label = this.fullscreenBtn.children.find((c) => c instanceof Text) as Text | undefined;
    if (label) label.text = isFullscreen() ? 'Exit Fullscreen' : 'Fullscreen';
  }

  private redrawSoundCheck(): void {
    this.drawCheck(this.soundCheckBg, this.soundCheckMark, Globals.sound);
  }

  private redrawLowPowerCheck(): void {
    this.drawCheck(this.lowPowerCheckBg, this.lowPowerCheckMark, Globals.lowPowerMode);
  }

  private redrawAntialiasCheck(): void {
    this.drawCheck(this.antialiasCheckBg, this.antialiasCheckMark, Globals.antialias);
  }

  private drawCheck(bg: Graphics, mark: Graphics, on: boolean): void {
    bg.clear();
    bg.roundRect(-10, -10, 20, 20, 3).fill({ color: 0xffffff });
    bg.stroke({ color: 0x333333, width: 1.5 });

    mark.clear();
    if (on) {
      mark.moveTo(-5, 0);
      mark.lineTo(-1, 5);
      mark.lineTo(6, -5);
      mark.stroke({ color: 0x111111, width: 2.5, cap: 'round', join: 'round' });
    }
  }

  private toggleSound(): void {
    void audioManager.whenReady();
    Globals.sound = !Globals.sound;
    setSound(Globals.sound);
    this.redrawSoundCheck();
  }

  private toggleLowPower(): void {
    Globals.lowPowerMode = !Globals.lowPowerMode;
    setLowPowerMode(Globals.lowPowerMode);
    this.redrawLowPowerCheck();
    // Resolution / GPU powerPreference need a fresh WebGL context.
    window.location.reload();
  }

  private toggleAntialias(): void {
    Globals.antialias = !Globals.antialias;
    setAntialias(Globals.antialias);
    this.redrawAntialiasCheck();
    // MSAA is fixed at context creation.
    window.location.reload();
  }

  updateLayout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    // Phones in landscape (and other short viewports): keep checks on a bottom row.
    const compact = h < 520;

    this.hitArea = this.app.screen;

    this.clipMask.clear();
    this.clipMask.rect(0, 0, w, h).fill({ color: 0xffffff });

    const tw = this.splash.texture.width || 1;
    const th = this.splash.texture.height || 1;
    // Cover the screen; crop overflow (same idea as before, works in landscape too).
    const cover = Math.max(w / tw, h / th);
    this.splash.scale.set(cover);
    this.splash.x = w / 2;
    this.splash.y = h / 2;

    this.title.scale.set(Math.min(1.15, Math.max(0.7, w / 900)));
    this.title.x = w / 2;
    this.title.y = compact ? Math.max(32, h * 0.14) : h * 0.38;

    this.subtitle.scale.set(1);
    this.subtitle.x = w / 2;
    this.subtitle.y = this.title.y + (compact ? 40 : 46) * this.title.scale.y;

    const showLandscapeTip = isCoarsePointerMobile() && h > w;
    this.landscapeTip.visible = showLandscapeTip;
    this.landscapeTip.style.wordWrapWidth = Math.min(320, w - 40);
    this.landscapeTip.x = w / 2;
    this.landscapeTip.y = this.subtitle.y + (compact ? 28 : 32);

    const checksReserve = compact ? 56 : 0;
    const menuFloor = h - checksReserve;
    const startGap = compact ? 64 : 58;
    const secondaryGap = compact ? 56 : 50;
    const afterBrand = showLandscapeTip ? this.landscapeTip.y + 28 : this.subtitle.y;
    let menuY = compact
      ? Math.min(afterBrand + 52, menuFloor * 0.4)
      : afterBrand + 70;

    // Keep Start → secondary buttons above the bottom check row.
    if (compact) {
      const secondaryCount = 2 + (this.fullscreenBtn ? 1 : 0);
      const menuBlockH = startGap + secondaryGap * secondaryCount;
      const maxStartY = menuFloor - 24 - menuBlockH;
      if (menuY > maxStartY) menuY = Math.max(afterBrand + 40, maxStartY);
    }

    this.tapPrompt.x = w / 2;
    this.tapPrompt.y = menuY;

    this.startBtn.scale.set(1);
    this.startBtn.x = w / 2;
    this.startBtn.y = menuY;

    this.leaderboardBtn.scale.set(1);
    this.leaderboardBtn.x = w / 2;
    this.leaderboardBtn.y = this.startBtn.y + startGap;

    this.howToPlayBtn.scale.set(1);
    this.howToPlayBtn.x = w / 2;
    this.howToPlayBtn.y = this.leaderboardBtn.y + secondaryGap;

    let y = this.howToPlayBtn.y + secondaryGap;
    if (this.fullscreenBtn) {
      this.fullscreenBtn.scale.set(1);
      this.fullscreenBtn.x = w / 2;
      this.fullscreenBtn.y = y;
      y += secondaryGap;
    }

    this.installTip.style.wordWrapWidth = Math.min(320, w - 40);
    this.installTip.scale.set(1);
    this.installTip.x = w / 2;
    if (this.installTip.visible) {
      // Keep tip above the bottom check row in compact mode.
      this.installTip.y = compact ? Math.min(y + 6, menuFloor - 28) : y + 8;
      if (!compact) y += 48;
    }

    this.layoutCheckRows(w, h, y, compact);
  }

  /** Portrait: stacked under menu. Landscape/short: one row along the bottom. */
  private layoutCheckRows(w: number, h: number, stackY: number, compact: boolean): void {
    const rows = [this.soundRow, this.lowPowerRow, this.antialiasRow];
    for (const row of rows) row.scale.set(1);

    if (!compact) {
      this.soundRow.x = w / 2 - 28;
      this.soundRow.y = stackY + 2;
      this.lowPowerRow.x = w / 2 - 28;
      this.lowPowerRow.y = this.soundRow.y + 34;
      this.antialiasRow.x = w / 2 - 28;
      this.antialiasRow.y = this.lowPowerRow.y + 34;
      return;
    }

    const gap = Math.min(40, Math.max(20, w * 0.045));
    const widths = rows.map((row) => Math.max(1, row.getLocalBounds().width));
    const total = widths.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);
    let x = (w - total) / 2;
    const y = h - 30;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      row.x = x;
      row.y = y;
      x += widths[i]! + gap;
    }
  }

}
