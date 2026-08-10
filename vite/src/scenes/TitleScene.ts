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
import { setSound } from '../utils/storage';
import { audioManager } from '../audio/AudioManager';

const TITLE_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 52,
  fill: 0x111111,
  fontWeight: 'bold',
  letterSpacing: 1,
  stroke: { color: 0xffffff, width: 6 },
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 20,
  fill: 0x1a1a1a,
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
});

const TAP_PROMPT_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 22,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
  stroke: { color: 0xffffff, width: 4 },
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
  return btn;
}

export class TitleScene extends Container {
  private app: Application;
  private onPlay: () => void;
  private clipMask!: Graphics;
  private splash!: Sprite;
  private title!: Text;
  private subtitle!: Text;
  private tapPrompt!: Text;
  private startBtn!: Container;
  private leaderboardBtn!: Container;
  private soundRow!: Container;
  private soundCheckBg!: Graphics;
  private soundCheckMark!: Graphics;
  private menuReady = false;
  private priming = false;

  private constructor(app: Application, onPlay: () => void) {
    super();
    this.app = app;
    this.onPlay = onPlay;
  }

  static async create(app: Application, onPlay: () => void): Promise<TitleScene> {
    const scene = new TitleScene(app, onPlay);
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
    this.addChild(this.leaderboardBtn);

    this.soundRow = new Container();
    this.soundRow.eventMode = 'static';
    this.soundRow.cursor = 'pointer';
    this.soundRow.on('pointerdown', this.toggleSound, this);

    this.soundCheckBg = new Graphics();
    this.soundCheckMark = new Graphics();
    this.soundRow.addChild(this.soundCheckBg);
    this.soundRow.addChild(this.soundCheckMark);

    const soundLabel = new Text({ text: 'Sound', style: SOUND_LABEL_STYLE });
    soundLabel.x = 28;
    soundLabel.y = -10;
    this.soundRow.addChild(soundLabel);
    this.addChild(this.soundRow);

    this.redrawSoundCheck();
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
    this.soundRow.visible = false;
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
    this.soundRow.visible = true;
    this.updateLayout();
  }

  private redrawSoundCheck(): void {
    this.soundCheckBg.clear();
    this.soundCheckBg.roundRect(-10, -10, 20, 20, 3).fill({ color: 0xffffff });
    this.soundCheckBg.stroke({ color: 0x333333, width: 1.5 });

    this.soundCheckMark.clear();
    if (Globals.sound) {
      this.soundCheckMark.moveTo(-5, 0);
      this.soundCheckMark.lineTo(-1, 5);
      this.soundCheckMark.lineTo(6, -5);
      this.soundCheckMark.stroke({ color: 0x111111, width: 2.5, cap: 'round', join: 'round' });
    }
  }

  private toggleSound(): void {
    void audioManager.whenReady();
    Globals.sound = !Globals.sound;
    setSound(Globals.sound);
    this.redrawSoundCheck();
  }

  updateLayout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.hitArea = this.app.screen;

    this.clipMask.clear();
    this.clipMask.rect(0, 0, w, h).fill({ color: 0xffffff });

    const th = this.splash.texture.height || 1;
    // Fit height exactly; center horizontally; sides may spill and clip.
    const scale = h / th;
    this.splash.scale.set(scale);
    this.splash.x = w / 2;
    this.splash.y = h / 2;

    this.title.x = w / 2;
    this.title.y = h * 0.38;
    this.title.scale.set(Math.min(1.15, Math.max(0.7, w / 900)));

    this.subtitle.x = w / 2;
    this.subtitle.y = this.title.y + 34 * this.title.scale.y;

    const menuY = this.subtitle.y + 70;
    this.tapPrompt.x = w / 2;
    this.tapPrompt.y = menuY;

    this.startBtn.x = w / 2;
    this.startBtn.y = menuY;

    this.leaderboardBtn.x = w / 2;
    this.leaderboardBtn.y = this.startBtn.y + 58;

    this.soundRow.x = w / 2 - 28;
    this.soundRow.y = this.leaderboardBtn.y + 52;
  }
}
