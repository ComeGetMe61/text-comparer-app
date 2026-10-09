import { describe, expect, it } from "vitest";
import {
  MAX_BYTES,
  normalizeNewlines,
  readTextFile,
  resolveDiffStatus,
  textBytes,
} from "./text";

describe("text import and preservation", () => {
  it("normalizes line endings while retaining spaces, blank lines, Unicode and final newline", async () => {
    expect(
      await readTextFile(new File(["  Grüße\r\n\r\n🙂\r\n"], "example.txt")),
    ).toBe("  Grüße\n\n🙂\n");
    expect(normalizeNewlines("one\rtwo")).toBe("one\ntwo");
  });
  it("accepts a UTF-8 BOM and an empty file", async () => {
    expect(
      await readTextFile(
        new File([new Uint8Array([239, 187, 191]), "hello"], "bom.txt"),
      ),
    ).toBe("hello");
    expect(await readTextFile(new File([], "empty.txt"))).toBe("");
  });
  it("counts bytes rather than UTF-16 characters", () => {
    expect(textBytes("🙂")).toBe(4);
    expect(textBytes("é")).toBe(2);
  });
  it("rejects oversized, binary, and malformed UTF-8 files", async () => {
    await expect(
      readTextFile(new File(["x".repeat(MAX_BYTES + 1)], "big.txt")),
    ).rejects.toThrow("5 MiB");
    await expect(
      readTextFile(new File([new Uint8Array([0, 1, 2])], "binary.bin")),
    ).rejects.toThrow("binary");
    await expect(
      readTextFile(new File([new Uint8Array([0xff, 0xfe])], "utf16.txt")),
    ).rejects.toThrow("UTF-8");
  });
  it("accepts a file exactly at the limit and reports read failures", async () => {
    expect(
      (await readTextFile(new File(["x".repeat(MAX_BYTES)], "limit.txt")))
        .length,
    ).toBe(MAX_BYTES);
    const unreadable = new File([], "unreadable.txt");
    unreadable.arrayBuffer = async () => {
      throw new Error("read failed");
    };
    await expect(readTextFile(unreadable)).rejects.toThrow("could not be read");
  });
});

describe("diff result safety", () => {
  it("never represents timeout or missing results as no differences", () => {
    expect(resolveDiffStatus(null)).toEqual({ kind: "computing" });
    expect(resolveDiffStatus({ quitEarly: true, changes: [] }).kind).toBe(
      "incomplete",
    );
    expect(resolveDiffStatus({ quitEarly: false, changes: [] })).toEqual({
      kind: "complete",
      regions: 0,
    });
    expect(resolveDiffStatus({ quitEarly: false, changes: [{}, {}] })).toEqual({
      kind: "complete",
      regions: 2,
    });
  });
});
