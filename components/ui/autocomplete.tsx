"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AutocompleteOption = { value: string; label: string; hint?: string };

// The one dropdown of the app: every select is this component (no native <select>).
// searchable (default): a combobox with a text input. Typing filters the list (Thai included). Use it for long or
//   growing lists such as products and categories.
// searchable={false}: a select-only combobox, a button that opens the same list. Use it for short fixed choices
//   such as status or role. Typing a letter jumps to the first matching option.
// Both: Arrow keys move, Enter picks, Escape closes. The value goes to the form through a hidden input named `name`.
// Pass `id` when a <Label htmlFor> points at the field.
// The list renders in a portal with fixed positioning, so a card with overflow-hidden cannot clip it. It opens
// upward when there is not enough room below.
export function Autocomplete({
  name,
  label,
  options,
  defaultValue,
  placeholder,
  required,
  searchable = true,
  id: idProp,
  emptyText = "ไม่พบรายการ",
  className,
  onPick,
}: {
  name: string;
  label: string;
  options: AutocompleteOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
  id?: string;
  emptyText?: string;
  className?: string;
  onPick?: (value: string) => void;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-list`;
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? "";

  const [value, setValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(() => labelOf(defaultValue ?? ""));
  // Filter only after the user types, so reopening a filled field still shows the whole list.
  const [typed, setTyped] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typeahead = useRef({ text: "", at: 0 });
  const anchor = useRef<HTMLDivElement>(null);
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null);

  // Places the list under the field (or above it near the bottom of the screen) and follows scroll and resize.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const gap = 4;
      const below = window.innerHeight - r.bottom - gap - 8;
      const above = r.top - gap - 8;
      const up = below < 200 && above > below;
      setListStyle({
        position: "fixed",
        left: r.left,
        minWidth: r.width,
        maxWidth: Math.min(352, window.innerWidth - r.left - 8),
        maxHeight: Math.min(288, up ? above : below),
        ...(up ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const q = typed ? query.trim().toLowerCase() : "";
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q)) : options;
    return list.slice(0, 50);
  }, [options, query, typed, searchable]);

  const openList = () => {
    setOpen(true);
    setTyped(false);
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  };

  const choose = (option: AutocompleteOption) => {
    setValue(option.value);
    setQuery(option.label);
    setTyped(false);
    setOpen(false);
    onPick?.(option.value);
  };

  // After leaving the field, the text always matches the value that will be submitted.
  const dismiss = () => {
    setOpen(false);
    setTyped(false);
    setQuery(labelOf(value));
  };
  const close = () => setTimeout(dismiss, 120);

  // A press outside the field and the list closes it. Blur alone is not enough: Safari does not focus a button on
  // click, so the select-only trigger may never blur.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchor.current?.contains(target) || document.getElementById(listId)?.contains(target)) return;
      setOpen(false);
      setTyped(false);
      setQuery(options.find((o) => o.value === value)?.label ?? "");
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, listId, options, value]);

  const onKeyDown = (e: KeyboardEvent) => {
    const last = Math.max(filtered.length - 1, 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList();
      else setActive((a) => Math.min(a + 1, last));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openList();
      else setActive((a) => Math.max(a - 1, 0));
    } else if (!searchable && open && (e.key === "Home" || e.key === "End")) {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : last);
    } else if ((e.key === "Enter" || (!searchable && e.key === " ")) && open && filtered[active]) {
      e.preventDefault();
      choose(filtered[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    } else if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== " ") {
      // Type-ahead: letters typed within 0.6 s add up, then jump to the first option that starts with them.
      const now = Date.now();
      const text = (now - typeahead.current.at < 600 ? typeahead.current.text : "") + e.key.toLowerCase();
      typeahead.current = { text, at: now };
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(text));
      if (hit >= 0) {
        setOpen(true);
        setActive(hit);
      }
    }
  };

  const comboboxProps = {
    id,
    role: "combobox" as const,
    "aria-label": label,
    "aria-expanded": open,
    "aria-controls": listId,
    "aria-activedescendant": open && filtered[active] ? `${id}-option-${active}` : undefined,
    "aria-required": required,
    onKeyDown,
    onBlur: close,
  };

  return (
    <div ref={anchor} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value} />
      {searchable ? (
        <Input
          {...comboboxProps}
          aria-autocomplete="list"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 pr-9"
          onChange={(e) => {
            setQuery(e.target.value);
            setTyped(true);
            setValue("");
            setOpen(true);
            setActive(0);
          }}
          onFocus={(e) => {
            e.target.select();
            openList();
          }}
        />
      ) : (
        <button
          {...comboboxProps}
          type="button"
          aria-haspopup="listbox"
          onClick={() => (open ? setOpen(false) : openList())}
          className="flex h-11 w-full min-w-0 items-center rounded-lg border border-input bg-transparent pr-9 pl-2.5 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        >
          <span className={cn("truncate", !value && !labelOf(value) && "text-muted-foreground")}>
            {labelOf(value) || placeholder || "เลือก"}
          </span>
        </button>
      )}
      <ChevronDown
        aria-hidden
        className={cn("pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle transition-transform", open && "rotate-180")}
      />
      {open && listStyle
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              aria-label={label}
              style={listStyle}
              // Keeps focus on the field when the list's scrollbar or padding is pressed, so it does not close.
              onMouseDown={(e) => e.preventDefault()}
              className="z-50 w-max overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
            >
              {filtered.length === 0 ? <li className="px-3 py-2 text-sm text-subtle">{emptyText}</li> : null}
              {filtered.map((option, i) => (
                <li
                  key={option.value}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(option);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm",
                    i === active ? "bg-accent text-accent-foreground" : "text-popover-foreground",
                  )}
                >
                  <Check aria-hidden className={cn("size-4 shrink-0 text-primary", option.value !== value && "invisible")} />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.hint ? <span className="shrink-0 text-xs text-subtle">{option.hint}</span> : null}
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
