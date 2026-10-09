import type { Page } from "@playwright/test";

export async function chooseTheme(
  page: Page,
  theme: "system" | "light" | "dark",
) {
  await page.getByRole("button", { name: "Color theme", exact: true }).click();
  const label = theme[0].toUpperCase() + theme.slice(1);
  await page.getByRole("menuitemradio", { name: label, exact: true }).click();
}
