import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import csharp from "highlight.js/lib/languages/csharp";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import sql from "highlight.js/lib/languages/sql";
import markdown from "highlight.js/lib/languages/markdown";
import yaml from "highlight.js/lib/languages/yaml";
import bash from "highlight.js/lib/languages/bash";

const grammars = {
  javascript,
  typescript,
  csharp,
  json,
  xml,
  css,
  python,
  java,
  cpp,
  sql,
  markdown,
  yaml,
  bash,
};
for (const [id, grammar] of Object.entries(grammars))
  hljs.registerLanguage(id, grammar);

export const LANGUAGES = [
  { id: "plaintext", label: "Plain Text" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "csharp", label: "C#" },
  { id: "json", label: "JSON" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C/C++" },
  { id: "sql", label: "SQL" },
  { id: "markdown", label: "Markdown" },
  { id: "yaml", label: "YAML" },
  { id: "xml", label: "XML" },
  { id: "shell", label: "Shell" },
] as const;
export type LanguageId = (typeof LANGUAGES)[number]["id"];
export type LanguageChoice = LanguageId | "auto";
export const languageLabel = (id: LanguageId) =>
  LANGUAGES.find((language) => language.id === id)!.label;

const extensions: Record<string, LanguageId> = {
  txt: "plaintext",
  text: "plaintext",
  log: "plaintext",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  cs: "csharp",
  json: "json",
  html: "html",
  htm: "html",
  css: "css",
  py: "python",
  pyw: "python",
  java: "java",
  c: "cpp",
  h: "cpp",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  sql: "sql",
  md: "markdown",
  markdown: "markdown",
  yml: "yaml",
  yaml: "yaml",
  xml: "xml",
  svg: "xml",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
};

export function detectLanguage(text: string, filename?: string): LanguageId {
  const extension = filename?.split(".").pop()?.toLowerCase();
  if (extension && extensions[extension]) return extensions[extension];
  const sample = text.slice(0, 12000).trim();
  if (!sample) return "plaintext";
  // JSON parsing is more reliable than keyword scores for structured data.
  if (/^[\[{]/.test(sample)) {
    try {
      JSON.parse(sample);
      return "json";
    } catch {
      /* continue with local detection */
    }
  }
  if (
    /^<!doctype\s+html\b|<html[\s>]|<(?:div|span|body|head|button|section)[\s>]/i.test(
      sample,
    )
  )
    return "html";
  if (/^<\?xml\b/i.test(sample)) return "xml";
  if (/^#!.*\b(?:bash|sh|zsh)\b/.test(sample)) return "shell";
  if (
    /\b(?:interface|enum)\s+[A-Za-z_$][\w$]*\s*(?:extends\s+[\w,.\s<>]+)?\{|\btype\s+[A-Za-z_$][\w$]*(?:<[^>]+>)?\s*=/.test(
      sample,
    )
  )
    return "typescript";
  if (/\busing\s+System(?:\.|;)|\bnamespace\s+[\w.]+\s*[{;]/.test(sample))
    return "csharp";
  const detection = hljs.highlightAuto(sample, Object.keys(grammars));
  const runnerUp = detection.secondBest;
  // JavaScript/TypeScript share a grammar; prefer JS unless type syntax is present.
  if (
    ["javascript", "typescript"].includes(detection.language ?? "") &&
    detection.relevance >= 3
  ) {
    if (
      runnerUp &&
      !["javascript", "typescript"].includes(runnerUp.language ?? "") &&
      detection.relevance - runnerUp.relevance < 2
    )
      return "plaintext";
    return /\b(?:interface|type|enum)\s+\w+|:\s*(?:string|number|boolean)\b/.test(
      sample,
    )
      ? "typescript"
      : "javascript";
  }
  if (
    !detection.language ||
    detection.relevance < 3 ||
    (runnerUp && detection.relevance - runnerUp.relevance < 2)
  )
    return "plaintext";
  if (detection.language === "bash") return "shell";
  if (detection.language === "xml") return "xml";
  return detection.language as LanguageId;
}

export function resolveLanguage(
  choice: LanguageChoice,
  text: string,
  filename?: string,
): LanguageId {
  return choice === "auto" ? detectLanguage(text, filename) : choice;
}
