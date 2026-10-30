import { test, expect, type Browser, type BrowserType } from "@playwright/test";
import config from "../playwright.config";
import {
  launchSilently,
  muteMediaInWebKit,
  newSilentContext,
  qaMuted,
  silentChromiumArgs,
} from "./support/silent";

// The Silent QA policy (CLAUDE.md). No test here asks for a browser fixture, so none of them
// launches one or makes a sound.

test("a run is silent unless PLAYROOM_QA_AUDIBLE=1", () => {
  expect(qaMuted({})).toBe(true);
  expect(qaMuted({ PLAYROOM_QA_AUDIBLE: "" })).toBe(true);
  expect(qaMuted({ PLAYROOM_QA_AUDIBLE: "0" })).toBe(true);
  expect(qaMuted({ PLAYROOM_QA_AUDIBLE: "true" })).toBe(true);
  expect(qaMuted({ PLAYROOM_QA_AUDIBLE: "1" })).toBe(false);
  expect(silentChromiumArgs({})).toEqual(["--mute-audio"]);
  expect(silentChromiumArgs({ PLAYROOM_QA_AUDIBLE: "1" })).toEqual([]);
});

test("the configured browser launches with audio off", () => {
  test.skip(!qaMuted(), "PLAYROOM_QA_AUDIBLE=1 is set for this run");
  expect(config.use?.launchOptions?.args).toContain("--mute-audio");
});

test("a spec that launches its own browser is muted too", async () => {
  const launched: unknown[] = [];
  const engine = (name: string) =>
    ({
      name: () => name,
      launch: async (options: unknown) => {
        launched.push(options);
        return {};
      },
    }) as unknown as BrowserType;

  await launchSilently(engine("chromium"), {});
  await launchSilently(engine("webkit"), {});
  await launchSilently(engine("chromium"), { PLAYROOM_QA_AUDIBLE: "1" });
  expect(launched).toEqual([{ args: ["--mute-audio"] }, { args: [] }, { args: [] }]);
});

test("WebKit has no launch switch, so its pages are muted from inside", async () => {
  const injected: unknown[] = [];
  const browser = (name: string) =>
    ({
      browserType: () => ({ name: () => name }),
      newContext: async () => ({
        addInitScript: async (script: unknown) => {
          injected.push(script);
        },
      }),
    }) as unknown as Browser;

  await newSilentContext(browser("webkit"), undefined, {});
  await newSilentContext(browser("chromium"), undefined, {});
  await newSilentContext(browser("webkit"), undefined, { PLAYROOM_QA_AUDIBLE: "1" });
  expect(injected).toEqual([muteMediaInWebKit]);
});
