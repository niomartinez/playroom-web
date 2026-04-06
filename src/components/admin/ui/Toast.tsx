"use client";

import { useToast } from "@/lib/toast-context";

const COLORS = {
  success: { bg: "rgba(0,188,125,0.12)", border: "rgba(0,188,125,0.4)", text: "#00bc7d" },
  error: { bg: "rgba(251,44,54,0.12)", border: "rgba(251,44,54,0.4)", text: "#fb2c36" },
  info: { bg: "rgba(240,177,0,0.12)", border: "rgba(240,177,0,0.4)", text: "#f0b100" },
};

const ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-60 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const c = COLORS[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-slide-in-right min-w-[280px] max-w-[400px]"
            style={{
              backgroundColor: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
              backdropFilter: "blur(12px)",
            }}
          >
            {ICONS[t.type]}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="opacity-60 hover:opacity-100 transition-opacity ml-1 shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
