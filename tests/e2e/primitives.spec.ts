import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
});

test("native actions, accessible icon name and disabled/loading semantics", async ({ page }) => {
  await page.goto("/tests/fixtures/primitives.html");
  const activate = page.getByRole("button", { name: "Activate", exact: true });
  await activate.focus();
  await activate.press("Enter");
  await activate.press("Space");
  await expect(page.getByLabel("Activations")).toHaveText("2");
  await expect(activate).toHaveAttribute("type", "button");
  await expect(activate).toHaveCSS("outline-style", "solid");
  await expect(activate).toHaveCSS("outline-width", "2px");
  const icon = page.getByRole("button", { name: "Add item", exact: true });
  await expect(icon).toHaveAttribute("title", "Add item");
  expect((await icon.boundingBox())!.width).toBeGreaterThanOrEqual(32);
  await icon.click();
  const disabled = page.getByRole("button", { name: "Disabled action" });
  const loading = page.getByRole("button", { name: "Save changes" });
  await expect(disabled).toBeDisabled();
  await expect(loading).toBeDisabled();
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await disabled.evaluate(button => (button as HTMLButtonElement).click());
  await loading.evaluate(button => (button as HTMLButtonElement).click());
  await expect(page.getByLabel("Activations")).toHaveText("3");
  await page.getByRole("button", { name: "Form action", exact: true }).click();
  await expect(page.getByLabel("Submissions")).toHaveText("0");
});

test("Field associates labels, required controls, help and errors without consumer IDs", async ({ page }) => {
  await page.goto("/tests/fixtures/primitives.html");
  const title = page.getByRole("textbox", { name: "Title", exact: true });
  await expect(title).toHaveJSProperty("required", true);
  await page.getByRole("button", { name: "Submit form" }).click();
  await expect(page.getByLabel("Submissions")).toHaveText("0");
  await expect(title).toBeFocused();
  await title.fill("Printer access");
  await page.getByRole("combobox", { name: "Workflow" }).selectOption("it");
  await page.getByRole("checkbox", { name: "Accept terms" }).check();
  await page.getByRole("button", { name: "Submit form" }).click();
  await expect(page.getByLabel("Submissions")).toHaveText("1");
  await page.getByRole("button", { name: "Show field error" }).click();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  expect(await title.evaluate(control => control.getAttribute("aria-describedby")!.split(" ").map(id => document.getElementById(id)?.textContent))).toEqual(["A short summary", "Title needs more detail"]);
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveAttribute("id", "description");
  await expect(page.getByRole("textbox", { name: "Disabled field" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Read-only field" })).toHaveJSProperty("readOnly", true);
});

test("Dialog contains focus, closes on Escape/button and restores the opener", async ({ page }) => {
  await page.goto("/tests/fixtures/primitives.html");
  const opener = page.getByRole("button", { name: "Open dialog", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Edit record" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription("Update the record fields.");
  await expect(page.getByRole("textbox", { name: "Record name" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  // Native modality may expose browser chrome, but never another page control.
  expect(await dialog.evaluate(element => document.activeElement === document.body || element.contains(document.activeElement))).toBe(true);
  await page.getByRole("textbox", { name: "Record name" }).focus();
  await opener.evaluate(element => (element as HTMLButtonElement).focus());
  await expect(page.getByRole("textbox", { name: "Record name" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole("checkbox", { name: "Busy operation" }).check();
  await expect(dialog).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close dialog", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Busy operation" }).uncheck();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("ConfirmDialog adapter preserves safe initial focus and prevents busy dismissal", async ({ page }) => {
  await page.goto("/tests/fixtures/primitives.html");
  await page.getByRole("button", { name: "Open confirmation" }).click();
  const dialog = page.getByRole("dialog", { name: "Remove record" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(dialog).toHaveAttribute("aria-busy", "true");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
});

test("initially open Dialog honors explicit focus during StrictMode mount", async ({ page }) => {
  await page.goto("/tests/fixtures/primitives.html?initial-dialog");
  await expect(page.getByRole("dialog", { name: "Edit record" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Record name" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Dialog helper action" })).not.toBeFocused();
});

test("notices distinguish urgency, empty data, errors and static loading", async ({ page }) => {
  await page.goto("/tests/fixtures/primitives.html");
  await expect(page.getByRole("status").filter({ hasText: "Changes saved" })).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("alert").filter({ hasText: "Action failed" })).toHaveAttribute("aria-live", "assertive");
  await expect(page.getByRole("alert").filter({ hasText: "Could not load records" })).toBeVisible();
  await expect(page.getByText("No records", { exact: true }).locator("..")).not.toHaveAttribute("role", "alert");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByLabel("Activations")).toHaveText("1");
  await expect(page.getByRole("status").filter({ hasText: "Loading data" })).toHaveAttribute("aria-busy", "true");
  expect(await page.locator('[aria-hidden="true"]').evaluateAll(elements => elements.every(element => getComputedStyle(element).animationName === "none"))).toBe(true);
  await expect(page.getByRole("separator")).toHaveCount(1);
  await expect(page.getByText("Waiting for approval", { exact: true })).toBeVisible();
  await expect(page.getByText("Resolved by team", { exact: true })).toBeVisible();
  for (const priority of ["low", "normal", "high", "urgent"]) await expect(page.getByText(`Priority: ${priority}`, { exact: true })).toBeVisible();
});

for (const [preference, os, effective] of [
  ["light", "dark", "light"], ["dark", "light", "dark"], ["system", "light", "light"], ["system", "dark", "dark"],
] as const) {
  test(`semantic primitives: ${preference} with OS ${os}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: os });
    await page.addInitScript(theme => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme })), preference);
    await page.goto("/tests/fixtures/primitives.html");
    await expect(page.locator("html")).toHaveAttribute("data-theme", effective);
    const title = page.getByRole("textbox", { name: "Title", exact: true });
    await expect(title).toHaveCSS("background-color", effective === "dark" ? "rgb(39, 39, 42)" : "rgb(255, 255, 255)");
    await expect(title).toHaveCSS("color", effective === "dark" ? "rgb(244, 244, 245)" : "rgb(15, 23, 42)");
    await title.focus();
    await expect(title).toHaveCSS("outline-color", effective === "dark" ? "rgb(165, 180, 252)" : "rgb(79, 70, 229)");
    await page.getByRole("button", { name: "Open dialog", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Edit record" })).toHaveCSS("background-color", effective === "dark" ? "rgb(39, 39, 42)" : "rgb(255, 255, 255)");
    await page.keyboard.press("Escape");
    if (preference !== "system") await page.screenshot({ path: `.agent/tmp/m3-primitives/${effective}.png`, fullPage: true });
  });
}
