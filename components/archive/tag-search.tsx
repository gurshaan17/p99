"use client";

import { useId, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Tag search — DESIGN.md sections 7.12, 8.4.
 *
 * Replaces the tag dropdown this archive used to have. The vocabulary passed the
 * point where a menu is browsable: every tag in use was a row in one listbox, so
 * finding `autovacuum` meant scrolling a list of forty to find out whether it was
 * there at all. A reader who wants a tag already knows the word — they want to type
 * it, not go looking for it in a menu. This is the same filter with the knowledge
 * the reader already has as the input.
 *
 * Presentational on purpose: it owns only what a text field owns — the text, which
 * suggestion is highlighted, and whether the menu is open. The match list comes in
 * as a prop from `ArchiveView`, which already owns the filter state, so there is one
 * owner of "which tag is active" rather than a child and a parent each holding half
 * of it.
 *
 * Typing filters on every matching tag at once (an OR, as the dropdown was), and
 * choosing a suggestion pins exactly that one — which is the only way to narrow when
 * one word is a substring of several tags, the way `cache` is of `cache-stampede` and
 * `cache-aside`. The pinned tag stays in the field as its own text so it can be
 * edited rather than re-picked.
 *
 * Nothing matched is not an error and does not empty the archive: a reader who
 * mistypes a tag should see the note and the unfiltered list, not a page that looks
 * broken because of a letter. An empty result is only ever the honest consequence of
 * the other two filters, which is what the existing empty state is for.
 */

export type TagOption = { tag: string; count: number };

/**
 * Enough suggestions to recognise the right tag without turning the menu back into
 * the list it replaced. `matchTags` ranks, so what gets cut off is the worst of it.
 */
const MAX_SUGGESTIONS = 8;

export function TagSearch({
  matches,
  value,
  pinnedTag,
  resultCount,
  totalCount,
  onValueChange,
  onPin,
}: {
  matches: readonly TagOption[];
  value: string;
  pinnedTag: string | null;
  resultCount: number;
  totalCount: number;
  onValueChange: (value: string) => void;
  onPin: (tag: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listId = useId();

  const searching = value.trim().length > 0;
  const suggestions = matches.slice(0, MAX_SUGGESTIONS);
  const menuOpen = open && searching && suggestions.length > 0;
  const activeId = menuOpen ? `${listId}-${highlight}` : undefined;

  function edit(next: string) {
    onValueChange(next);
    // Editing unpins. The pin means "exactly this tag", which is a claim about the
    // whole text; once the text is no longer the tag, the claim is stale and the
    // suggestion list is the better interpretation.
    onPin(null);
    setHighlight(0);
    setOpen(true);
  }

  function choose(tag: string) {
    onValueChange(tag);
    onPin(tag);
    setOpen(false);
  }

  return (
    <div className="relative" role="search">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3"
      />
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search tags
      </label>
      <input
        id={`${listId}-input`}
        data-touch-target
        type="search"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={menuOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        value={value}
        placeholder="Search tags"
        onChange={(event) => edit(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setHighlight((current) => {
              const next = current + (event.key === "ArrowDown" ? 1 : -1);
              if (next < 0) return suggestions.length - 1;
              if (next >= suggestions.length) return 0;
              return next;
            });
            return;
          }

          if (event.key === "Enter") {
            // Only claim Enter when there is a suggestion to take. With nothing
            // matching, Enter has to fall through to the page rather than pinning a
            // tag that does not exist.
            const chosen = suggestions[highlight];
            if (chosen) {
              event.preventDefault();
              choose(chosen.tag);
            }
            return;
          }

          if (event.key === "Escape") {
            // The menu first, the text second: Escape on an open menu is a
            // dismissal, and only an Escape with nothing left to dismiss clears what
            // was typed.
            if (menuOpen) setOpen(false);
            else if (value) edit("");
            return;
          }

          if (event.key === "Tab") setOpen(false);
        }}
        className="h-8 w-44 rounded-full border border-line bg-page pr-8 pl-8 text-body text-ink outline-none transition-colors duration-(--dur-hover) ease-(--ease-out) placeholder:text-ink-3 hover:border-line-strong focus-visible:border-line-strong"
      />

      {searching ? (
        <button
          type="button"
          data-touch-target
          onClick={() => edit("")}
          aria-label="Clear tag search"
          className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 transition-colors duration-(--dur-hover) ease-(--ease-out) hover:bg-field hover:text-ink"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}

      {/*
        Rendered only while there is something to show, rather than held in the DOM
        and revealed the way the old chip menu was: this menu is driven by text that
        is still being typed, and a stale open menu over a half-typed word is worse
        than no menu at all.
      */}
      {menuOpen ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Matching tags"
          className="absolute top-full left-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-card border border-line bg-page p-1 shadow-float"
        >
          {/*
            `onMouseDown` with `preventDefault` rather than `onClick` on the option:
            the field loses focus on mousedown, so closing the menu on blur would take
            it away before the click landed.
          */}
          {suggestions.map((option, index) => (
            <button
              key={option.tag}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={pinnedTag === option.tag}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.tag)}
              onMouseEnter={() => setHighlight(index)}
              className={`flex w-full items-baseline gap-2 rounded-chip px-2 py-1.5 text-left text-body transition-colors duration-(--dur-hover) hover:bg-field ${
                index === highlight ? "text-ink" : "text-ink-2"
              }`}
            >
              <span
                className={
                  pinnedTag === option.tag
                    ? "font-medium capitalize"
                    : "capitalize"
                }
              >
                {option.tag}
              </span>
              <span className="ml-auto font-mono text-micro text-ink-3 tabular-nums">
                {option.count}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {searching && matches.length === 0 ? (
        <p className="pointer-events-none absolute top-full left-0 z-30 mt-1 w-56 rounded-card border border-line bg-page px-3 py-2 text-small text-ink-3 shadow-float">
          No tag matches <span className="text-ink-2">{value.trim()}</span>.
        </p>
      ) : null}

      {/*
        A live region, because filtering a list by typing gives no other feedback
        that anything happened — and the count beside the list is the visual version
        of the same fact. Always rendered, since a live region added to the DOM at
        the moment its content arrives is frequently missed.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {!searching
          ? ""
          : matches.length === 0
            ? `No tag matches ${value.trim()}.`
            : `${matches.length} ${matches.length === 1 ? "tag" : "tags"} match, showing ${resultCount} of ${totalCount} incidents.`}
      </p>
    </div>
  );
}
