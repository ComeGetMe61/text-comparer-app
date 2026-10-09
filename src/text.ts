export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_DIFF_TIME = 5000;
export const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, "\n");
export const textBytes = (text: string) =>
  new TextEncoder().encode(text).byteLength;

export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES)
    throw new Error(
      "This file exceeds the 5 MiB limit. Choose a smaller text file.",
    );
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new Error("This file could not be read. Try opening it again.");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error(
      "This file is not valid UTF-8. Save it as UTF-8 text and try again.",
    );
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
    throw new Error(
      "This appears to be a binary file. Choose a text or source code file.",
    );
  }
  return normalizeNewlines(text);
}

export type ComparisonStatus =
  | { kind: "idle" }
  | { kind: "computing" }
  | { kind: "complete"; regions: number }
  | { kind: "incomplete"; message: string };

export function resolveDiffStatus(
  result: { quitEarly: boolean; changes: readonly unknown[] } | null,
): ComparisonStatus {
  if (!result) return { kind: "computing" };
  if (result.quitEarly)
    return {
      kind: "incomplete",
      message:
        "Comparison incomplete: the five-second limit was reached. Try smaller inputs.",
    };
  return { kind: "complete", regions: result.changes.length };
}
