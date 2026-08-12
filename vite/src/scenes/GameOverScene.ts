import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { Globals } from '../game/Globals';
import { getLastName, setLastName, sanitizeName } from '../utils/storage';
import { fetchScores, qualifiesForLeaderboard, submitScore, hasScoreRun } from '../utils/leaderboardApi';
import { formatScore } from '../utils/format';
import { ScoreSavePrompt } from '../ui/scoreSavePrompt';
import { addButtonPressJuice } from '../game/Juice';

const TITLE_STYLE = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 40,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
  stroke: { color: 0xffffff, width: 5, join: 'round' },
});

const SCORE_STYLE = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 28,
  fill: 0x1a1a1a,
  stroke: { color: 0xffffff, width: 4, join: 'round' },
});

const STATUS_STYLE = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 20,
  fill: 0x1a1a1a,
  stroke: { color: 0xffffff, width: 3, join: 'round' },
});

const BUTTON_STYLE = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 26,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
  stroke: { color: 0xffffff, width: 4, join: 'round' },
});

/** Overlay shown on top of a frozen SkyScene. */
export class GameOverScene extends Container {
  private app: Application;
  private onPlayAgain: () => void;
  private onLeaderboard: () => void;
  private onHowToPlay: () => void;
  private onTitle: () => void;
  private prompt: ScoreSavePrompt;
  private dim!: Graphics;
  private title!: Text;
  private scoreText!: Text;
  private bestText!: Text;
  private statusText!: Text;
  private playAgainBtn!: Text;
  private leaderboardBtn!: Text;
  private howToPlayBtn!: Text;
  private titleBtn!: Text;
  private promptToken = 0;

  constructor(
    app: Application,
    onPlayAgain: () => void,
    onLeaderboard: () => void,
    onHowToPlay: () => void,
    onTitle: () => void
  ) {
    super();
    this.app = app;
    this.onPlayAgain = onPlayAgain;
    this.onLeaderboard = onLeaderboard;
    this.onHowToPlay = onHowToPlay;
    this.onTitle = onTitle;
    this.prompt = new ScoreSavePrompt({
      onSave: (name) => {
        void this.saveScore(name);
      },
      onSkip: () => this.finishPrompt(''),
    });

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

    this.statusText = new Text({ text: '', style: STATUS_STYLE });
    this.statusText.anchor.set(0.5);
    this.addChild(this.statusText);

    this.playAgainBtn = new Text({ text: 'Play again', style: BUTTON_STYLE });
    this.playAgainBtn.anchor.set(0.5);
    this.playAgainBtn.eventMode = 'static';
    this.playAgainBtn.cursor = 'pointer';
    this.playAgainBtn.on('pointerdown', () => this.handlePlayAgain());
    addButtonPressJuice(this.playAgainBtn);
    this.addChild(this.playAgainBtn);

    this.leaderboardBtn = new Text({ text: 'Leaderboard', style: BUTTON_STYLE });
    this.leaderboardBtn.anchor.set(0.5);
    this.leaderboardBtn.eventMode = 'static';
    this.leaderboardBtn.cursor = 'pointer';
    this.leaderboardBtn.on('pointerdown', () => this.onLeaderboard());
    addButtonPressJuice(this.leaderboardBtn);
    this.addChild(this.leaderboardBtn);

    this.howToPlayBtn = new Text({ text: 'How to Play', style: BUTTON_STYLE });
    this.howToPlayBtn.anchor.set(0.5);
    this.howToPlayBtn.eventMode = 'static';
    this.howToPlayBtn.cursor = 'pointer';
    this.howToPlayBtn.on('pointerdown', () => this.onHowToPlay());
    addButtonPressJuice(this.howToPlayBtn);
    this.addChild(this.howToPlayBtn);

    this.titleBtn = new Text({ text: 'Title', style: BUTTON_STYLE });
    this.titleBtn.anchor.set(0.5);
    this.titleBtn.eventMode = 'static';
    this.titleBtn.cursor = 'pointer';
    this.titleBtn.on('pointerdown', () => this.handleTitle());
    addButtonPressJuice(this.titleBtn);
    this.addChild(this.titleBtn);

    this.updateLayout();
  }

