"use client";

import { useState } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminQuery } from "@/lib/admin-query";
import { useToast } from "@/lib/toast-context";

interface LineItem {
  label: string;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  period_year: number;
  period_month: number;
  currency: string;
  total_amount: number;
  package_label: string;
  line_items: LineItem[];
  bill_to: Record<string, string | null>;
  bill_from: Record<string, string | null>;
  remit_to: Record<string, string | null>;
  usage_players: number;
  usage_rounds: number;
  usage_stream_hours: number;
  usage_peak_hour_players: number;
  show_usage: boolean;
  status: "issued" | "paid" | "cancelled";
  issued_at: string;
  due_date: string;
  paid_at: string | null;
  is_overdue: boolean;
}

interface InvoicesResponse {
  invoices?: Invoice[];
  totals?: { collected: number; outstanding: number };
}

const ENDPOINT = "/api/admin/billing/invoices";

const GOLD = "#f0b100";
const DIM = "#6a7282";
const MUTED = "#99a1af";
const CARD_BG = "#171717";
const CARD_BORDER = "1px solid rgba(208,135,0,0.2)";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function money(amount: number, currency = "PHP") {
  return `${currency} ${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function periodLabel(inv: Invoice) {
  return `${MONTHS[inv.period_month - 1]} ${inv.period_year}`;
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/* The vendor-side books: what we invoice for running the platform, and what has
   been paid. Reachable only by the people in billing_viewers — the permissions
   matrix grants this section to no role at all, so there is no "admin enough"
   that gets here by accident.

   Ordered by what the page is actually for: the current month's document is the
   thing you came to download, so it leads; history is a list you scan; the rate
   card is a rarely-touched setting and sits at the bottom behind its own
   heading. */
export default function BillingPage() {
  const { data, loading, refreshing, refetch } =
    useAdminQuery<InvoicesResponse>(ENDPOINT);
  const { toast } = useToast();

  const invoices = data?.invoices ?? [];
  const totals = data?.totals;
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Invoice | null>(null);
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState("bank transfer");
  const [payReference, setPayReference] = useState("");

  async function post(path: string, body: unknown, okMessage: string) {
    setBusy(path);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail?.message || json?.message || "Failed");
      toast({ type: "success", message: okMessage });
      refetch();
      return true;
    } catch (err) {
      toast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed",
      });
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div style={{ color: MUTED, padding: 24 }}>Loading billing…</div>;
  }

  return (
    <div style={{ padding: "0 4px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#fff", margin: 0 }}>
          Billing
        </h1>
        <RefreshingHint show={refreshing} />
      </div>
      <p style={{ color: DIM, fontSize: 13, margin: "0 0 24px" }}>
        Issued automatically on the 1st for the month that just closed.
        Documents are downloaded here and sent by hand.
      </p>

      {totals && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            ["Collected", totals.collected],
            ["Outstanding", totals.outstanding],
          ].map(([label, value]) => (
            <div
              key={label as string}
              style={{
                background: CARD_BG,
                border: CARD_BORDER,
                borderRadius: 10,
                padding: "14px 18px",
                minWidth: 180,
              }}
            >
              <div style={{ color: DIM, fontSize: 11, letterSpacing: 0.4 }}>
                {String(label).toUpperCase()}
              </div>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginTop: 4 }}>
                {money(value as number)}
              </div>
            </div>
          ))}
        </div>
      )}

      {invoices.length === 0 && (
        <div
          style={{
            background: CARD_BG,
            border: CARD_BORDER,
            borderRadius: 10,
            padding: 28,
            color: MUTED,
            fontSize: 14,
          }}
        >
          No invoices yet. The first one is issued once a month has closed.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {invoices.map((inv) => (
          <div
            key={inv.id}
            style={{
              background: CARD_BG,
              border: CARD_BORDER,
              borderRadius: 10,
              padding: 20,
              opacity: inv.status === "cancelled" ? 0.55 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#fff", fontSize: 17, fontWeight: 600 }}>
                    {periodLabel(inv)}
                  </span>
                  <StatusPill invoice={inv} />
                </div>
                <div style={{ color: DIM, fontSize: 12, marginTop: 4 }}>
                  {inv.invoice_number} · issued {fmtDate(inv.issued_at)} · due{" "}
                  {fmtDate(inv.due_date)}
                  {inv.paid_at ? ` · paid ${fmtDate(inv.paid_at)}` : ""}
                </div>
              </div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 600 }}>
                {money(inv.total_amount, inv.currency)}
              </div>
            </div>

            {inv.show_usage && (
              <div
                style={{
                  display: "flex",
                  gap: 28,
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  flexWrap: "wrap",
                }}
              >
                {[
                  [inv.usage_players.toLocaleString(), "Players served"],
                  [inv.usage_rounds.toLocaleString(), "Rounds dealt"],
                  [`${Number(inv.usage_stream_hours).toLocaleString()} h`, "Streaming delivered"],
                  [inv.usage_peak_hour_players.toLocaleString(), "Players, busiest hour"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div style={{ color: GOLD, fontSize: 16, fontWeight: 600 }}>{value}</div>
                    <div style={{ color: DIM, fontSize: 11 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <a
                href={`${ENDPOINT}/${inv.id}/invoice.pdf`}
                target="_blank"
                rel="noreferrer"
                style={buttonStyle(true)}
              >
                Invoice PDF
              </a>
              {inv.status === "paid" && (
                <a
                  href={`${ENDPOINT}/${inv.id}/receipt.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  style={buttonStyle(false)}
                >
                  Official Receipt
                </a>
              )}
              {inv.status === "issued" && (
                <>
                  <button
                    onClick={() =>
                      setPayFor(payFor?.id === inv.id ? null : inv)
                    }
                    style={buttonStyle(false)}
                  >
                    {payFor?.id === inv.id ? "Close" : "Mark paid"}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(inv)}
                    style={{ ...buttonStyle(false), color: "#f87171" }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>

            {payFor?.id === inv.id && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 14,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <input
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  placeholder="Payment method"
                  style={inlineInput}
                />
                <input
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Reference (optional)"
                  style={inlineInput}
                />
                <button
                  disabled={busy !== null}
                  onClick={async () => {
                    const ok = await post(
                      `${ENDPOINT}/${inv.id}/paid`,
                      {
                        payment_method: payMethod,
                        payment_reference: payReference || null,
                      },
                      "Marked paid",
                    );
                    if (ok) setPayFor(null);
                  }}
                  style={buttonStyle(true)}
                >
                  Record payment
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmCancel !== null}
        title={`Cancel ${confirmCancel?.invoice_number ?? ""}?`}
        message={
          confirmCancel
            ? `This voids the document and frees ${periodLabel(confirmCancel)} to be issued again. The cancelled invoice is kept.`
            : ""
        }
        confirmLabel="Cancel invoice"
        danger
        onClose={() => setConfirmCancel(null)}
        onConfirm={async () => {
          if (!confirmCancel) return;
          await post(
            `${ENDPOINT}/${confirmCancel.id}/cancel`,
            { reason: "cancelled from the billing console" },
            "Invoice cancelled",
          );
          setConfirmCancel(null);
        }}
      />

    </div>
  );
}

function StatusPill({ invoice }: { invoice: Invoice }) {
  const [label, color] = invoice.is_overdue
    ? ["OVERDUE", "#f87171"]
    : invoice.status === "paid"
      ? ["PAID", "#34d399"]
      : invoice.status === "cancelled"
        ? ["CANCELLED", DIM]
        : ["ISSUED", GOLD];
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: 0.6,
        fontWeight: 700,
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: "2px 8px",
      }}
    >
      {label}
    </span>
  );
}

function buttonStyle(primary: boolean) {
  return {
    display: "inline-block",
    fontSize: 13,
    fontWeight: 500,
    padding: "7px 14px",
    borderRadius: 7,
    cursor: "pointer",
    textDecoration: "none",
    color: primary ? "#161616" : MUTED,
    background: primary ? GOLD : "transparent",
    border: primary ? "1px solid transparent" : "1px solid rgba(255,255,255,0.14)",
  } as const;
}

const inlineInput = {
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(208,135,0,0.18)",
  borderRadius: 7,
  padding: "8px 10px",
  color: "#fff",
  fontSize: 13,
} as const;
