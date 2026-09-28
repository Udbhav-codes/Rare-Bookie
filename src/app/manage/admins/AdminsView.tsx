"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Trash2, UserPlus } from "lucide-react";
import { addAdmin, changeMyPassword, removeAdmin } from "@/app/actions/admins";
import { errProps, Field, FormErrorsSummary, Notice, submitWith } from "@/components/form";
import type { ActionState } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type AdminRow = { id: number; name: string; email: string; created_at: string | null };

export function AdminsView({ admins, meId }: { admins: AdminRow[]; meId: number }) {
  const [addState, add, adding] = useActionState<ActionState, FormData>(addAdmin, {});
  const [delState, del] = useActionState<ActionState, FormData>(removeAdmin, {});
  const [confirming, setConfirming] = useState<AdminRow | null>(null);

  const [seenDel, setSeenDel] = useState(delState);
  if (delState !== seenDel) {
    setSeenDel(delState);
    setConfirming(null);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section aria-labelledby="who-h">
        <h2 id="who-h" className="display text-3xl">
          Who can manage the library
        </h2>
        <p className="mt-1 text-ink-soft">
          Everyone listed here can lend, return, add and delete books. Admins can add and remove each other, but not themselves.
        </p>

        <div className="mt-4 space-y-3">
          <Notice state={delState} />
          <ul className="card divide-y divide-line">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gilt font-display text-lg text-[#2a1f08]" aria-hidden>
                  {a.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">
                    {a.name}
                    {a.id === meId && <span className="ml-2 rounded-full bg-paper-2 px-2 py-0.5 text-xs font-medium text-ink-soft">You</span>}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{a.email}</p>
                </div>
                {a.created_at && <span className="hidden shrink-0 text-xs text-ink-soft sm:block">Added {formatDate(a.created_at.slice(0, 10))}</span>}
                <button
                  type="button"
                  className="icon-btn h-9 w-9 shrink-0 text-bad disabled:opacity-30"
                  aria-label={`Remove ${a.name}`}
                  title={a.id === meId ? "You can't remove your own account" : admins.length <= 1 ? "The last admin can't be removed" : `Remove ${a.name}`}
                  disabled={a.id === meId || admins.length <= 1}
                  onClick={() => setConfirming(a)}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <h3 className="display mt-10 text-2xl">Add an admin</h3>
        <div className="mt-3 space-y-4">
          <Notice state={addState} />
          <FormErrorsSummary state={addState} />
          <AddAdminForm key={addState.stamp ?? 0} state={addState} action={add} pending={adding} />
        </div>
      </section>

      <ChangePassword />

      {confirming && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0b1020]/55" onClick={() => setConfirming(null)} aria-hidden />
          <form action={del} role="alertdialog" aria-modal="true" aria-labelledby="rm-h" className="card reveal relative w-full max-w-md p-6">
            <input type="hidden" name="id" value={confirming.id} />
            <h3 id="rm-h" className="display text-2xl">
              Remove {confirming.name}?
            </h3>
            <p className="mt-2 text-ink-soft">
              They will no longer be able to sign in to Manage. Books and loan records they created stay exactly as they are.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(null)} autoFocus>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger">
                Remove admin
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AddAdminForm({ state, action, pending }: { state: ActionState; action: (fd: FormData) => void; pending: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <form onSubmit={submitWith(action)} className="card space-y-5 p-5 sm:p-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="new-name" label="Name" error={state.errors?.name}>
          <input id="new-name" name="name" className="field" autoComplete="off" {...errProps(state, "name")} />
        </Field>
        <Field id="new-email" label="Email" error={state.errors?.email} help="They sign in with this.">
          <input id="new-email" name="email" type="email" className="field" autoComplete="off" {...errProps(state, "email")} />
        </Field>
        <Field id="new-password" label="Password" error={state.errors?.password} help="At least 10 characters. Share it with them directly." className="sm:col-span-2">
          <div className="relative">
            <input
              id="new-password"
              name="password"
              type={show ? "text" : "password"}
              className="field pr-12"
              autoComplete="new-password"
              {...errProps(state, "password")}
            />
            <button
              type="button"
              className="icon-btn absolute right-0 top-0"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
            >
              {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>
        </Field>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <UserPlus size={16} aria-hidden /> {pending ? "Adding…" : "Add admin"}
        </button>
      </div>
    </form>
  );
}

function ChangePassword() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changeMyPassword, {});
  const [show, setShow] = useState(false);
  return (
    <section aria-labelledby="pw-h" className="lg:sticky lg:top-36 lg:self-start">
      <h2 id="pw-h" className="display text-3xl">
        Your password
      </h2>
      <p className="mt-1 text-ink-soft">Changes take effect the next time you sign in.</p>
      <div className="mt-4 space-y-4">
        <Notice state={state} />
        <FormErrorsSummary state={state} />
        <form key={state.stamp ?? 0} onSubmit={submitWith(action)} className="card space-y-5 p-5 sm:p-6" noValidate>
          <Field id="current" label="Current password" error={state.errors?.current}>
            <input id="current" name="current" type="password" className="field" autoComplete="current-password" {...errProps(state, "current")} />
          </Field>
          <Field id="next" label="New password" error={state.errors?.next} help="At least 10 characters.">
            <div className="relative">
              <input
                id="next"
                name="next"
                type={show ? "text" : "password"}
                className="field pr-12"
                autoComplete="new-password"
                {...errProps(state, "next")}
              />
              <button
                type="button"
                className="icon-btn absolute right-0 top-0"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
              >
                {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
          </Field>
          <Field id="confirm" label="Repeat new password" error={state.errors?.confirm}>
            <input id="confirm" name="confirm" type="password" className="field" autoComplete="new-password" {...errProps(state, "confirm")} />
          </Field>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
