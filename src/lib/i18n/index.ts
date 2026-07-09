"use client";

import { useCallback } from "react";
import { useGame } from "../game-context";
import en from "./en";
import zhHans from "./zh-Hans";

export type Lang = "en" | "zh-Hans";

const DICTS: Record<Lang, Record<string, string>> = {
  en,
  "zh-Hans": zhHans,
};

/**
 * Normalizes any launch/persisted language token to one of the two supported
 * locales. `zh-Hans`, `zh-CN`, and bare `zh` (plus case/underscore variants)
 * map to Simplified Chinese; everything else falls back to English.
 */
export function normalizeLang(raw: string | null | undefined): Lang {
  if (!raw) return "en";
  const v = raw.toLowerCase().replace(/_/g, "-");
  if (v === "zh-hans" || v === "zh-cn" || v === "zh" || v.startsWith("zh-hans")) {
    return "zh-Hans";
  }
  return "en";
}

/** Fill `{var}` placeholders in a template from a vars map. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Translate a key against a specific language dictionary. Falls back to the
 * English string, then to the raw key, so a missing translation never blanks
 * the UI. Exported for non-hook call sites (e.g. helpers that receive `lang`).
 */
export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTS[lang] ?? en;
  const template = dict[key] ?? en[key] ?? key;
  return interpolate(template, vars);
}

/**
 * Player-UI translation hook. Reads the active `lang` from GameContext (which
 * itself resolves persisted choice > launch ?lang= > default) and returns a
 * memoized `t(key, vars?)` with `{var}` interpolation.
 */
export function useT(): TFunction {
  const { lang } = useGame();
  const normalized = normalizeLang(lang);
  return useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(normalized, key, vars),
    [normalized],
  );
}
