import { expect, test, type Page } from "@playwright/test";
import { chooseTheme } from "./theme";

async function replaceText(
  page: Page,
  side: "Original" | "Modified",
  text: string,
) {
  const editor = page.getByRole("textbox", {
    name: `${side} text`,
    exact: true,
  });
  await editor.focus();
  await editor.press("ControlOrMeta+A");
  // Use Monaco's paste handler: Firefox's emulated multiline keyboard input
  // can duplicate text, and its synthetic DataTransfer contents are protected.
  await page.evaluate((value) => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        types: ["text/plain"],
        files: [],
        items: [],
        getData: (format: string) => (format === "text/plain" ? value : ""),
      },
    });
    document.activeElement!.dispatchEvent(event);
  }, text);
  await expect(
    page.locator(".pane-footers > div").nth(side === "Original" ? 0 : 1),
  ).toContainText(`${text.length.toLocaleString("en-US")} chars`);
}
const status = (page: Page) => page.getByTestId("comparison-status");

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("textbox", { name: "Original text", exact: true }),
  ).toBeAttached();
  await expect(page.locator(".editor-host").first()).toBeVisible();
  await expect(status(page)).toContainText("Ready to compare");
});

test("initial state, empty comparison, keyboard shortcut, and clear", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: "Compare", exact: true }).locator("kbd"),
  ).toHaveText(/^(Ctrl|⌘) \+ Enter$/);
  const originalEditor = page.getByRole("textbox", {
    name: "Original text",
    exact: true,
  });
  await originalEditor.press("Enter");
  await expect(status(page)).toContainText("Ready to compare");
  await originalEditor.press("ControlOrMeta+A");
  await originalEditor.press("Backspace");
  await expect(
    page.getByRole("button", { name: "Next change", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Original text", exact: true })
    .press("ControlOrMeta+Enter");
  await expect(status(page)).toContainText("No differences");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(status(page)).toContainText("Ready to compare");
  await expect(page.locator(".filename")).toHaveText(["Untitled", "Untitled"]);
});

test("line and character highlights, live edits, navigation, and swap", async ({
  page,
}) => {
  const original = "const value = 1;\n\nconsole.log(value);\n";
  const modified =
    "const value = 2;\n\nconsole.log(value);\nconst added = true;\n";
  await replaceText(page, "Original", original);
  await replaceText(page, "Modified", modified);
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(status(page)).toContainText("2 change regions");
  await expect(page.locator(".char-insert").first()).toBeVisible();
  await expect(page.locator(".char-delete").first()).toBeVisible();
  await page.getByRole("button", { name: "Next change", exact: true }).click();
  await page
    .getByRole("button", { name: "Previous change", exact: true })
    .click();
  await replaceText(page, "Modified", original);
  await expect(status(page)).toContainText("No differences");
  await replaceText(page, "Original", modified);
  await expect(status(page)).toContainText("2 change regions");
  await page.getByRole("button", { name: "Swap", exact: true }).click();
  await expect(status(page)).toContainText("2 change regions");
  await expect(page.locator(".diff-host .modified .view-lines")).toContainText(
    "const added = true;",
  );
});

test("identical Unicode, whitespace, case, blank lines, and final newline", async ({
  page,
}) => {
  await replaceText(page, "Original", "Grüße 🙂\n\nend\n");
  await replaceText(page, "Modified", "Grüße 🙂\n\nend\n");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(status(page)).toContainText("No differences");
  for (const modified of [
    "Grüße 🙂\n\nend",
    "Grüße 🙂\nend\n",
    "Grüße 🙂\n\nEnd\n",
    "Grüße 🙂\n\nend \n",
  ]) {
    await replaceText(page, "Modified", modified);
    await expect(status(page)).toContainText("change region");
  }
});

test("one-sided input is a real addition or deletion", async ({ page }) => {
  await replaceText(page, "Modified", "first\nsecond");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(status(page)).toContainText("1 change region");
  await page.getByRole("button", { name: "Swap", exact: true }).click();
  await expect(status(page)).toContainText("1 change region");
  await expect(page.locator(".diff-host .original .view-lines")).toContainText(
    "second",
  );
});

test("local file imports, extension detection, manual override, and metadata swap", async ({
  page,
}) => {
  await page.getByLabel("Import original file", { exact: true }).setInputFiles({
    name: "original.cs",
    mimeType: "text/plain",
    buffer: Buffer.from("public class Hello { }\r\n"),
  });
  await page.getByLabel("Import modified file", { exact: true }).setInputFiles({
    name: "modified.py",
    mimeType: "text/plain",
    buffer: Buffer.from('print("hello")\n'),
  });
  await expect(page.getByTestId("original-language")).toHaveText("C#");
  await expect(page.getByTestId("modified-language")).toHaveText("Python");
  await page.getByLabel("Language", { exact: true }).selectOption("javascript");
  await expect(page.getByTestId("original-language")).toHaveText("JavaScript");
  await expect(page.getByTestId("modified-language")).toHaveText("JavaScript");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(status(page)).toContainText("change region");
  await page.getByRole("button", { name: "Swap", exact: true }).click();
  await expect(page.locator(".filename")).toHaveText([
    "modified.py",
    "original.cs",
  ]);
  await page.getByLabel("Language", { exact: true }).selectOption("auto");
  await expect(page.getByTestId("original-language")).toHaveText("Python");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByTestId("original-language")).toHaveText("Plain Text");
  await expect(page.locator(".filename")).toHaveText(["Untitled", "Untitled"]);
});

