import * as monaco from "monaco-editor/editor/editor.api.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import "monaco-codicon-font";
import "monaco-editor/editor/contrib/clipboard/browser/clipboard.js";
import "monaco-editor/editor/contrib/find/browser/findController.js";
import "monaco-editor/editor/contrib/placeholderText/browser/placeholderText.contribution.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/languages/definitions/typescript/register.js";
import "monaco-editor/languages/definitions/csharp/register.js";
import "monaco-editor/languages/definitions/html/register.js";
import "monaco-editor/languages/definitions/css/register.js";
import "monaco-editor/languages/definitions/python/register.js";
import "monaco-editor/languages/definitions/java/register.js";
import "monaco-editor/languages/definitions/cpp/register.js";
import "monaco-editor/languages/definitions/sql/register.js";
import "monaco-editor/languages/definitions/markdown/register.js";
import "monaco-editor/languages/definitions/yaml/register.js";
import "monaco-editor/languages/definitions/xml/register.js";
import "monaco-editor/languages/definitions/shell/register.js";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
// JSON highlighting without language services that could fetch remote schemas.
monaco.languages.register({ id: "json" });
monaco.languages.setMonarchTokensProvider("json", {
  tokenizer: {
    root: [
      [/"([^"\\]|\\.)*"(?=\s*:)/, "key"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
      [/\b(?:true|false|null)\b/, "keyword"],
      [/[{}\[\]]/, "@brackets"],
      [/[,:]/, "delimiter"],
    ],
  },
});

monaco.editor.defineTheme("comparer-light", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#26352f",
    "editorLineNumber.foreground": "#a3ada7",
    "editorLineNumber.activeForeground": "#4f655a",
    "editor.lineHighlightBackground": "#f5f8f5",
    "editor.selectionBackground": "#dcece4",
    "editorGutter.background": "#ffffff",
    "editorOverviewRuler.border": "#ffffff",
    "diffEditor.insertedTextBackground": "#b0dfba75",
    "diffEditor.removedTextBackground": "#f2b6b675",
    "diffEditor.insertedLineBackground": "#eaf6ec",
    "diffEditor.removedLineBackground": "#fceeee",
  },
});
monaco.editor.defineTheme("comparer-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#171e1b",
    "editor.foreground": "#d9e2dc",
    "editorLineNumber.foreground": "#5c6d62",
    "editorLineNumber.activeForeground": "#a2b9ac",
    "editor.lineHighlightBackground": "#1e2822",
    "editor.selectionBackground": "#335b48",
    "editorGutter.background": "#171e1b",
    "editorOverviewRuler.border": "#171e1b",
    "diffEditor.insertedTextBackground": "#43774d75",
    "diffEditor.removedTextBackground": "#954e5275",
    "diffEditor.insertedLineBackground": "#203829",
    "diffEditor.removedLineBackground": "#3c2528",
  },
});

export { monaco };
