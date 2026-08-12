import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { MAX_SCORES } from '../utils/storage';
import { fetchScores, type ScoreEntry } from '../utils/leaderboardApi';

const TITLE_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 28,
  fill: 0x111111,
  fontWeight: 'bold',
});

const HEADER_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 13,
  fill: 0x666666,
  fontWeight: 'bold',
});

const RANK_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 18,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
});

const NAME_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 18,
  fill: 0x1a1a1a,
});

const SCORE_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 18,
  fill: 0x1a1a1a,
  fontWeight: 'bold',
});

const EMPTY_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 18,
  fill: 0x555555,
  align: 'center',
});

const BACK_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 20,
  fill: 0x111111,
  fontWeight: 'bold',
});

type ScoreRow = {
  root: Container;
  rank: Text;
  name: Text;
  score: Text;
};

function makeButton(label: string, width: number, height: number): Container {
  const btn = new Container();
  btn.eventMode = 'static';
  btn.cursor = 'pointer';

  const bg = new Graphics();
  bg.roundRect(-width / 2, -height / 2, width, height, 6).fill({ color: 0xf3f3f3 });
  bg.stroke({ color: 0xdddddd, width: 1, alpha: 0.9 });
  btn.addChild(bg);

  const text = new Text({ text: label, style: BACK_LABEL_STYLE });
  text.anchor.set(0.5);
  btn.addChild(text);
  return btn;
}

/** Overlay listing the local top scores. */
export class LeaderboardScene extends Container {
  private app: Application;
  private onBack: () => void;
  private dim!: Graphics;
  private card!: Graphics;
  private title!: Text;
  private headerRank!: Text;
  private headerName!: Text;
  private headerScore!: Text;
  private emptyText!: Text;
  private rows: ScoreRow[] = [];
  private backBtn!: Container;

  constructor(app: Application, onBack: () => void) {
    super();
    this.app = app;
    this.onBack = onBack;
    this.eventMode = 'static';
    this.cursor = 'default';

    this.dim = new Graphics();
    this.addChild(this.dim);

    this.card = new Graphics();
    this.addChild(this.card);

    this.title = new Text({ text: 'Leaderboard', style: TITLE_STYLE });
    this.title.anchor.set(0.5, 0);
    this.addChild(this.title);

    this.headerRank = new Text({ text: '#', style: HEADER_STYLE });
    this.headerName = new Text({ text: 'Name', style: HEADER_STYLE });
    this.headerScore = new Text({ text: 'Score', style: HEADER_STYLE });
    this.headerScore.anchor.set(1, 0);
    this.addChild(this.headerRank);
    this.addChild(this.headerName);
    this.addChild(this.headerScore);

    this.emptyText = new Text({ text: 'No scores yet\nPlay a round!', style: EMPTY_STYLE });
    this.emptyText.anchor.set(0.5);
    this.addChild(this.emptyText);

    for (let i = 0; i < MAX_SCORES; i++) {
      const root = new Container();
      const rank = new Text({ text: '', style: RANK_STYLE });
      const name = new Text({ text: '', style: NAME_STYLE });
      const score = new Text({ text: '', style: SCORE_STYLE });
      score.anchor.set(1, 0);
      root.addChild(rank, name, score);
      this.rows.push({ root, rank, name, score });
      this.addChild(root);
    }

    this.backBtn = makeButton('Back', 160, 44);
    this.backBtn.on('pointerdown', () => this.onBack());
    this.addChild(this.backBtn);

    this.showStatus('No scores yet\nPlay a round!');
    this.updateLayout();
  }

  async refresh(): Promise<void> {
    this.showStatus('Loading…');
    this.updateLayout();
    try {
      const scores = await fetchScores();
      this.showScores(scores);
    } catch {
      this.showStatus('Couldn’t load scores');
    }
    this.updateLayout();
  }

  private showStatus(message: string): void {
    this.emptyText.text = message;
    this.emptyText.visible = true;
    this.headerRank.visible = false;
    this.headerName.visible = false;
    this.headerScore.visible = false;
    for (const row of this.rows) row.root.visible = false;
  }

  private showScores(scores: ScoreEntry[]): void {
    this.emptyText.text = 'No scores yet\nPlay a round!';
    this.emptyText.visible = scores.length === 0;
    this.headerRank.visible = scores.length > 0;
    this.headerName.visible = scores.length > 0;
    this.headerScore.visible = scores.length > 0;

    for (let i = 0; i < this.rows.length; i++) {
      const entry = scores[i];
      const row = this.rows[i]!;
      if (!entry) {
        row.root.visible = false;
        continue;
      }
      row.root.visible = true;
      row.rank.text = String(i + 1);
      row.name.text = entry.name;
      row.score.text = String(entry.score);
    }
  }

  updateLayout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.hitArea = new Rectangle(0, 0, w, h);

    this.dim.clear();
    this.dim.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.45 });

    const padX = 22;
    const padTop = 20;
    const rowH = 32;
    const titleBlock = 44;
    const headerH = 26;
    const btnH = 44;
    const padBot = 18;
    const visibleRows = this.rows.filter((r) => r.root.visible).length;
    const listH = this.emptyText.visible ? 72 : Math.max(1, visibleRows) * rowH;
    const cardW = Math.min(380, w - 40);
    const cardH = padTop + titleBlock + headerH + listH + btnH + padBot + 12;
    const cardX = (w - cardW) / 2;
    const cardY = Math.max(12, (h - cardH) / 2);

    this.card.clear();
    this.card.roundRect(cardX, cardY, cardW, cardH, 10).fill({ color: 0xffffff });
    this.card.stroke({ color: 0xdddddd, width: 1, alpha: 0.95 });

    this.title.x = w / 2;
    this.title.y = cardY + padTop;

    const headerY = cardY + padTop + titleBlock;
    this.headerRank.x = cardX + padX;
    this.headerName.x = cardX + padX + 36;
    this.headerScore.x = cardX + cardW - padX;
    this.headerRank.y = headerY;
    this.headerName.y = headerY;
    this.headerScore.y = headerY;

    const listTop = headerY + headerH;
    this.emptyText.x = w / 2;
    this.emptyText.y = listTop + listH / 2;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!;
      row.root.x = 0;
      row.root.y = listTop + i * rowH;
      row.rank.x = cardX + padX;
      row.name.x = cardX + padX + 36;
      row.score.x = cardX + cardW - padX;
    }

    this.backBtn.x = w / 2;
    this.backBtn.y = cardY + cardH - padBot - btnH / 2;
  }
}
