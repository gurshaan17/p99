"use client";

import { useState, type FormEvent } from "react";
import { PrimaryButton } from "@/components/ui/button";

/**
 * Stateless-signup form.
 *
 * There is no backend, so the form composes a prefilled message in the visitor's
 * own mail client. That actually delivers the message, which is the only
 * property that matters here — a form that POSTs nowhere and says "thanks" is a
 * lie (DESIGN.md section 15).
 *
 * When no receiving address is configured the form is not rendered at all,
 * rather than shown in a state that cannot succeed.
 */
export function MailtoSignup({
  to,
  cta,
  placeholder,
  subject,
  body,
}: {
  to: string;
  cta: string;
  placeholder: string;
  subject: string;
  body: (value: string) => string;
}) {
  const [value, setValue] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body(value.trim()))}`;
    window.location.href = href;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor={`${subject}-input`} className="sr-only">
        {placeholder}
      </label>
      <input
        id={`${subject}-input`}
        type="email"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 min-w-0 flex-1 rounded-control border border-line bg-page px-3 text-body text-ink outline-none transition-colors duration-(--dur-hover) placeholder:text-ink-3 focus-visible:border-line-strong"
      />
      <PrimaryButton type="submit" className="shrink-0 sm:w-auto">
        {cta}
      </PrimaryButton>
    </form>
  );
}
