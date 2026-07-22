/**
 * Button click SFX — a framework-agnostic Web Audio singleton.
 *
 * Ported (and trimmed to two one-shot buffers) from the mines-game
 * AudioManager. There is ONE AudioContext for the whole player UI, a single
 * sfx GainNode, and two decoded buffers: `click` (default) and `press` (the
 * primary bet/confirm action).
 *
 * Design notes:
 *   - Lazy-init: the context is created on the first user gesture, never at
 *     import time (browsers block audio before a gesture, and SSR has no
 *     AudioContext at all).
 *   - iOS/mobile unlock: a silent 1-sample buffer is started INSIDE the gesture
 *     so the audio session flips to "running"; otherwise every play() is
 *     silent on iOS Safari.
 *   - Fail-silent: a 404 or decode error leaves that key absent and play() is a
 *     no-op. Audio must never throw into the UI.
 *   - Mute is persisted to localStorage['prg_sfx_muted'] and defaults to ON
 *     (i.e. NOT muted) when no preference is stored.
 */

export type SfxKey = "click" | "press";

const MUTE_KEY = "prg_sfx_muted";

const SOURCES: Record<SfxKey, string> = {
  click: "/assets/audio/click.mp3",
  press: "/assets/audio/click-press.mp3",
};

function readMutedPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMutedPref(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode / iframe — in-memory value still applies */
  }
}

class ButtonSfx {
  private muted: boolean;
  private volume = 0.7;

  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private buffers = new Map<SfxKey, AudioBuffer>();
  private fetchStarted = false;

  constructor() {
    this.muted = readMutedPref();
  }

  /**
   * Unlock Web Audio on the first user gesture. iOS Safari is the strict case:
   * the context must be created AND a silent buffer started INSIDE the gesture,
   * or it stays suspended and every play() is silent. Call this from a real
   * gesture handler (the provider does, in capture phase).
   */
  unlock(): void {
    this.ensureContext();
    // Once the context is running the session is already unlocked — return
    // early so we don't allocate/start a fresh silent source on every gesture.
    if (this.ctx && this.ctx.state === "running") return;
    if (this.ctx && this.sfxBus) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
        src.connect(this.sfxBus);
        src.start(0);
      } catch {
        /* best-effort */
      }
    }
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const AC =
      (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return; // NoAudio environment — play() stays a no-op
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
      return;
    }
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.muted ? 0 : this.volume;
    this.sfxBus.connect(this.ctx.destination);
    void this.fetchBuffers();
  }

  /** Decode both one-shot buffers once, at unlock. Missing files are absent. */
  private async fetchBuffers(): Promise<void> {
    if (!this.ctx || this.fetchStarted) return;
    this.fetchStarted = true;
    await Promise.all(
      (Object.keys(SOURCES) as SfxKey[]).map(async (key) => {
        try {
          const res = await fetch(SOURCES[key]);
          if (!res.ok) return;
          const buf = await this.ctx!.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(key, buf);
        } catch {
          /* fail-silent — this key stays a no-op */
        }
      }),
    );
  }

  play(key: SfxKey): void {
    if (this.muted || !this.ctx || !this.sfxBus) return;
    // iOS suspends on backgrounding; a resume() recovers it (this play may be
    // dropped, but subsequent ones are audible again).
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
      return;
    }
    if (this.ctx.state !== "running") return;
    const buf = this.buffers.get(key);
    if (!buf) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.sfxBus);
      src.start();
    } catch {
      /* best-effort */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeMutedPref(muted);
    if (this.sfxBus) this.sfxBus.gain.value = muted ? 0 : this.volume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.sfxBus && !this.muted) this.sfxBus.gain.value = this.volume;
  }
}

/** Process-wide singleton — one AudioContext for the whole player UI. */
export const buttonSfx = new ButtonSfx();
