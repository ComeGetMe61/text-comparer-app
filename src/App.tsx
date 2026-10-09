import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  FileCode2,
  FileUp,
  Github,
  GitCompareArrows,
  LoaderCircle,
  Play,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  EditorWorkspace,
  type Side,
  type WorkspaceHandle,
} from "./EditorWorkspace";
import {
  LANGUAGES,
  languageLabel,
  resolveLanguage,
  type LanguageChoice,
} from "./languages";
import {
  MAX_BYTES,
  readTextFile,
  textBytes,
  type ComparisonStatus,
} from "./text";

import { ThemePicker, type ThemeChoice } from "./ThemePicker";
type Source = { text: string; filename?: string };
const REPO_URL = "https://github.com/ComeGetMe61/text-comparer-app";

function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem("text-comparer-theme");
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function App() {
  const [sources, setSources] = useState<Record<Side, Source>>({
    original: { text: "" },
    modified: { text: "" },
  });
  const [compared, setCompared] = useState(false);
  const [status, setStatus] = useState<ComparisonStatus>({ kind: "idle" });
  const [language, setLanguage] = useState<LanguageChoice>("auto");
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(readTheme);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<Side | null>(null);
  const workspace = useRef<WorkspaceHandle>(null);
  const originalFile = useRef<HTMLInputElement>(null);
  const modifiedFile = useRef<HTMLInputElement>(null);
  const importVersion = useRef(0);
  const theme =
    themeChoice === "system" ? (systemDark ? "dark" : "light") : themeChoice;

  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemDark(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#111713" : "#f8f9f7");
    try {
      localStorage.setItem("text-comparer-theme", themeChoice);
    } catch {
      /* memory-only theme still works */
    }
  }, [themeChoice, theme]);

  const bytes = useMemo(
    () => ({
      original: textBytes(sources.original.text),
      modified: textBytes(sources.modified.text),
    }),
    [sources.original.text, sources.modified.text],
  );
  const overLimit = bytes.original > MAX_BYTES || bytes.modified > MAX_BYTES;
  const [detectionSources, setDetectionSources] = useState(sources);
  useEffect(() => {
    const timer = setTimeout(() => setDetectionSources(sources), 300);
    return () => clearTimeout(timer);
  }, [sources]);
  const languages = useMemo(
    () => ({
      original: resolveLanguage(
        language,
        detectionSources.original.text,
        detectionSources.original.filename,
      ),
      modified: resolveLanguage(
        language,
        detectionSources.modified.text,
        detectionSources.modified.filename,
      ),
    }),
    [language, detectionSources],
  );

  const onTextChange = useCallback((side: Side, text: string) => {
    setSources((current) => ({
      ...current,
      [side]: { ...current[side], text },
    }));
  }, []);
  const onStatus = useCallback(
    (value: ComparisonStatus) => setStatus(value),
    [],
  );
  const compare = useCallback(() => {
    if (overLimit || importing) return;
    setError(null);
    setCompared(true);
  }, [overLimit, importing]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        compare();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [compare]);

  const importFile = async (side: Side, file?: File) => {
    if (!file) return;
    const version = ++importVersion.current;
    setImporting(side);
    setError(null);
    try {
      const text = await readTextFile(file);
      if (version !== importVersion.current) return;
      workspace.current?.replace(side, text);
      setSources((current) => ({
        ...current,
        [side]: { text, filename: file.name },
      }));
    } catch (reason) {
      if (version === importVersion.current)
        setError(
          `${side === "original" ? "Original" : "Modified"}: ${reason instanceof Error ? reason.message : "The file could not be opened."}`,
        );
    } finally {
      if (version === importVersion.current) setImporting(null);
    }
  };

  const clear = () => {
    importVersion.current++;
    workspace.current?.clear();
    setSources({ original: { text: "" }, modified: { text: "" } });
    setCompared(false);
    setStatus({ kind: "idle" });
    setError(null);
    setImporting(null);
  };
  const swap = () => {
    const originalFilename = sources.original.filename;
    const modifiedFilename = sources.modified.filename;
    workspace.current?.swap();
    setSources((current) => ({
      original: { ...current.original, filename: modifiedFilename },
      modified: { ...current.modified, filename: originalFilename },
    }));
    setError(null);
  };

  const canNavigate =
    compared && !overLimit && status.kind === "complete" && status.regions > 0;
  const resultText = overLimit
    ? "Input exceeds the 5 MiB limit"
    : !compared
      ? "Ready to compare"
      : status.kind === "computing"
        ? "Comparing…"
        : status.kind === "incomplete"
          ? "Comparison incomplete"
          : status.kind === "complete"
            ? status.regions === 0
              ? "No differences"
              : `${status.regions} change ${status.regions === 1 ? "region" : "regions"}`
            : "Comparing…";
  const resultKind = overLimit ? "incomplete" : compared ? status.kind : "idle";
  const compareShortcut = `${navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter`;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to comparison workspace
      </a>
      <header className="site-header">
        <a className="brand" href="./" aria-label="Text Comparer home">
          <span className="brand-mark">
            <Code2 size={22} strokeWidth={1.8} />
          </span>
          <span>
            Text Comparer<span className="brand-period">.</span>
          </span>
        </a>
        <div className="header-actions">
          <span className="local-pill">
            <span className="live-dot" />
            LOCAL WORKSPACE
          </span>
          <ThemePicker value={themeChoice} onChange={setThemeChoice} />
          <a
            className="github-link"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Source code on GitHub"
            title="Source code on GitHub"
          >
            <Github size={20} />
          </a>
        </div>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <div>
            <div className="eyebrow">LESS GUESSWORK. MORE CLARITY.</div>
            <h1 id="page-title">
              See what changed<span>.</span>
            </h1>
            <p>
              Two versions. One clear view. Compare code or text, right in your
              browser.
            </p>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={20} strokeWidth={1.6} />
            <div>
              <strong>Your text stays yours</strong>
              <span>Local comparison. Nothing uploaded.</span>
            </div>
          </div>
        </section>

        <section
          className="workspace"
          id="workspace"
          tabIndex={-1}
          aria-label="Comparison workspace"
        >
          <div className="workspace-toolbar">
            <div className="language-control">
              <FileCode2 size={16} aria-hidden="true" />
              <label htmlFor="language">Language</label>
              <div className="select-wrap">
                <select
                  id="language"
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value as LanguageChoice)
                  }
                >
                  <option value="auto">Auto-detect</option>
                  {LANGUAGES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="select-chevron"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="toolbar-actions">
              <button
                className="button quiet"
                onClick={swap}
                disabled={!!importing}
                title="Swap original and modified text"
              >
                <ArrowLeftRight size={15} />
                <span>Swap</span>
              </button>
              <button
                className="button quiet"
                onClick={clear}
                title="Clear both editors"
              >
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
              <span className="toolbar-divider" />
              <button
                className="button primary"
                aria-label="Compare"
                onClick={compare}
                disabled={overLimit || !!importing}
                title={`Compare (${compareShortcut})`}
                aria-keyshortcuts="Control+Enter Meta+Enter"
              >
                <Play size={13} fill="currentColor" />
                <span>Compare</span>
                <kbd aria-hidden="true">{compareShortcut}</kbd>
              </button>
            </div>
          </div>

          <div className="pane-headers">
            {(["original", "modified"] as const).map((side, index) => (
              <div className="pane-header" key={side}>
                <div className="pane-name">
                  <span className="pane-number">0{index + 1}</span>
                  <h2>{side === "original" ? "Original" : "Modified"}</h2>
                  <span
                    className="language-tag"
                    data-testid={`${side}-language`}
                  >
                    {languageLabel(languages[side])}
                  </span>
                </div>
                <button
                  className="open-file"
                  onClick={() =>
                    (side === "original"
                      ? originalFile
                      : modifiedFile
                    ).current?.click()
                  }
                  disabled={!!importing}
                  aria-label={`Open ${side} file`}
                >
                  <FileUp size={14} />
                  {importing === side ? "Reading…" : "Open file"}
                </button>
                <input
                  className="file-input"
                  ref={side === "original" ? originalFile : modifiedFile}
                  type="file"
                  aria-label={`Import ${side} file`}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void importFile(side, file);
                  }}
                />
              </div>
            ))}
          </div>

          <EditorWorkspace
            ref={workspace}
            compared={compared}
            overLimit={overLimit}
            theme={theme}
            languages={languages}
            onTextChange={onTextChange}
            onStatus={onStatus}
          />

          <div className="pane-footers">
            {(["original", "modified"] as const).map((side) => (
              <div key={side}>
                <span className="filename" title={sources[side].filename}>
                  {sources[side].filename || "Untitled"}
                </span>
                <span>
                  {sources[side].text
                    ? sources[side].text.split("\n").length.toLocaleString()
                    : "0"}{" "}
                  lines<span className="metric-dot">·</span>
                  {sources[side].text.length.toLocaleString()} chars
                </span>
              </div>
            ))}
          </div>

          <div className="results-bar">
            <div
              className={`result-status ${resultKind}`}
              role="status"
              data-testid="comparison-status"
            >
              {resultKind === "computing" ? (
                <LoaderCircle size={16} className="spin" />
              ) : resultKind === "complete" &&
                status.kind === "complete" &&
                status.regions === 0 ? (
                <Check size={16} />
              ) : (
                <GitCompareArrows size={16} />
              )}
              <span>{resultText}</span>
              {compared && !overLimit && status.kind === "complete" && (
                <span className="live-label">
                  <span className="live-dot" />
                  Live
                </span>
              )}
            </div>
            <div className="result-actions">
              <span className="diff-legend">
                <span className="legend-removed">− Removed</span>
                <span className="legend-added">+ Added</span>
              </span>
              <span className="result-divider" />
              <button
                className="icon-button"
                aria-label="Previous change"
                onClick={() => workspace.current?.navigate("previous")}
                disabled={!canNavigate}
                title="Previous change"
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Next change"
                onClick={() => workspace.current?.navigate("next")}
                disabled={!canNavigate}
                title="Next change"
              >
                <ArrowDown size={16} />
              </button>
            </div>
          </div>
        </section>

        {(error || overLimit || (compared && status.kind === "incomplete")) && (
          <div className="error-banner" role="alert">
            <span>
              {error ||
                (overLimit
                  ? "An input exceeds 5 MiB. Your text is retained; shorten it to resume comparison."
                  : status.kind === "incomplete"
                    ? status.message
                    : "")}
            </span>
            {error && (
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError(null)}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="workspace-hint">
          <span>
            <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd> to compare
          </span>
          <span>
            Whitespace-aware<span className="metric-dot">·</span>UTF-8
            <span className="metric-dot">·</span>5 MiB per side
          </span>
        </div>
      </main>

      <footer className="site-footer">
        <span>
          <ShieldCheck size={14} />
          Built for your browser. Your code never leaves it.
        </span>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          Free & open source
          <ArrowUp size={12} className="external-arrow" />
        </a>
      </footer>
    </div>
  );
}

export default App;
