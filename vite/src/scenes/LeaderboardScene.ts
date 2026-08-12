import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { MAX_SCORES } from '../utils/storage';
import { fetchScores, type ScoreEntry } from '../utils/leaderboardApi';
import { formatScore } from '../utils/format';
import { addButtonPressJuice } from '../game/Juice';

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
  addButtonPressJuice(btn);
  return btn;
}

/** Overlay listing shared top scores. Scrolls when the list is taller than the screen. */
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
  private listClip!: Container;
  private listMask!: Graphics;
  private listContent!: Container;
  private rows: ScoreRow[] = [];
  private backBtn!: Container;
  private scrollY = 0;
  private maxScroll = 0;
  private listViewportH = 0;
  private contentH = 0;
  private dragging = false;
  private dragStartY = 0;
  private dragStartScroll = 0;

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

    this.listClip = new Container();
    this.listClip.eventMode = 'static';
    this.listClip.cursor = 'default';
    this.addChild(this.listClip);

    this.listMask = new Graphics();
    this.listClip.addChild(this.listMask);
    this.listClip.mask = this.listMask;

    this.listContent = new Container();
    this.listClip.addChild(this.listContent);

    this.emptyText = new Text({ text: 'No scores yet\nPlay a round!', style: EMPTY_STYLE });
    this.emptyText.anchor.set(0.5);
    this.listContent.addChild(this.emptyText);

    for (let i = 0; i < MAX_SCORES; i++) {
      const root = new Container();
      const rank = new Text({ text: '', style: RANK_STYLE });
      const name = new Text({ text: '', style: NAME_STYLE });
      const score = new Text({ text: '', style: SCORE_STYLE });
      score.anchor.set(1, 0);
      root.addChild(rank, name, score);
      this.rows.push({ root, rank, name, score });
      this.listContent.addChild(root);
    }

    this.backBtn = makeButton('Back', 160, 44);
    this.backBtn.on('pointerdown', () => this.onBack());
    this.addChild(this.backBtn);

    this.listClip.on('pointerdown', this.onDragStart);
    this.listClip.on('pointermove', this.onDragMove);
    this.listClip.on('pointerup', this.onDragEnd);
    this.listClip.on('pointerupoutside', this.onDragEnd);
    this.listClip.on('pointercancel', this.onDragEnd);
    this.app.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.showStatus('No scores yet\nPlay a round!');
    this.updateLayout();
  }

  async refresh(): Promise<void> {
    this.scrollY = 0;
    this.showStatus('Loading…');
    this.updateLayout();
    try {
      const scores = await fetchScores();
      this.showScores(scores);
    } catch {
      this.showStatus('Couldn’t load scores');
    }
    this.scrollY = 0;
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
      row.score.text = formatScore(entry.score);
    }
  }

  updateLayout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.hitArea = new Rectangle(0, 0, w, h);

    this.dim.clear();
    this.dim.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.45 });

    const padX = 22;
    const padTop = 16;
    const rowH = 32;
    const titleBlock = 40;
    const headerH = 24;
    const btnH = 44;
    const padBot = 14;
    const chromeH = padTop + titleBlock + headerH + btnH + padBot + 10;
    const visibleRows = this.rows.filter((r) => r.root.visible).length;
    this.contentH = this.emptyText.visible ? 72 : Math.max(1, visibleRows) * rowH;

    const cardW = Math.min(380, w - 40);
    const maxCardH = Math.max(chromeH + 48, h - 24);
    this.listViewportH = Math.min(this.contentH, Math.max(48, maxCardH - chromeH));
    const cardH = chromeH + this.listViewportH;
    const cardX = (w - cardW) / 2;
    const cardY = Math.max(8, (h - cardH) / 2);

    this.maxScroll = Math.max(0, this.contentH - this.listViewportH);
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY));

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
    this.listClip.x = cardX;
    this.listClip.y = listTop;
    this.listClip.hitArea = new Rectangle(0, 0, cardW, this.listViewportH);
    this.listClip.cursor = this.maxScroll > 0 ? 'grab' : 'default';

    this.listMask.clear();
    this.listMask.rect(0, 0, cardW, this.listViewportH).fill({ color: 0xffffff });

    this.listContent.y = -this.scrollY;

    this.emptyText.x = cardW / 2;
    this.emptyText.y = this.contentH / 2;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!;
      row.root.x = 0;
      row.root.y = i * rowH;
      row.rank.x = padX;
      row.name.x = padX + 36;
      row.score.x = cardW - padX;
    }

    this.backBtn.x = w / 2;
    this.backBtn.y = cardY + cardH - padBot - btnH / 2;
  }

  private onDragStart = (e: { global: { y: number } }): void => {
    if (this.maxScroll <= 0) return;
    this.dragging = true;
    this.dragStartY = e.global.y;
    this.dragStartScroll = this.scrollY;
    this.listClip.cursor = 'grabbing';
  };

  private onDragMove = (e: { global: { y: number } }): void => {
    if (!this.dragging) return;
    const dy = e.global.y - this.dragStartY;
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.dragStartScroll - dy));
    this.listContent.y = -this.scrollY;
  };

  private onDragEnd = (): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.listClip.cursor = this.maxScroll > 0 ? 'grab' : 'default';
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.parent || this.maxScroll <= 0) return;
    e.preventDefault();
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + e.deltaY));
    this.listContent.y = -this.scrollY;
  };
}
