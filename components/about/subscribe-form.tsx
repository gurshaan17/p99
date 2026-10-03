"use client";

import { useState, type FormEvent } from "react";
import { PrimaryButton } from "@/components/ui/button";

/**
 * Newsletter capture form — DESIGN.md sections 8.5, 15a.
 *
 * Replaces the mailto composer for the newsletter only. Capture no longer needs a
 * receiving address, so this form is not gated on `CONTACT_EMAIL`: there is a real
 * endpoint behind it, so rendering "the list is not open yet" would be the lie that
 * section 15a is about. The topic-suggestion form is still a mailto and stays
 * gated, because that one still needs an inbox to be worth anything.
 *
 * Three inline states and no navigation or modal, matching every other small
 * interaction here (DESIGN.md section 8.5: "no modal signup"). The input stays
 * mounted and keeps focus on failure, so a rejected address is a one-character
 * fix rather than a retype.
 *
 * The success line deliberately does not say whether the address was already on
 * the list — the endpoint cannot tell this component that, and it should not
 * guess. It promises the welcome note, which goes out exactly once per address.
 */

type State = "idle" | "submitting" | "done" | "error";

export function SubscribeForm() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    // Double-submit guard. `required` handles the empty case and `type="email"`
    // the obviously malformed one, but the browser does not stop a second click
    // while the first request is in flight.
    if (state === "submitting") return;

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value.trim() }),
      });

      if (response.ok) {
        setValue("");
        setState("done");
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      setState("error");
      setMessage(
        typeof body === "object" &&
          body !== null &&
          typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : "Something went wrong. Try again shortly.",
      );
    } catch {
      setState("error");
      setMessage("Could not reach the server. Try again shortly.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="subscribe-input" className="sr-only">
          Email address
        </label>
        <input
          id="subscribe-input"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={state === "submitting" || state === "done"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            // Clear a standing error as soon as the reader edits, so the message
            // is never scolding someone mid-correction.
            if (state === "error") setState("idle");
          }}
          placeholder="you@example.com"
          className="h-10 min-w-0 flex-1 rounded-control border border-line bg-page px-3 text-body text-ink outline-none transition-colors duration-(--dur-hover) placeholder:text-ink-3 focus-visible:border-line-strong disabled:opacity-60"
        />
        <PrimaryButton
          type="submit"
          className="shrink-0 sm:w-auto disabled:opacity-60"
          disabled={state === "submitting" || state === "done"}
        >
          {state === "submitting" ? "Adding…" : "Subscribe"}
        </PrimaryButton>
      </div>

      {/*
        `role="status"` so the line change is announced rather than being a purely
        visual swap, and `aria-live` polite so it does not interrupt. Always
        rendered, so the live region exists before the text arrives — a live
        region added to the DOM at the same moment as its content is frequently
        missed by screen readers.
      */}
      <p
        role="status"
        aria-live="polite"
        className={`text-small text-pretty ${
          state === "error" ? "text-danger" : "text-ink-3"
        }`}
      >
        {state === "done"
          ? "You're in. A welcome note is on its way — the daily incident follows from there."
          : message}
      </p>
    </form>
  );
}