test("pasted JSON detection and plain text fallback", async ({ page }) => {
  await replaceText(page, "Original", '{"hello": "world", "enabled": true}');
  await replaceText(page, "Modified", "These are ordinary words.");
  await expect(page.getByTestId("original-language")).toHaveText("JSON");
  await expect(page.getByTestId("modified-language")).toHaveText("Plain Text");
});

test("rejecting invalid files retains current content", async ({ page }) => {
  await page.getByLabel("Import original file", { exact: true }).setInputFiles({
    name: "valid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("preserve me"),
  });
  for (const invalid of [
    {
      name: "binary.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0, 1, 2]),
    },
    {
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from([0xff, 0xfe]),
    },
    {
      name: "large.txt",
      mimeType: "text/plain",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, "a"),
    },
  ]) {
    await page
      .getByLabel("Import original file", { exact: true })
      .setInputFiles(invalid);
    await expect(page.locator(".error-banner")).toBeVisible();
    await expect(page.locator(".filename").first()).toHaveText("valid.txt");
    await expect(
      page.locator(".standalone-editors .view-lines").first(),
    ).toContainText("preserve me");
  }
});

test("undo history survives the editor to diff transition", async ({
  page,
}) => {
  await page.getByLabel("Import original file", { exact: true }).setInputFiles({
    name: "before.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("before"),
  });
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(status(page)).toContainText("change region");
  await page
    .getByRole("textbox", { name: "Original text", exact: true })
    .press("ControlOrMeta+Z");
  await expect(status(page)).toContainText("No differences");
  await page
    .getByRole("textbox", { name: "Original text", exact: true })
    .press("ControlOrMeta+Shift+Z");
  await expect(status(page)).toContainText("change region");
});

