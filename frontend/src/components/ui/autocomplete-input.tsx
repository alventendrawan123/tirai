"use client";

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./input";

export interface AutocompleteInputProps
  extends Omit<InputProps, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  suggestions: ReadonlyArray<string>;
  maxResults?: number;
  emptyHint?: string;
  onSelectSuggestion?: (value: string) => void;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  maxResults = 8,
  emptyHint,
  onSelectSuggestion,
  className,
  disabled,
  readOnly,
  id,
  ...rest
}: AutocompleteInputProps) {
  const reactId = useId();
  const listboxId = id ? `${id}-listbox` : `combobox-${reactId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const matched =
      q.length === 0
        ? suggestions
        : suggestions.filter((s) => s.toLowerCase().includes(q));
    return matched.slice(0, maxResults);
  }, [value, suggestions, maxResults]);

  useEffect(() => {
    setHighlight(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleDown = (event: MouseEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (node.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [open]);

  const commitSuggestion = (next: string) => {
    onChange(next);
    onSelectSuggestion?.(next);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setHighlight((prev) => {
        if (filtered.length === 0) return -1;
        const next = prev + 1;
        return next >= filtered.length ? 0 : next;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      setHighlight((prev) => {
        if (filtered.length === 0) return -1;
        const next = prev - 1;
        return next < 0 ? filtered.length - 1 : next;
      });
      return;
    }
    if (event.key === "Enter") {
      if (open && highlight >= 0 && highlight < filtered.length) {
        event.preventDefault();
        commitSuggestion(filtered[highlight]);
      }
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setHighlight(-1);
      }
      return;
    }
    if (event.key === "Tab" && open) {
      setOpen(false);
    }
  };

  const isInteractive = !disabled && !readOnly;
  const showList = open && isInteractive && filtered.length > 0;
  const activeOptionId =
    highlight >= 0 ? `${listboxId}-option-${highlight}` : undefined;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        {...rest}
        id={id}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(event) => {
          onChange(event.target.value);
          if (!open && isInteractive) setOpen(true);
        }}
        onFocus={() => {
          if (isInteractive) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        autoComplete="off"
        aria-expanded={showList}
        aria-controls={showList ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
      />
      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          className="border-subtle bg-main absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-md"
        >
          {filtered.map((suggestion, index) => {
            const optionId = `${listboxId}-option-${index}`;
            const isHighlighted = index === highlight;
            return (
              <li
                key={suggestion}
                id={optionId}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitSuggestion(suggestion);
                }}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm transition-colors",
                  isHighlighted
                    ? "bg-secondary text-primary"
                    : "text-secondary hover:bg-secondary hover:text-primary",
                )}
              >
                {highlightMatch(suggestion, value)}
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && isInteractive && filtered.length === 0 && emptyHint ? (
        <p className="text-muted absolute z-20 mt-1 px-3 py-2 text-xs">
          {emptyHint}
        </p>
      ) : null}
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  const trimmed = query.trim();
  if (trimmed.length === 0) return text;
  const lower = text.toLowerCase();
  const needle = trimmed.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-medium">
        {text.slice(idx, idx + needle.length)}
      </span>
      {text.slice(idx + needle.length)}
    </>
  );
}
