import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

type Props = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  placeholder?: string;
};

export function SelectMenu({ value, options, onChange, ariaLabel, disabled, placeholder }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const current = options.find((item) => item.value === value);
  const label = current?.label ?? placeholder ?? "Chọn";

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className={`select-menu${open ? " open" : ""}${disabled ? " disabled" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="select-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span>{label}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path fill="currentColor" d="M5.2 7.4 10 12.2l4.8-4.8 1.4 1.4L10 15 3.8 8.8l1.4-1.4Z" />
        </svg>
      </button>
      {open ? (
        <ul className="select-panel scroll-fade" role="listbox" aria-label={ariaLabel}>
          {options.map((item) => {
            const on = item.value === value;
            return (
              <li key={item.value || "all"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={on ? "on" : ""}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
