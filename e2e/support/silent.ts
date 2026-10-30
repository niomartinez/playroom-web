import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  BrowserType,
} from "@playwright/test";

/**
 * Silent QA: nobody hears a test run. Every browser these specs and the Playwright config start
 * goes through this file, so audio is off for headed, `--ui` and debug runs too (Playwright only
 * mutes headless Chromium by itself, and WebKit has no mute switch at all).
 *
 * `PLAYROOM_QA_AUDIBLE=1` is the only way to hear a run, and only when Nio asks for it.
 */

type Env = Record<string, string | undefined>;

/** True unless the run was explicitly made audible. */
export function qaMuted(env: Env = process.env): boolean {
  return env.PLAYROOM_QA_AUDIBLE !== "1";
}

/** Chromium launch args. `--mute-audio` silences every tab, headed or headless. */
export function silentChromiumArgs(env: Env = process.env): string[] {
  return qaMuted(env) ? ["--mute-audio"] : [];
}

/**
 * Launch a browser a spec starts itself. `chromium.launch()` ignores the config's
 * `use.launchOptions`, which is how a test ends up audible when only the config is muted.
 */
export function launchSilently(engine: BrowserType, env: Env = process.env): Promise<Browser> {
  return engine.launch({ args: engine.name() === "chromium" ? silentChromiumArgs(env) : [] });
}

/**
 * A context for a browser from `launchSilently`. WebKit cannot be muted at launch, so its
 * pages are muted from inside before any app script runs.
 */
export async function newSilentContext(
  browser: Browser,
  options?: BrowserContextOptions,
  env: Env = process.env,
): Promise<BrowserContext> {
  const context = await browser.newContext(options);
  if (browser.browserType().name() === "webkit" && qaMuted(env)) {
    await context.addInitScript(muteMediaInWebKit);
  }
  return context;
}

/**
 * Runs inside every WebKit frame (so: self-contained, no imports, no closure). Playback logic
 * keeps running, sources still start and end, and `video.muted` still reads back what the page
 * set; only the speakers hear nothing.
 */
export function muteMediaInWebKit(): void {
  // <audio> and <video>: the element is always really muted, whatever the page asks for.
  const media = HTMLMediaElement.prototype;
  const real = Object.getOwnPropertyDescriptor(media, "muted");
  if (real && real.get && real.set) {
    const getMuted = real.get;
    const setMuted = real.set;
    const asked = new WeakMap<object, boolean>();
    Object.defineProperty(media, "muted", {
      configurable: true,
      enumerable: real.enumerable,
      get() {
        return asked.has(this) ? asked.get(this) : getMuted.call(this);
      },
      set(value: unknown) {
        asked.set(this, !!value);
        setMuted.call(this, true);
      },
    });
    const play = media.play;
    media.play = function (this: HTMLMediaElement) {
      setMuted.call(this, true);
      return play.call(this);
    };
    // `autoplay` starts without a play() call, so catch the event as well.
    document.addEventListener(
      "play",
      (event) => {
        if (event.target instanceof HTMLMediaElement) setMuted.call(event.target, true);
      },
      true,
    );
  }

  // Web Audio: everything headed for the speakers goes through a gain of zero first, so
  // sources still run and fire `ended`. Offline contexts render to a buffer and are left alone.
  if (typeof AudioNode !== "undefined" && typeof AudioDestinationNode !== "undefined") {
    const connect = AudioNode.prototype.connect as unknown as (
      this: AudioNode,
      ...args: unknown[]
    ) => unknown;
    const sinks = new WeakMap<object, AudioNode>();
    AudioNode.prototype.connect = function (this: AudioNode, target: unknown, ...rest: unknown[]) {
      if (
        target instanceof AudioDestinationNode &&
        !(typeof OfflineAudioContext !== "undefined" && target.context instanceof OfflineAudioContext)
      ) {
        let sink = sinks.get(target.context);
        if (!sink) {
          const gain = target.context.createGain();
          gain.gain.value = 0;
          connect.call(gain, target);
          sink = gain;
          sinks.set(target.context, sink);
        }
        connect.call(this, sink, ...rest);
        return target;
      }
      return connect.call(this, target, ...rest);
    } as unknown as typeof AudioNode.prototype.connect;
  }
}