test("oversized pasted text is retained and comparison resumes after shortening", async ({
  page,
}) => {
  test.setTimeout(90000);
  await replaceText(page, "Original", "short original");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(status(page)).toContainText("change region");
  await replaceText(page, "Modified", "a".repeat(5 * 1024 * 1024 + 1));
  await expect(page.locator(".error-banner")).toContainText(
    "Your text is retained",
  );
  await expect(
    page.getByRole("button", { name: "Compare", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".pane-footers").last()).toContainText(
    "5,242,881 chars",
  );
  await expect(status(page)).toContainText("Input exceeds");
  await replaceText(page, "Modified", "short original");
  await expect(status(page)).toContainText("No differences");
  await expect(
    page.getByRole("button", { name: "Compare", exact: true }),
  ).toBeEnabled();
});

test("themes persist while text is discarded on reload; no content network requests", async ({
  page,
}) => {
  const failures: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      ["fetch", "xhr", "websocket"].includes(request.resourceType())
    )
      requests.push(request.url());
  });
  await chooseTheme(page, "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await replaceText(page, "Original", "PRIVATE_CONTENT_123");
  await replaceText(page, "Modified", "PRIVATE_CONTENT_456");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(status(page)).toContainText("change region");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
    "text-comparer-theme",
  ]);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  expect(requests).toEqual([]);
  expect(failures).toEqual([]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(status(page)).toContainText("Ready to compare");
  await expect(page.locator(".pane-footers")).toContainText("0 chars");
  await chooseTheme(page, "light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("theme menu supports keyboard navigation, dismissal, and system appearance", async ({
  page,
}) => {
  const trigger = page.getByRole("button", {
    name: "Color theme",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("ArrowDown");
  await expect(
    page.getByRole("menuitemradio", { name: "System", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("menuitemradio", { name: "Dark", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(trigger).toBeFocused();
  await trigger.press("Space");
  await expect(
    page.getByRole("menuitemradio", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await trigger.click();
  await page.getByRole("heading", { name: "See what changed." }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await chooseTheme(page, "system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(trigger).toContainText("System");
  await trigger.press("ArrowDown");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Source code on GitHub" }),
  ).toBeFocused();
});

test("layout keeps two panes at smaller desktop widths and keyboard focus is visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 800 });
  const original = await page.locator(".editor-host").first().boundingBox();
  const modified = await page.locator(".editor-host").last().boundingBox();
  expect(original?.width).toBeGreaterThan(300);
  expect(modified?.x).toBeGreaterThan(original!.x);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to comparison workspace" }),
  ).toBeFocused();
});

test("expanded workspace fills the tab and preserves long comparisons and undo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const original = Array.from(
    { length: 120 },
    (_, index) => `const line${index} = ${index};`,
  ).join("\n");
  const modified = original.replace(
    "const line100 = 100;",
    "const line100 = 101;",
  );
  await replaceText(page, "Original", original);
  await replaceText(page, "Modified", modified);
  const normalHeight = (await page.locator(".editor-body").boundingBox())!
    .height;
  await page
    .getByRole("button", { name: "Expand workspace", exact: true })
    .click();
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".intro")).toBeHidden();
  const bounds = (await page
    .getByRole("region", { name: "Comparison workspace", exact: true })
    .boundingBox())!;
  expect(bounds.x).toBe(12);
  expect(bounds.y).toBe(12);
  expect(bounds.width).toBe(1416);
  expect(bounds.height).toBe(876);
  expect(
    (await page.locator(".editor-body").boundingBox())!.height,
  ).toBeGreaterThan(normalHeight + 150);
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(status(page)).toContainText("1 change region");
  await page.getByRole("button", { name: "Next change", exact: true }).click();
  await expect(page.locator(".diff-host .modified .view-lines")).toContainText(
    "const line100 = 101;",
  );
  await page
    .getByRole("textbox", { name: "Modified text", exact: true })
    .press("Escape");
  const expand = page.getByRole("button", {
    name: "Expand workspace",
    exact: true,
  });
  await expect(expand).toBeFocused();
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(status(page)).toContainText("1 change region");
  await expand.click();
  await page
    .getByRole("textbox", { name: "Modified text", exact: true })
    .press("ControlOrMeta+Z");
  await expect(page.locator(".pane-footers > div").last()).toContainText(
    "0 chars",
  );
  await page
    .getByRole("textbox", { name: "Modified text", exact: true })
    .press("ControlOrMeta+Shift+Z");
  await expect(status(page)).toContainText("1 change region");
  await page
    .getByRole("button", { name: "Exit expanded view", exact: true })
    .click();
  await expect(expand).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(status(page)).toContainText("Ready to compare");
});
