import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { addButtonPressJuice } from '../game/Juice';

const TITLE_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 28,
  fill: 0x111111,
  fontWeight: 'bold',
});

const BODY_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 17,
  fill: 0x1a1a1a,
  lineHeight: 26,
  wordWrap: true,
  wordWrapWidth: 300,
});

const BACK_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 20,
  fill: 0x111111,
  fontWeight: 'bold',
});

const HOW_TO_PLAY_TEXT = [
  'Steer: tap or hold the left or right side of the screen (or A / D / arrow keys).',
  '',
  'Fly into balloons to pop them. The blast stuns nearby birds, score points for each one.',
  '',
  'Stun a bird while it’s still tiny/incoming for a No Entry! bonus (10× bird points).',
  '',
  'Grab the stars birds drop to raise your multiplier.',
  '',
  'Don’t hit the birds. Survive and rack up the high score!',
].join('\n');

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

/** Overlay with short how-to-play copy. Matches leaderboard card styling. */
export class HowToPlayScene extends Container {
  private app: Application;
  private onBack: () => void;
  private dim!: Graphics;
  private card!: Graphics;
  private title!: Text;
  private body!: Text;
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

    this.title = new Text({ text: 'How to Play', style: TITLE_STYLE });
    this.title.anchor.set(0.5, 0);
    this.addChild(this.title);

    this.listClip = new Container();
    this.listClip.eventMode = 'static';
    this.addChild(this.listClip);

    this.listMask = new Graphics();
    this.listClip.addChild(this.listMask);
    this.listClip.mask = this.listMask;

    this.listContent = new Container();
    this.listClip.addChild(this.listContent);

    this.body = new Text({ text: HOW_TO_PLAY_TEXT, style: BODY_STYLE });
    this.listContent.addChild(this.body);

    this.backBtn = makeButton('Back', 160, 44);
    this.backBtn.on('pointerdown', () => this.onBack());
    this.addChild(this.backBtn);

    this.listClip.on('pointerdown', this.onDragStart);
    this.listClip.on('pointermove', this.onDragMove);
    this.listClip.on('pointerup', this.onDragEnd);
    this.listClip.on('pointerupoutside', this.onDragEnd);
    this.listClip.on('pointercancel', this.onDragEnd);
    this.app.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.updateLayout();
  }

  updateLayout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.hitArea = new Rectangle(0, 0, w, h);

    this.dim.clear();
    this.dim.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.45 });

    const padX = 22;
    const padTop = 16;
    const titleBlock = 44;
    const btnH = 44;
    const padBot = 14;
    const chromeH = padTop + titleBlock + btnH + padBot + 10;

    const cardW = Math.min(380, w - 40);
    this.body.style.wordWrapWidth = cardW - padX * 2;
    this.contentH = Math.max(1, this.body.height);

    const maxCardH = Math.max(chromeH + 80, h - 24);
    this.listViewportH = Math.min(this.contentH, Math.max(64, maxCardH - chromeH));
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
    this.body.x = padX;
    this.body.y = 0;

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
