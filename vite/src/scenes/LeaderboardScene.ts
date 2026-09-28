import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { MAX_SCORES } from '../utils/storage';
import {
  fetchLeaderboard,
  formatMonthKey,
  type LeaderboardData,
  type ScoreEntry,
} from '../utils/leaderboardApi';
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

const SECTION_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 20,
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
const NAME_X = 28;

const ROW_H = 32;
const SECTION_H = 34;
const HEADER_H = 24;
const EMPTY_H = 72;
/** Screens at least this wide show the two boards side by side. */
const TWO_COLUMN_MIN_W = 760;

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

type IconTipHandlers = {
  show: (icon: Container, id: AchievementId, pinned: boolean) => void;
  hoverEnd: () => void;
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

function setButtonEnabled(btn: Container, enabled: boolean): void {
  btn.eventMode = enabled ? 'static' : 'none';
  btn.alpha = enabled ? 1 : 0.3;
}

/** One ranked board: a title row, column headers, and up to MAX_SCORES rows. */
class ScoreTable extends Container {
  private titleRow: Container;
  private headerRank: Text;
  private headerName: Text;
  private headerScore: Text;
  private rows: ScoreRow[] = [];
  private emptyText: Text;
  private tips: IconTipHandlers;
  private tableW = 0;

  constructor(titleRow: Container, tips: IconTipHandlers) {
    super();
    this.titleRow = titleRow;
    this.tips = tips;
    this.addChild(titleRow);

    this.headerRank = new Text({ text: '#', style: HEADER_STYLE });
    this.headerName = new Text({ text: 'Name', style: HEADER_STYLE });
    this.headerScore = new Text({ text: 'Score', style: HEADER_STYLE });
    this.headerScore.anchor.set(1, 0);
    this.addChild(this.headerRank, this.headerName, this.headerScore);

    this.emptyText = new Text({ text: '', style: EMPTY_STYLE });
    this.emptyText.anchor.set(0.5);
    this.addChild(this.emptyText);

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
      this.addChild(root);
    }
  }

  showStatus(message: string): void {
    this.emptyText.text = message;
    this.emptyText.visible = true;
    this.setHeadersVisible(false);
    for (const row of this.rows) row.root.visible = false;
  }

  showScores(scores: ScoreEntry[], emptyMessage: string): void {
    this.emptyText.text = emptyMessage;
    this.emptyText.visible = scores.length === 0;
    this.setHeadersVisible(scores.length > 0);

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
    this.layoutRows();
  }

  /** Positions everything for `width`; returns the table height. */
  layout(width: number): number {
    this.tableW = width;
    this.titleRow.x = width / 2;
    this.titleRow.y = 0;

    const scoreX = this.scoreColumnX();
    this.headerRank.x = 0;
    this.headerName.x = NAME_X;
    this.headerScore.x = scoreX;
    this.headerRank.y = SECTION_H;
    this.headerName.y = SECTION_H;
    this.headerScore.y = SECTION_H;

    this.emptyText.x = width / 2;
    this.emptyText.y = SECTION_H + EMPTY_H / 2;

    this.layoutRows();

    if (this.emptyText.visible) return SECTION_H + EMPTY_H;
    const visibleRows = this.rows.filter((r) => r.root.visible).length;
    return SECTION_H + HEADER_H + Math.max(1, visibleRows) * ROW_H;
  }

  private scoreColumnX(): number {
    const achX = this.tableW - ACH_COL_W;
    const multX = achX - 8;
    return multX - MULT_COL_W - 8;
  }

  private layoutRows(): void {
    const achX = this.tableW - ACH_COL_W;
    const multX = achX - 8;
    const scoreX = this.scoreColumnX();
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!;
      row.root.x = 0;
      row.root.y = SECTION_H + HEADER_H + i * ROW_H;
      row.rank.x = 0;
      row.name.x = NAME_X;
      row.score.x = scoreX;
      row.mult.x = multX;
      row.ach.x = achX;

      // Squeeze long names so they never run into the score.
      row.name.scale.set(1);
      const maxNameW = scoreX - row.score.width - 8 - NAME_X;
      if (row.name.width > maxNameW && maxNameW > 0) {
        row.name.scale.set(maxNameW / row.name.width);
      }
    }
  }

  private setHeadersVisible(visible: boolean): void {
    this.headerRank.visible = visible;
    this.headerName.visible = visible;
    this.headerScore.visible = visible;
  }

  private fillAchievementIcons(holder: Container, ids: AchievementId[]): void {
    holder.removeChildren();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const icon = makeAchievementIcon(id);
      icon.x = i * (ICON_SIZE + ICON_GAP);
      icon.y = 2;
      icon.on('pointerover', () => this.tips.show(icon, id, false));
      icon.on('pointerout', () => this.tips.hoverEnd());
      icon.on('pointerdown', (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        this.tips.show(icon, id, true);
      });
      holder.addChild(icon);
    }
  }
}