  refreshScores(): void {
    const token = ++this.promptToken;
    const isNewBest = Globals.score > 0 && Globals.score >= Globals.highScore;
    this.scoreText.text = `Score: ${formatScore(Globals.score)}`;
    this.bestText.text = isNewBest
      ? `New best: ${formatScore(Globals.highScore)}!`
      : `Best: ${formatScore(Globals.highScore)}`;
    this.bestText.scale.set(isNewBest ? 1.2 : 1);
    this.statusText.text = '';
    this.setButtonsVisible(true);
    this.prompt.hide();
    this.updateLayout();

    if (isNewBest) {
      const start = performance.now();
      const punch = (): void => {
        const t = (performance.now() - start) / 450;
        if (t >= 1) {
          this.bestText.scale.set(1);
          return;
        }
        const s = 1 + Math.sin(t * Math.PI) * 0.22;
        this.bestText.scale.set(s);
        requestAnimationFrame(punch);
      };
      requestAnimationFrame(punch);
    }

    if (Globals.score <= 0) return;
    // Can't submit without a server-issued run token.
    if (!hasScoreRun()) return;

    void (async () => {
      let shouldPrompt = true;
      try {
        const scores = await fetchScores();
        shouldPrompt = qualifiesForLeaderboard(Globals.score, scores);
      } catch {
        shouldPrompt = true;
      }
      if (token !== this.promptToken) return;
      if (!shouldPrompt) return;
      this.setButtonsVisible(false);
      this.prompt.show(Globals.score, getLastName(), isNewBest);
      this.updateLayout();
    })();
  }

  hidePrompt(): void {
    this.promptToken += 1;
    this.prompt.hide();
    this.setButtonsVisible(true);
  }

  updateLayout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.dim.clear();
    this.dim.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.22 });

    this.title.x = w / 2;
    this.title.y = h / 2 - 110;

    this.scoreText.x = w / 2;
    this.scoreText.y = h / 2 - 58;

    this.bestText.x = w / 2;
    this.bestText.y = h / 2 - 18;

    this.statusText.x = w / 2;
    this.statusText.y = h / 2 + 20;

    const btnGap = 40;
    const buttonsY = this.statusText.text ? h / 2 + 56 : h / 2 + 42;
    this.playAgainBtn.x = w / 2;
    this.playAgainBtn.y = buttonsY;

    this.leaderboardBtn.x = w / 2;
    this.leaderboardBtn.y = buttonsY + btnGap;

    this.howToPlayBtn.x = w / 2;
    this.howToPlayBtn.y = buttonsY + btnGap * 2;

    this.titleBtn.x = w / 2;
    this.titleBtn.y = buttonsY + btnGap * 3;
  }

  private async saveScore(name: string): Promise<void> {
    const token = this.promptToken;
    this.prompt.hide();
    this.statusText.text = 'Saving…';
    this.setButtonsVisible(false);
    this.updateLayout();

    try {
      await submitScore(Globals.score, name, Globals.scoreMultiplier);
      setLastName(name);
      if (token !== this.promptToken) return;
      this.finishPrompt(`Saved as ${sanitizeName(name)}`);
    } catch {
      if (token !== this.promptToken) return;
      this.statusText.text = 'Couldn’t save — try again';
      if (hasScoreRun()) {
        this.setButtonsVisible(false);
        this.prompt.show(Globals.score, getLastName() || name, Globals.score >= Globals.highScore);
      } else {
        this.setButtonsVisible(true);
      }
      this.updateLayout();
    }
  }

  private finishPrompt(status: string): void {
    this.prompt.hide();
    this.statusText.text = status;
    this.setButtonsVisible(true);
    this.updateLayout();
  }

  private setButtonsVisible(visible: boolean): void {
    this.playAgainBtn.visible = visible;
    this.leaderboardBtn.visible = visible;
    this.howToPlayBtn.visible = visible;
    this.titleBtn.visible = visible;
    this.playAgainBtn.eventMode = visible ? 'static' : 'none';
    this.leaderboardBtn.eventMode = visible ? 'static' : 'none';
    this.howToPlayBtn.eventMode = visible ? 'static' : 'none';
    this.titleBtn.eventMode = visible ? 'static' : 'none';
  }

  private handlePlayAgain(): void {
    this.hidePrompt();
    this.onPlayAgain();
  }

  private handleTitle(): void {
    this.hidePrompt();
    this.onTitle();
  }
}
