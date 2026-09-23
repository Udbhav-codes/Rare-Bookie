"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "@/app/actions/auth";
import { submitWith } from "@/components/form";
import type { ActionState } from "@/lib/types";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});
  const [show, setShow] = useState(false);

  return (
    <form onSubmit={submitWith(action)} className="card mt-8 space-y-5 p-6 sm:p-8" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.message && (
        <p className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad" role="alert">
          {state.message}
        </p>
      )}
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className="field"
          aria-invalid={!!state.errors?.email}
          aria-describedby={state.errors?.email ? "email-err" : undefined}
          autoFocus
        />
        {state.errors?.email && (
          <p id="email-err" className="field-error">
            {state.errors.email}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="field pr-12"
            aria-invalid={!!state.errors?.password}
            aria-describedby={state.errors?.password ? "password-err" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="icon-btn absolute right-0 top-0"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
        {state.errors?.password && (
          <p id="password-err" className="field-error">
            {state.errors.password}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
