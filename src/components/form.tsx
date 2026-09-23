import { startTransition, type FormEvent } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import type { ActionState } from "@/lib/types";

export function Field({
  id,
  label,
  optional,
  error,
  help,
  children,
  className = "",
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label} {optional && <span className="opt">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : (
        help && <p className="field-help">{help}</p>
      )}
    </div>
  );
}

/** Props to wire an input to its Field error. */
export function errProps(state: ActionState, name: string) {
  const err = state.errors?.[name];
  return { "aria-invalid": !!err, "aria-describedby": err ? `${name}-err` : undefined };
}

export function Notice({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return state.ok ? (
    <p className="flex items-start gap-2 rounded-xl bg-ok-bg px-4 py-3 text-sm font-medium text-ok" role="status">
      <CheckCircle2 size={18} className="mt-px shrink-0" aria-hidden /> {state.message}
    </p>
  ) : (
    <p className="flex items-start gap-2 rounded-xl bg-bad-bg px-4 py-3 text-sm font-medium text-bad" role="alert">
      <CircleAlert size={18} className="mt-px shrink-0" aria-hidden /> {state.message}
    </p>
  );
}

export function FormErrorsSummary({ state }: { state: ActionState }) {
  const n = Object.keys(state.errors ?? {}).length;
  if (!n) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-bad-bg px-4 py-3 text-sm font-medium text-bad" role="alert">
      <CircleAlert size={18} className="mt-px shrink-0" aria-hidden />
      {n === 1 ? "One field needs attention." : `${n} fields need attention.`} Check the highlighted fields below.
    </p>
  );
}

/**
 * Submit via onSubmit instead of <form action>, so React doesn't auto-reset the fields
 * when the server returns validation errors. Successful submits reset by remounting (key).
 */
export function submitWith(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => action(fd));
  };
}
