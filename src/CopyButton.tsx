import { useEffect, useRef, useState } from "react";
import { Check, Copy, LoaderCircle, X } from "lucide-react";
import type { Side } from "./EditorWorkspace";

type CopyState = "idle" | "copying" | "copied" | "failed";

export function CopyButton({ side, text }: { side: Side; text: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const currentText = useRef(text);
  currentText.current = text;

  useEffect(() => setState("idle"), [text]);
  useEffect(() => {
    if (state !== "copied" && state !== "failed") return;
    const timer = setTimeout(() => setState("idle"), 3000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    setState("copying");
    try {
      await navigator.clipboard.writeText(text);
      if (currentText.current === text) setState("copied");
    } catch {
      if (currentText.current === text) setState("failed");
    }
  };
  const message =
    state === "copied"
      ? `${side === "original" ? "Original" : "Modified"} text copied.`
      : state === "failed"
        ? "Clipboard access was blocked. Select the text and use Ctrl/⌘ + C."
        : "";

  return (
    <>
      <button
        className={`copy-button${state === "failed" ? " copy-failed" : ""}`}
        aria-label={`Copy ${side} text`}
        disabled={!text || state === "copying"}
        title={message || `Copy all ${side} text`}
        onClick={() => void copy()}
      >
        {state === "copied" ? (
          <Check size={14} aria-hidden="true" />
        ) : state === "copying" ? (
          <LoaderCircle size={14} className="spin" aria-hidden="true" />
        ) : state === "failed" ? (
          <X size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
        <span>
          {state === "copied"
            ? "Copied"
            : state === "failed"
              ? "Copy failed"
              : "Copy"}
        </span>
      </button>
      <span className="visually-hidden" role="status">
        {message}
      </span>
    </>
  );
}
