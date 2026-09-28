"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { questions } from "@/lib/questions";
import { nav, topicNav } from "@/lib/nav";

/**
 * Command palette — DESIGN.md section 7.9.
 *
 * A centred dialog over a 1px scrim. Grouped with a dashed hairline above each
 * heading. Opened with ⌘/Ctrl+K, and every row is a real link so the palette
 * degrades to plain navigation if JS-driven routing is unavailable.
 *
 * Nothing here is rendered until it is opened, so the closed state costs no DOM.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const setOpen = onOpenChange;

  // ⌘/Ctrl+K opens the palette. Mounted once, from the topbar, so the shortcut
  // has exactly one listener — the same constraint the theme toggle follows.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // ⌘/Ctrl+E jumps to a random incident (section 7.1).
  const surpriseMe = useCallback(() => {
    const pick = questions[Math.floor(Math.random() * questions.length)];
    if (pick) router.push(`/q/${pick.slug}`);
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "e" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        surpriseMe();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [surpriseMe]);

  if (!open) return null;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search incidents and pages"
      className="fixed top-1/4 left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card border border-line bg-page shadow-float"
      overlayClassName="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[2px]"
    >
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search aria-hidden className="size-4 shrink-0 text-ink-3" />
        <Command.Input
          autoFocus
          placeholder="Search incidents, topics, pages…"
          className="h-11 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
        />
      </div>

      <Command.List className="max-h-64 overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-6 text-center text-body text-ink-3">
          No matches.
        </Command.Empty>

        <Group heading="Go to">
          {nav.map((item) => (
            <Row key={item.href} onSelect={() => router.push(item.href)}>
              {item.label}
            </Row>
          ))}
        </Group>

        <Group heading="Incidents">
          {questions.map((q) => (
            <Row
              key={q.slug}
              value={`${q.title} ${q.description} ${q.topic}`}
              onSelect={() => router.push(`/q/${q.slug}`)}
            >
              <span className="font-mono text-micro tracking-wider text-ink-3 uppercase">
                {q.topic}
              </span>
              <span className="truncate">{q.title}</span>
            </Row>
          ))}
        </Group>

        <Group heading="Topics">
          {topicNav.map((t) => (
            <Row
              key={t.href}
              value={t.label}
              onSelect={() => router.push(t.href)}
            >
              {t.label}
              <span className="ml-auto font-mono text-micro text-ink-3 tabular-nums">
                {t.count}
              </span>
            </Row>
          ))}
        </Group>

        <Group heading="Actions">
          <Row onSelect={surpriseMe}>
            Surprise me
            <kbd className="ml-auto font-mono text-micro text-ink-3">⌘E</kbd>
          </Row>
        </Group>
      </Command.List>
    </Command.Dialog>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 border-t border-dashed border-line pt-1 first:border-0 first:pt-0 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase"
    >
      {children}
    </Command.Group>
  );
}

function Row({
  children,
  onSelect,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-chip px-2 py-1.5 text-body text-ink-2 data-[selected=true]:bg-field data-[selected=true]:text-ink"
    >
      {children}
    </Command.Item>
  );
}
