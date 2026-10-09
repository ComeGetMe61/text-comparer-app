import { expect, test } from "@playwright/test";
import { chooseTheme } from "./theme";

test("light and dark workspace visual reference", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("./");
  await expect(
    page.getByRole("textbox", { name: "Original text", exact: true }),
  ).toBeAttached();
  await page.getByLabel("Language", { exact: true }).selectOption("javascript");
  const original = `// A small change can make a big difference.\nfunction greetUser(user) {\n  const name = user.name;\n  const message = \`Hello, \${name}!\`;\n\n  console.log(message);\n  return message;\n}\n\nconst user = { name: "Alex" };\ngreetUser(user);\n`;
  const modified = `// A small change can make a big difference.\nfunction greetUser(user) {\n  const name = user.name ?? "Guest";\n  const message = \`Welcome, \${name}!\`;\n\n  console.info(message);\n  return message;\n}\n\nconst user = { name: "Alex", active: true };\ngreetUser(user);\n`;
  await page.getByLabel("Import original file", { exact: true }).setInputFiles({
    name: "greeting.before.js",
    mimeType: "text/javascript",
    buffer: Buffer.from(original),
  });
  await page.getByLabel("Import modified file", { exact: true }).setInputFiles({
    name: "greeting.after.js",
    mimeType: "text/javascript",
    buffer: Buffer.from(modified),
  });
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByTestId("comparison-status")).toContainText(
    "change region",
  );
  await expect(page.locator(".char-insert").first()).toBeVisible();
  await chooseTheme(page, "light");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("light-workspace.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Color theme", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("light-theme-menu.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await chooseTheme(page, "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: testInfo.outputPath("dark-workspace.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Color theme", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("dark-theme-menu.png"),
    fullPage: true,
  });
});
