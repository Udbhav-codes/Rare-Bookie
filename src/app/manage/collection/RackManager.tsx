"use client";

import { useActionState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { addRackRow, removeRackRow, saveLoanDays } from "@/app/actions/library";
import { Notice, submitWith } from "@/components/form";
import { RackMap } from "@/components/RackMap";
import type { ActionState, RackSummary } from "@/lib/types";
import { RACK_COLUMNS } from "@/lib/utils";

export function RackManager({ rows, summary }: { rows: number; summary: RackSummary }) {
  const [state, run] = useActionState<ActionState, "add" | "remove">(
    (_prev, op) => (op === "add" ? addRackRow() : removeRackRow()),
    {},
  );
  const [pending, start] = useTransition();
  const lastRow = Array.from({ length: RACK_COLUMNS }, (_, i) => `R${(rows - 1) * RACK_COLUMNS + i + 1}`);
  const lastRowUsed = lastRow.some((r) => summary[r]);
  const next = rows * RACK_COLUMNS + 1;

  return (
    <section aria-labelledby="rack-h" className="card p-5 sm:p-6">
      <h2 id="rack-h" className="display text-2xl">
        Rack layout
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {rows} rows × {RACK_COLUMNS} compartments. New rows are added at the bottom and numbered on from R{next - 1}.
      </p>
      <div className="mt-4">
        <Notice state={state} />
      </div>
      <RackMap rows={rows} summary={summary} className="mt-4" />
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(() => run("add"))}>
          <Plus size={15} aria-hidden /> Add a row (R{next}–R{next + RACK_COLUMNS - 1})
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={pending || rows <= 1 || lastRowUsed}
          onClick={() => start(() => run("remove"))}
          title={lastRowUsed ? "Move the books out of the last row first" : undefined}
        >
          <Minus size={15} aria-hidden /> Remove last row
        </button>
      </div>
      {lastRowUsed && rows > 1 && (
        <p className="field-help">
          The last row ({lastRow.join(", ")}) has books in it, so it can’t be removed. Move them to another compartment first.
        </p>
      )}
    </section>
  );
}

export function LoanDaysForm({ days }: { days: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveLoanDays, {});
  return (
    <section aria-labelledby="loan-h" className="card p-5 sm:p-6">
      <h2 id="loan-h" className="display text-2xl">
        Loan period
      </h2>
      <p className="mt-1 text-sm text-ink-soft">How long a new loan lasts by default. You can still change the due date on each loan.</p>
      <div className="mt-3">
        <Notice state={state} />
      </div>
      <form onSubmit={submitWith(action)} className="mt-3 flex items-end gap-2">
        <div>
          <label htmlFor="days" className="field-label">
            Days
          </label>
          <input id="days" name="days" type="number" min={1} max={120} defaultValue={days} className="field w-28" />
        </div>
        <button type="submit" className="btn btn-outline" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}
