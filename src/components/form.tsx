"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/server/action-state";

export function SubmitButton({
  children,
  className = "btn-primary",
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  /// Spells out the action when the visible label is only a short word.
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
    >
      {pending ? <span aria-hidden className="spinner" /> : null}
      {children}
    </button>
  );
}

/// Renders the error/success key returned by a server action.
export function FormMessage({ state }: { state: ActionState }) {
  const errors = useTranslations("Errors");
  const success = useTranslations("Success");

  if (state.error) {
    return (
      <p role="alert" className="alert alert-error">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          className="mt-px h-4 w-4 shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5M12 16.2v.01" />
        </svg>
        {errors.has(state.error) ? errors(state.error) : state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p role="status" className="alert alert-success">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-px h-4 w-4 shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m8.2 12.4 2.6 2.6 5-5.4" />
        </svg>
        {success.has(state.success) ? success(state.success) : state.success}
      </p>
    );
  }

  return null;
}

/// Groups related fields inside a long form, separated by a rule.
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-line pt-6 first:border-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? <p className="hint">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/// Label + control + hint. The wrapping label ties the text to its input.
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="hint block">{hint}</span> : null}
    </label>
  );
}
