import { DEFAULT_NAME, MAX_NAME_LEN } from '../utils/storage';
import { formatScore } from '../utils/format';

export class ScoreSavePrompt {
  private root: HTMLDivElement;
  private scoreEl: HTMLParagraphElement;
  private input: HTMLInputElement;
  private onSave: (name: string) => void;
  private onSkip: () => void;

  constructor(handlers: { onSave: (name: string) => void; onSkip: () => void }) {
    this.onSave = handlers.onSave;
    this.onSkip = handlers.onSkip;

    this.root = document.createElement('div');
    this.root.id = 'score-save-prompt';
    this.root.hidden = true;
    this.root.innerHTML = `
      <form class="score-save-card" autocomplete="on">
        <p class="score-save-kicker">Save score</p>
        <p class="score-save-value"></p>
        <label for="score-save-name">Your name</label>
        <input
          id="score-save-name"
          name="nickname"
          type="text"
          maxlength="${MAX_NAME_LEN}"
          autocomplete="nickname"
          enterkeyhint="done"
          autocapitalize="words"
          spellcheck="false"
          placeholder="${DEFAULT_NAME}"
        />
        <div class="score-save-actions">
          <button type="submit" class="score-save-save">Save</button>
          <button type="button" class="score-save-skip">Skip</button>
        </div>
      </form>
    `;
    document.body.appendChild(this.root);

    this.scoreEl = this.root.querySelector('.score-save-value') as HTMLParagraphElement;
    this.input = this.root.querySelector('#score-save-name') as HTMLInputElement;
    const form = this.root.querySelector('form') as HTMLFormElement;
    const skipBtn = this.root.querySelector('.score-save-skip') as HTMLButtonElement;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.onSave(this.input.value);
    });
    skipBtn.addEventListener('click', () => this.onSkip());
  }

  show(score: number, defaultName: string, isNewBest = false): void {
    this.scoreEl.textContent = formatScore(score);
    this.scoreEl.classList.toggle('is-new-best', isNewBest);
    const kicker = this.root.querySelector('.score-save-kicker') as HTMLParagraphElement | null;
    if (kicker) kicker.textContent = isNewBest ? 'New best!' : 'Save score';
    this.input.value = defaultName;
    this.root.hidden = false;
    const card = this.root.querySelector('.score-save-card') as HTMLElement | null;
    if (card) {
      card.classList.remove('score-save-in');
      // Retrigger enter animation.
      void card.offsetWidth;
      card.classList.add('score-save-in');
    }
    requestAnimationFrame(() => {
      this.input.focus();
      this.input.select();
    });
  }

  hide(): void {
    this.root.hidden = true;
    this.input.blur();
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }
}
