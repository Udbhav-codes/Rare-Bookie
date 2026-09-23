import { LOAN_STATUS_LABEL, loanStatus } from "@/lib/utils";

export function AvailabilityBadge({ available, total }: { available: number; total: number }) {
  if (total === 0) return <span className="badge badge-bad">Not in stock</span>;
  return available > 0 ? (
    <span className="badge badge-ok">Available{total > 1 ? ` · ${available}/${total}` : ""}</span>
  ) : (
    <span className="badge badge-warn">All lent</span>
  );
}

export function LoanStatusBadge({ due }: { due: string }) {
  const s = loanStatus(due);
  const cls = s === "overdue" ? "badge-bad" : s === "duesoon" ? "badge-warn" : "badge-ok";
  return <span className={`badge ${cls}`}>{LOAN_STATUS_LABEL[s]}</span>;
}
