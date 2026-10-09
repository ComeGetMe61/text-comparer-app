import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";

export type ThemeChoice = "system" | "light" | "dark";
const choices = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeChoice;
  onChange: (value: ThemeChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const initialFocus = useRef(0);
  const menuId = useId();
  const selected = choices.findIndex((choice) => choice.value === value);
  const { Icon, label } = choices[selected];

  useEffect(() => {
    if (!open) return;
    items.current[initialFocus.current]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function show(index: number) {
    initialFocus.current = index;
    setOpen(true);
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.current.findIndex(
      (item) => item === document.activeElement,
    );
    let next: number | undefined;
    if (event.key === "ArrowDown") next = (index + 1) % choices.length;
    if (event.key === "ArrowUp")
      next = (index + choices.length - 1) % choices.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = choices.length - 1;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      // Let normal Tab navigation continue from the trigger after dismissal.
      close();
    } else if (next !== undefined) {
      event.preventDefault();
      items.current[next]?.focus();
    }
  }

  return (
    <div
      className="theme-control"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="theme-trigger"
        aria-label="Color theme"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Change color theme"
        onClick={() => (open ? close() : show(selected))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show(event.key === "ArrowDown" ? 0 : choices.length - 1);
          }
        }}
      >
        <Icon size={16} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown size={14} className="theme-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div
          className="theme-menu"
          role="menu"
          aria-label="Color theme"
          id={menuId}
          onKeyDown={navigate}
        >
          <div className="theme-menu-heading">Appearance</div>
          {choices.map((choice, index) => (
            <button
              key={choice.value}
              ref={(item) => {
                items.current[index] = item;
              }}
              className="theme-option"
              role="menuitemradio"
              aria-label={choice.label}
              aria-checked={value === choice.value}
              aria-describedby={
                choice.value === "system" ? `${menuId}-system` : undefined
              }
              tabIndex={-1}
              onClick={() => {
                onChange(choice.value);
                close();
              }}
            >
              <choice.Icon size={17} aria-hidden="true" />
              <span className="theme-option-label">
                <span>{choice.label}</span>
                {choice.value === "system" && (
                  <span
                    className="theme-option-description"
                    id={`${menuId}-system`}
                  >
                    Follow your device
                  </span>
                )}
              </span>
              {value === choice.value && (
                <Check size={16} className="theme-check" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
