import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { monaco } from "./monaco";
import {
  MAX_DIFF_TIME,
  normalizeNewlines,
  resolveDiffStatus,
  type ComparisonStatus,
} from "./text";
import type { LanguageId } from "./languages";

export type Side = "original" | "modified";
type Models = Record<Side, monaco.editor.ITextModel>;
export type WorkspaceHandle = {
  replace: (side: Side, text: string) => void;
  swap: () => void;
  clear: () => void;
  navigate: (direction: "next" | "previous") => void;
};
type Props = {
  compared: boolean;
  overLimit: boolean;
  theme: "light" | "dark";
  languages: Record<Side, LanguageId>;
  onTextChange: (side: Side, value: string) => void;
  onStatus: (status: ComparisonStatus) => void;
};

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  fontFamily:
    '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  fontSize: 13,
  lineHeight: 23,
  lineNumbersMinChars: 3,
  padding: { top: 18, bottom: 18 },
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  roundedSelection: true,
  wordWrap: "off",
  renderWhitespace: "selection",
  renderValidationDecorations: "off",
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  parameterHints: { enabled: false },
  formatOnPaste: false,
  formatOnType: false,
  editContext: false,
  autoIndent: "none",
  autoClosingBrackets: "never",
  autoClosingQuotes: "never",
  autoSurround: "never",
  trimAutoWhitespace: false,
  unusualLineTerminators: "off",
  unicodeHighlight: { ambiguousCharacters: false },
  stickyScroll: { enabled: false },
  tabSize: 2,
};

export const EditorWorkspace = forwardRef<WorkspaceHandle, Props>(
  function EditorWorkspace(props, ref) {
    const [models, setModels] = useState<Models | null>(null);
    const originalHost = useRef<HTMLDivElement>(null);
    const modifiedHost = useRef<HTMLDivElement>(null);
    const diffHost = useRef<HTMLDivElement>(null);
    const diffRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
    const propsRef = useRef(props);
    propsRef.current = props;

    useEffect(() => {
      const pair: Models = {
        original: monaco.editor.createModel("", "plaintext"),
        modified: monaco.editor.createModel("", "plaintext"),
      };
      pair.original.setEOL(monaco.editor.EndOfLineSequence.LF);
      pair.modified.setEOL(monaco.editor.EndOfLineSequence.LF);
      const listeners = (["original", "modified"] as const).map((side) =>
        pair[side].onDidChangeContent(() => {
          propsRef.current.onTextChange(side, pair[side].getValue());
          if (propsRef.current.compared && !propsRef.current.overLimit)
            propsRef.current.onStatus({ kind: "computing" });
        }),
      );
      setModels(pair);
      return () => {
        listeners.forEach((listener) => listener.dispose());
        pair.original.dispose();
        pair.modified.dispose();
      };
    }, []);

    useImperativeHandle(ref, () => {
      const replace = (side: Side, text: string) => {
        const model = models?.[side];
        if (!model || model.isDisposed()) return;
        model.pushStackElement();
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: normalizeNewlines(text) }],
          () => null,
        );
        model.pushStackElement();
      };
      return {
        replace,
        swap: () => {
          if (!models) return;
          const original = models.original.getValue();
          replace("original", models.modified.getValue());
          replace("modified", original);
        },
        clear: () => {
          models?.original.setValue("");
          models?.modified.setValue("");
        },
        navigate: (direction) => {
          const diff = diffRef.current;
          if (!diff || propsRef.current.overLimit) return;
          diff.goToDiff(direction);
        },
      };
    }, [models]);

    useEffect(() => {
      if (!models) return;
      monaco.editor.setModelLanguage(models.original, props.languages.original);
      monaco.editor.setModelLanguage(models.modified, props.languages.modified);
    }, [models, props.languages.original, props.languages.modified]);

    useEffect(() => {
      monaco.editor.setTheme(`comparer-${props.theme}`);
    }, [props.theme]);

    const showDiff = props.compared && !props.overLimit;
    useEffect(() => {
      if (
        !models ||
        models.original.isDisposed() ||
        models.modified.isDisposed()
      )
        return;
      if (!showDiff) {
        const original = monaco.editor.create(originalHost.current!, {
          ...editorOptions,
          model: models.original,
          ariaLabel: "Original text",
          placeholder: "Paste original text here…",
        });
        const modified = monaco.editor.create(modifiedHost.current!, {
          ...editorOptions,
          model: models.modified,
          ariaLabel: "Modified text",
          placeholder: "Paste modified text here…",
        });
        return () => {
          original.dispose();
          modified.dispose();
        };
      }
      propsRef.current.onStatus({ kind: "computing" });
      const diff = monaco.editor.createDiffEditor(diffHost.current!, {
        ...editorOptions,
        originalEditable: true,
        readOnly: false,
        renderSideBySide: true,
        useInlineViewWhenSpaceIsLimited: false,
        enableSplitViewResizing: false,
        ignoreTrimWhitespace: false,
        diffAlgorithm: "advanced",
        maxComputationTime: MAX_DIFF_TIME,
        maxFileSize: 6,
        renderIndicators: true,
        renderMarginRevertIcon: false,
        renderGutterMenu: false,
        hideUnchangedRegions: { enabled: false },
        originalAriaLabel: "Original text",
        modifiedAriaLabel: "Modified text",
      });
      diffRef.current = diff;
      const listener = diff.onDidUpdateDiff(() => {
        // Pinned Monaco exposes timeout metadata at runtime, but omits it from
        // public typings. Fail closed if an upgrade removes this capability.
        const resultReader = (
          diff as monaco.editor.IStandaloneDiffEditor & {
            getDiffComputationResult?: () => {
              quitEarly: boolean;
              changes: unknown[];
            } | null;
          }
        ).getDiffComputationResult;
        propsRef.current.onStatus(
          resultReader
            ? resolveDiffStatus(resultReader.call(diff))
            : {
                kind: "incomplete",
                message:
                  "Comparison status could not be verified. Please reload the app.",
              },
        );
      });
      diff.setModel({ original: models.original, modified: models.modified });
      // Set labels on the inner editors after the diff's initial option pass.
      // Monaco 0.57 resets construction-time labels during that pass.
      diff
        .getOriginalEditor()
        .updateOptions({
          ariaLabel: "Original text",
          placeholder: "Paste original text here…",
        });
      diff
        .getModifiedEditor()
        .updateOptions({
          ariaLabel: "Modified text",
          placeholder: "Paste modified text here…",
        });
      return () => {
        listener.dispose();
        diff.dispose();
        diffRef.current = null;
      };
    }, [models, showDiff]);

    return (
      <div className="editor-body" data-testid="editor-workspace">
        <div className="standalone-editors" hidden={showDiff}>
          <div className="editor-host" ref={originalHost} />
          <div className="editor-host" ref={modifiedHost} />
        </div>
        <div className="diff-host" ref={diffHost} hidden={!showDiff} />
      </div>
    );
  },
);
