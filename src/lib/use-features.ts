"use client";

import { useEffect, useState } from "react";

export interface FeatureFlags {
  live_chat_enabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  live_chat_enabled: false,
};

export function useFeatures(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/features")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const data = (json?.data ?? json) as Partial<FeatureFlags>;
        setFlags({
          live_chat_enabled: Boolean(data.live_chat_enabled),
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return flags;
}
