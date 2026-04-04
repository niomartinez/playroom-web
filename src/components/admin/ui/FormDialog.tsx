"use client";

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saving?: boolean;
}

export default function FormDialog({
  open,
  onClose,
  title,
  children,
  onSave,
  saving = false,
}: FormDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #171717 0%, #000000 100%)",
          border: "1px solid rgba(208,135,0,0.3)",
          boxShadow:
            "0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(208,135,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.2)" }}
        >
          <h2 className="font-bold text-lg" style={{ color: "#f0b100" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6a7282] hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(208,135,0,0.2)" }}
        >
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[#99a1af] hover:text-white transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg px-6 py-2 text-sm font-semibold text-black disabled:opacity-50"
            style={{ backgroundColor: "#f0b100" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
