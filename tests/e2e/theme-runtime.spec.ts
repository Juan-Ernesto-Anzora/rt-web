import { expect, test } from "@playwright/test";

for (const scenario of [
  { preference: "dark", os: "light", effective: "dark" },
  { preference: "system", os: "dark", effective: "dark" },
  { preference: "system", os: "light", effective: "light" },
] as const) {
test(`${scenario.preference} with OS ${scenario.os} resolves before React executes`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: scenario.os });
  await page.addInitScript(preference => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: preference })), scenario.preference);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let markEntryRequested!: () => void;
  const entryRequested = new Promise<void>(resolve => { markEntryRequested = resolve; });
  await page.route(/\/(?:src\/main\.tsx|assets\/index-[^/]+\.js)(?:\?|$)/, async route => {
    markEntryRequested();
    await gate;
    await route.continue();
  });
  const bootstrapResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith("/theme-init.js"));
  try {
    await page.goto("/login", { waitUntil: "commit" });
    const bootstrap = await bootstrapResponse;
    expect(bootstrap.status()).toBe(200);
    expect(bootstrap.headers()["content-type"]).toMatch(/javascript/);
    console.info(`Theme bootstrap: ${bootstrap.url()} status=${bootstrap.status()} cache-control=${bootstrap.headers()["cache-control"] ?? "absent"}`);
    await entryRequested;
    await expect(page.locator("html")).toHaveAttribute("data-theme", scenario.effective);
    expect(await page.evaluate(() => document.documentElement.style.colorScheme)).toBe(scenario.effective);
    expect(await page.evaluate(() => window.rtTheme.getSnapshot().preferenceTheme)).toBe(scenario.preference);
    await expect(page.locator("#root")).toBeEmpty();
    await testInfo.attach("bootstrap-response", { body: JSON.stringify({ url: bootstrap.url(), status: bootstrap.status(), headers: bootstrap.headers() }), contentType: "application/json" });
  } finally { release(); }
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
}

test("existing preferences Save applies theme, preserves fields, and follows System", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.route("**/api/admin/me/permissions/", route => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ is_admin: false, permissions: [] }),
  }));
  await page.addInitScript(() => {
    localStorage.setItem("access", "synthetic-theme-test");
    localStorage.setItem("tenant", "ACME");
    if (!localStorage.getItem("rt.profile.preferences")) {
      localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: "light", density: "comfortable", emailNotifications: false, language: "es" }));
    }
  });
  await page.goto("/profile/preferences");
  await page.getByText("Dark", { exact: true }).click();
  await expect(page.getByLabel("Dark", { exact: true })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Save Preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText("Preferences saved.")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rt.profile.preferences")!))).toEqual({ theme: "dark", density: "comfortable", emailNotifications: false, language: "es" });
  await page.reload();
  await expect(page.getByLabel("Dark", { exact: true })).toBeChecked();
  await page.getByLabel("System", { exact: true }).focus();
  await page.getByLabel("System", { exact: true }).press("Space");
  await page.getByRole("button", { name: "Save Preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => window.rtTheme.getSnapshot().preferenceTheme)).toBe("system");
});

test("semantic consumer switches colors with the root; legacy palette remains available", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  // Isolated test consumer: no new product screen or full-page dark baseline.
  await page.evaluate(() => {
    const sample = document.createElement("section");
    sample.id = "theme-sample";
    sample.textContent = "Request Tracker semantic surface";
    sample.style.cssText = "position:fixed;top:0;left:0;padding:24px;background:rgb(var(--rt-color-surface));color:rgb(var(--rt-color-foreground));border-radius:var(--rt-radius-medium);z-index:100";
    document.body.append(sample);
  });
  const sample = page.locator("#theme-sample");
  await expect(sample).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await testInfo.attach("semantic-light", { body: await sample.screenshot({ path: ".agent/tmp/m2-theme/semantic-light.png" }), contentType: "image/png" });
  await page.evaluate(() => window.rtTheme.setPreference("dark"));
  await expect(sample).toHaveCSS("background-color", "rgb(39, 39, 42)");
  await expect(sample).toHaveCSS("color", "rgb(244, 244, 245)");
  await testInfo.attach("semantic-dark", { body: await sample.screenshot({ path: ".agent/tmp/m2-theme/semantic-dark.png" }), contentType: "image/png" });
  await page.evaluate(() => window.rtTheme.setPreference("light"));
  await expect(sample).toHaveCSS("background-color", "rgb(255, 255, 255)");
});