/** Overlay listing shared all-time and monthly top scores. Scrolls when taller than the screen. */
export class LeaderboardScene extends Container {
  private app: Application;
  private onBack: () => void;
  private dim!: Graphics;
  private card!: Graphics;
  private title!: Text;
  private allTimeTable!: ScoreTable;
  private monthTable!: ScoreTable;
  private monthLabel!: Text;
  private prevMonthBtn!: Container;
  private nextMonthBtn!: Container;
  private tooltip!: Container;
  private tooltipBg!: Graphics;
  private tooltipText!: Text;
  private tooltipPinned = false;
  private listClip!: Container;
  private listMask!: Graphics;
  private listContent!: Container;
  private backBtn!: Container;
  private scrollY = 0;
  private maxScroll = 0;
  private listViewportH = 0;
  private contentH = 0;
  private dragging = false;
  private dragStartY = 0;
  private dragStartScroll = 0;
  /** Months with scores, newest first. */
  private months: string[] = [];
  private monthKey = '';
  private currentMonth = '';
  private loadToken = 0;

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

    this.listClip = new Container();
    this.listClip.eventMode = 'static';
    this.listClip.cursor = 'default';
    this.addChild(this.listClip);

    this.listMask = new Graphics();
    this.listClip.addChild(this.listMask);
    this.listClip.mask = this.listMask;

    this.listContent = new Container();
    this.listClip.addChild(this.listContent);

    const tips: IconTipHandlers = {
      show: (icon, id, pinned) => this.showAchievementTip(icon, id, pinned),
      hoverEnd: () => {
        if (!this.tooltipPinned) this.hideTooltip();
      },
    };

    const allTimeTitle = new Text({ text: 'All-Time', style: SECTION_STYLE });
    allTimeTitle.anchor.set(0.5, 0);
    this.allTimeTable = new ScoreTable(allTimeTitle, tips);
    this.listContent.addChild(this.allTimeTable);

    const monthNav = new Container();
    this.monthLabel = new Text({ text: 'This Month', style: SECTION_STYLE });
    this.monthLabel.anchor.set(0.5, 0);
    this.prevMonthBtn = makeButton('‹', 30, 26);
    this.nextMonthBtn = makeButton('›', 30, 26);
    this.prevMonthBtn.on('pointerdown', (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      this.stepMonth(1);
    });
    this.nextMonthBtn.on('pointerdown', (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      this.stepMonth(-1);
    });
    monthNav.addChild(this.monthLabel, this.prevMonthBtn, this.nextMonthBtn);
    this.monthTable = new ScoreTable(monthNav, tips);
    this.listContent.addChild(this.monthTable);

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

