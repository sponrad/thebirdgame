import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { MAX_SCORES } from '../utils/storage';
import { fetchScores, type ScoreEntry } from '../utils/leaderboardApi';
import { formatScore } from '../utils/format';
import { addButtonPressJuice } from '../game/Juice';
import {
  ACHIEVEMENT_META,
  sanitizeAchievements,
  type AchievementId,
} from '../game/achievements';

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

const ICON_SIZE = 18;
const ICON_GAP = 4;
const ACH_COL_W = ICON_SIZE * 3 + ICON_GAP * 2;
const MULT_COL_W = 40;

const ICON_GLYPH_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 11,
  fill: 0x111111,
  fontWeight: 'bold',
});

const TIP_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 14,
  fill: 0x111111,
  fontWeight: 'bold',
});

type ScoreRow = {
  root: Container;
  rank: Text;
  name: Text;
  score: Text;
  mult: Text;
  ach: Container;
};

function makeAchievementIcon(id: AchievementId): Container {
  const meta = ACHIEVEMENT_META[id];
  const btn = new Container();
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  const bg = new Graphics();
  bg.roundRect(0, 0, ICON_SIZE, ICON_SIZE, 3).fill({ color: meta.color });
  bg.stroke({ color: 0x111111, width: 1, alpha: 0.35 });
  btn.addChild(bg);
  const glyph = new Text({ text: meta.glyph, style: ICON_GLYPH_STYLE });
  glyph.anchor.set(0.5);
  glyph.x = ICON_SIZE / 2;
  glyph.y = ICON_SIZE / 2 + 0.5;
  btn.addChild(glyph);
  return btn;
}

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
  private headerMult!: Text;
  private headerAch!: Text;
  private tooltip!: Container;
  private tooltipBg!: Graphics;
  private tooltipText!: Text;
  private tooltipPinned = false;
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
    this.headerMult = new Text({ text: '', style: HEADER_STYLE });
    this.headerMult.anchor.set(1, 0);
    this.headerAch = new Text({ text: '', style: HEADER_STYLE });
    this.addChild(this.headerRank);
    this.addChild(this.headerName);
    this.addChild(this.headerScore);
    this.addChild(this.headerMult);
    this.addChild(this.headerAch);

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
      const mult = new Text({ text: '', style: SCORE_STYLE });
      mult.anchor.set(1, 0);
      const ach = new Container();
      root.addChild(rank, name, score, mult, ach);
      this.rows.push({ root, rank, name, score, mult, ach });
      this.listContent.addChild(root);
    }

    this.tooltip = new Container();
    this.tooltip.visible = false;
    this.tooltip.eventMode = 'none';
    this.tooltipBg = new Graphics();
    this.tooltipText = new Text({ text: '', style: TIP_STYLE });
    this.tooltipText.anchor.set(0.5);
    this.tooltip.addChild(this.tooltipBg, this.tooltipText);
    this.addChild(this.tooltip);

    this.backBtn = makeButton('Back', 160, 44);
    this.backBtn.on('pointerdown', () => {
      this.hideTooltip();
      this.onBack();
    });
    this.on('pointerdown', () => this.hideTooltip());
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
    this.headerMult.visible = false;
    this.headerAch.visible = false;
    this.hideTooltip();
    for (const row of this.rows) row.root.visible = false;
  }

  private showScores(scores: ScoreEntry[]): void {
    this.emptyText.text = 'No scores yet\nPlay a round!';
    this.emptyText.visible = scores.length === 0;
    this.headerRank.visible = scores.length > 0;
    this.headerName.visible = scores.length > 0;
    this.headerScore.visible = scores.length > 0;
    this.headerMult.visible = scores.length > 0;
    this.headerAch.visible = scores.length > 0;
    this.hideTooltip();

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
      row.mult.text = `x${entry.multiplier}`;
      this.fillAchievementIcons(row.ach, sanitizeAchievements(entry.achievements));
    }
  }

  private fillAchievementIcons(holder: Container, ids: AchievementId[]): void {
    holder.removeChildren();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const icon = makeAchievementIcon(id);
      icon.x = i * (ICON_SIZE + ICON_GAP);
      icon.y = 2;
      icon.on('pointerover', () => this.showAchievementTip(icon, id, false));
      icon.on('pointerout', () => {
        if (!this.tooltipPinned) this.hideTooltip();
      });
      icon.on('pointerdown', (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        this.showAchievementTip(icon, id, true);
      });
      holder.addChild(icon);
    }
  }

  private showAchievementTip(icon: Container, id: AchievementId, pinned: boolean): void {
    this.tooltipPinned = pinned;
    const meta = ACHIEVEMENT_META[id];
    this.tooltipText.text = meta.label;
    const padX = 8;
    const padY = 5;
    const tw = this.tooltipText.width + padX * 2;
    const th = this.tooltipText.height + padY * 2;
    this.tooltipBg.clear();
    this.tooltipBg.roundRect(-tw / 2, -th / 2, tw, th, 4).fill({ color: 0xffffff });
    this.tooltipBg.stroke({ color: 0x111111, width: 1, alpha: 0.25 });

    const global = icon.getGlobalPosition();
    this.tooltip.x = global.x + ICON_SIZE / 2;
    this.tooltip.y = Math.max(18, global.y - th / 2 - 8);
    this.tooltip.visible = true;
  }

  private hideTooltip(): void {
    this.tooltipPinned = false;
    this.tooltip.visible = false;
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

    const cardW = Math.min(460, w - 28);
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
    const achX = cardX + cardW - padX - ACH_COL_W;
    const multX = achX - 8;
    const scoreX = multX - MULT_COL_W - 8;
    this.headerRank.x = cardX + padX;
    this.headerName.x = cardX + padX + 28;
    this.headerScore.x = scoreX;
    this.headerMult.x = multX;
    this.headerAch.x = achX;
    this.headerRank.y = headerY;
    this.headerName.y = headerY;
    this.headerScore.y = headerY;
    this.headerMult.y = headerY;
    this.headerAch.y = headerY;

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

    const achLocalX = cardW - padX - ACH_COL_W;
    const multLocalX = achLocalX - 8;
    const scoreLocalX = multLocalX - MULT_COL_W - 8;
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!;
      row.root.x = 0;
      row.root.y = i * rowH;
      row.rank.x = padX;
      row.name.x = padX + 28;
      row.score.x = scoreLocalX;
      row.mult.x = multLocalX;
      row.ach.x = achLocalX;
    }

    this.backBtn.x = w / 2;
    this.backBtn.y = cardY + cardH - padBot - btnH / 2;
  }

  private onDragStart = (e: { global: { y: number } }): void => {
    if (this.maxScroll <= 0) return;
    this.dragging = true;
    this.hideTooltip();
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
    this.hideTooltip();
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + e.deltaY));
    this.listContent.y = -this.scrollY;
  };
}
