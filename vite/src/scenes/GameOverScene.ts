import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { Globals } from '../game/Globals';

const TITLE_STYLE = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 40,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
  stroke: { color: 0xffffff, width: 5 },
});

const SCORE_STYLE = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 28,
  fill: 0x1a1a1a,
  stroke: { color: 0xffffff, width: 4 },
});

const BUTTON_STYLE = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 26,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
  stroke: { color: 0xffffff, width: 4 },
});

/** Overlay shown on top of a frozen SkyScene. */
export class GameOverScene extends Container {
  private app: Application;
  private onPlayAgain: () => void;
  private dim!: Graphics;
  private title!: Text;
  private scoreText!: Text;
  private bestText!: Text;
  private playAgainBtn!: Text;

  constructor(app: Application, onPlayAgain: () => void) {
    super();
    this.app = app;
    this.onPlayAgain = onPlayAgain;

    this.dim = new Graphics();
    this.addChild(this.dim);

    this.title = new Text({ text: 'Game Over', style: TITLE_STYLE });
    this.title.anchor.set(0.5);
    this.addChild(this.title);

    this.scoreText = new Text({ text: 'Score: 0', style: SCORE_STYLE });
    this.scoreText.anchor.set(0.5);
    this.addChild(this.scoreText);

    this.bestText = new Text({ text: 'Best: 0', style: SCORE_STYLE });
    this.bestText.anchor.set(0.5);
    this.addChild(this.bestText);

    this.playAgainBtn = new Text({ text: 'Play again', style: BUTTON_STYLE });
    this.playAgainBtn.anchor.set(0.5);
    this.playAgainBtn.eventMode = 'static';
    this.playAgainBtn.cursor = 'pointer';
    this.playAgainBtn.on('pointerdown', () => this.onPlayAgain());
    this.addChild(this.playAgainBtn);

    this.updateLayout();
  }

  refreshScores(): void {
    this.scoreText.text = `Score: ${Globals.score}`;
    this.bestText.text = `Best: ${Globals.highScore}`;
  }

  updateLayout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.dim.clear();
    this.dim.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.22 });

    this.title.x = w / 2;
    this.title.y = h / 2 - 80;

    this.scoreText.x = w / 2;
    this.scoreText.y = h / 2 - 28;

    this.bestText.x = w / 2;
    this.bestText.y = h / 2 + 12;

    this.playAgainBtn.x = w / 2;
    this.playAgainBtn.y = h / 2 + 70;
  }
}
