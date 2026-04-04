"use client";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-sm rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #171717 0%, #000000 100%)",
          border: danger
            ? "1px solid rgba(251,44,54,0.3)"
            : "1px solid rgba(208,135,0,0.3)",
          boxShadow:
            "0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(208,135,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4"
          style={{
            borderBottom: danger
              ? "1px solid rgba(251,44,54,0.2)"
              : "1px solid rgba(208,135,0,0.2)",
          }}
        >
          <h2
            className="font-bold text-lg"
            style={{ color: danger ? "#fb2c36" : "#f0b100" }}
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm" style={{ color: "#99a1af" }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{
            borderTop: danger
              ? "1px solid rgba(251,44,54,0.2)"
              : "1px solid rgba(208,135,0,0.2)",
          }}
        >
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[#99a1af] hover:text-white transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="rounded-lg px-6 py-2 text-sm font-semibold text-white"
            style={{
              backgroundColor: danger ? "#fb2c36" : "#f0b100",
              color: danger ? "#ffffff" : "#000000",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