    this.allTimeTable.showStatus('No scores yet\nPlay a round!');
    this.monthTable.showStatus('No scores yet\nPlay a round!');
    this.updateMonthNav();
    this.updateLayout();
  }

  /** Reload both boards, resetting the month view to the current month. */
  async refresh(): Promise<void> {
    this.scrollY = 0;
    this.monthKey = '';
    this.allTimeTable.showStatus('Loading…');
    this.monthTable.showStatus('Loading…');
    this.hideTooltip();
    this.updateMonthNav();
    this.updateLayout();
    await this.load(undefined, true);
    this.scrollY = 0;
    this.updateLayout();
  }

  /** `direction` 1 = older month, -1 = newer month. */
  private stepMonth(direction: 1 | -1): void {
    this.hideTooltip();
    const idx = this.months.indexOf(this.monthKey);
    const target = idx < 0 ? undefined : this.months[idx + direction];
    if (!target) return;
    this.monthKey = target;
    this.monthTable.showStatus('Loading…');
    this.updateMonthNav();
    this.updateLayout();
    void this.load(target, false);
  }

  private async load(month: string | undefined, allTimeFailsToo: boolean): Promise<void> {
    const token = ++this.loadToken;
    try {
      const board = await fetchLeaderboard(month);
      if (token !== this.loadToken) return;
      this.applyBoard(board);
    } catch {
      if (token !== this.loadToken) return;
      if (allTimeFailsToo) this.allTimeTable.showStatus('Couldn’t load scores');
      this.monthTable.showStatus('Couldn’t load scores');
    }
    this.updateLayout();
  }

  private applyBoard(board: LeaderboardData): void {
    this.months = board.months;
    this.monthKey = board.monthKey;
    this.currentMonth = board.currentMonth;
    this.allTimeTable.showScores(board.allTime, 'No scores yet\nPlay a round!');
    const isCurrent = board.monthKey === board.currentMonth;
    this.monthTable.showScores(
      board.month,
      isCurrent ? 'No scores this month\nPlay a round!' : 'No scores this month'
    );
    this.updateMonthNav();
  }

  private updateMonthNav(): void {
    const isCurrent = !this.monthKey || this.monthKey === this.currentMonth;
    this.monthLabel.text = isCurrent ? 'This Month' : formatMonthKey(this.monthKey);
    const idx = this.months.indexOf(this.monthKey);
    setButtonEnabled(this.prevMonthBtn, idx >= 0 && idx < this.months.length - 1);
    setButtonEnabled(this.nextMonthBtn, idx > 0);

    const armX = this.monthLabel.width / 2 + 24;
    const midY = this.monthLabel.height / 2;
    this.prevMonthBtn.x = -armX;
    this.nextMonthBtn.x = armX;
    this.prevMonthBtn.y = midY;
    this.nextMonthBtn.y = midY;
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
    const titleBlock = 40;
    const btnH = 44;
    const padBot = 14;
    const colGap = 28;
    const stackGap = 18;
    const chromeH = padTop + titleBlock + btnH + padBot + 10;

    const twoColumn = w >= TWO_COLUMN_MIN_W;
    const cardW = twoColumn ? Math.min(900, w - 28) : Math.min(460, w - 28);
    const innerW = cardW - padX * 2;

    if (twoColumn) {
      const colW = (innerW - colGap) / 2;
      const allTimeH = this.allTimeTable.layout(colW);
      const monthH = this.monthTable.layout(colW);
      this.allTimeTable.x = padX;
      this.allTimeTable.y = 0;
      this.monthTable.x = padX + colW + colGap;
      this.monthTable.y = 0;
      this.contentH = Math.max(allTimeH, monthH);
    } else {
      const allTimeH = this.allTimeTable.layout(innerW);
      const monthH = this.monthTable.layout(innerW);
      this.allTimeTable.x = padX;
      this.allTimeTable.y = 0;
      this.monthTable.x = padX;
      this.monthTable.y = allTimeH + stackGap;
      this.contentH = allTimeH + stackGap + monthH;
    }

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

    const listTop = cardY + padTop + titleBlock;
    this.listClip.x = cardX;
    this.listClip.y = listTop;
    this.listClip.hitArea = new Rectangle(0, 0, cardW, this.listViewportH);
    this.listClip.cursor = this.maxScroll > 0 ? 'grab' : 'default';

    this.listMask.clear();
    this.listMask.rect(0, 0, cardW, this.listViewportH).fill({ color: 0xffffff });

    this.listContent.y = -this.scrollY;

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
