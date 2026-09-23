import { expect, test, type Page, type Route } from "@playwright/test";

const permissions = ["admin.read", "admin.workflows", "admin.users", "admin.roles", "admin.permissions", "admin.audit.read", "reports.read", "reports.export", "sla.manage", "admin.settings", "tenant.settings.manage", "featureflags.manage", "notifications.manage"];
const requestId = "a0000000-0000-4000-8000-000000000010";
test.use({ locale: "en-US", timezoneId: "America/El_Salvador" });

function jwt() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ email: "admin@example.com", display_name: "Admin User", exp: 4102444800 })}.fixture`;
}

async function setup(page: Page, admin = true) {
  await page.addInitScript(token => { localStorage.setItem("access", token); localStorage.setItem("tenant", "ACME"); }, jwt());
  let permissionReads = 0;
  await page.route("**/api/**", async (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.startsWith("/api/")) return route.continue();
    const path = pathname.slice(4);
    const respond = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/admin/me/permissions/") {
      permissionReads++;
      return admin ? respond({ is_admin: true, permissions }) : respond({ code: "permission_denied", message: "Denied", details: [] }, 403);
    }
    if (path === "/dashboard/summary/") return respond({ open: 2, in_progress: 1, due_today: 1, overdue: 0 });
    if (path === "/requests/" && route.request().method() === "GET") return respond({ count: 0, results: [] });
    if (path === `/requests/${requestId}/`) return respond({ request_id: requestId, human_id: "RT-2026-000123", title: "Request detail fixture", description: "Fixture description", priority: "normal", flow: { flow_id: "b0000000-0000-4000-8000-000000000001", name: "IT" }, status: { status_id: "b0000000-0000-4000-8000-000000000002", name: "Open", category: "open" }, requester: { user_id: "b0000000-0000-4000-8000-000000000003", display_name: "Requester", email: "requester@example.com" }, assignee: null, created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", attachments: [] });
    if (/^\/requests\/[0-9a-f-]+\/(comments|attachments|activity|available-transitions)\/$/.test(path)) return respond([]);
    if (path === "/flows/") return respond([{ flow_id: "b0000000-0000-4000-8000-000000000001", name: "IT" }]);
    if (path === "/flows/b0000000-0000-4000-8000-000000000001/statuses/") return respond([{ status_id: "b0000000-0000-4000-8000-000000000002", name: "Open", category: "open" }]);
    if (path === "/users/") return respond([{ user_id: "b0000000-0000-4000-8000-000000000003", display_name: "Requester", email: "requester@example.com" }]);
    if (path === "/search/requests") return respond({ count: 0, results: [] });
    if (path === "/admin/workflows/") return respond([]);
    if (path === "/admin/users/" || path === "/admin/roles/" || path === "/admin/permissions/" || path === "/admin/audit/" || path === "/admin/sla-policies/") return respond({ count: 0, results: [] });
    if (path === "/reports/summary/") return respond({ total: 0, open: 0, in_progress: 0, closed: 0, waiting: 0, overdue: 0, due_today: 0, unassigned: 0, by_status: [], by_priority: [] });
    if (path === "/admin/settings/") return respond({ settings: [
      { setting_id: "50000000-0000-4000-8000-000000000001", key: "web_base_url", value: "http://127.0.0.1:5173", value_type: "url", is_sensitive: false, has_value: true },
      { setting_id: "50000000-0000-4000-8000-000000000002", key: "default_timezone", value: "America/El_Salvador", value_type: "timezone", is_sensitive: false, has_value: true },
      { setting_id: "50000000-0000-4000-8000-000000000003", key: "default_page_size", value: "25", value_type: "integer", is_sensitive: false, has_value: true },
      { setting_id: "50000000-0000-4000-8000-000000000004", key: "email_from", value: "rt@example.com", value_type: "email", is_sensitive: false, has_value: true },
    ] });
    if (path === "/admin/feature-flags/" || path === "/admin/notification-templates/") return respond([]);
    return respond({ code: "not_found", message: `Unhandled fixture API: ${path}`, details: [] }, 404);
  });
  return { permissionReads: () => permissionReads };
}

test("authenticated routes share shell and pathname drives active navigation and history", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/search?q=vpn");
  await expect(page.getByRole("heading", { name: "Search Requests" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("main", { name: "Main content" })).toHaveCount(1);
  await page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Home" })).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/search\?q=vpn$/);
  await expect(page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "New Request" }).first().click();
  await expect(page).toHaveURL(/\/requests\/new$/);
  await expect(page.getByRole("heading", { name: "New Request" })).toBeVisible();
  await page.goto(`/requests/${requestId}`);
  await expect(page.getByRole("heading", { name: "Request detail fixture" })).toBeVisible();
  await expect(page.getByRole("banner").getByText("Request Tracker")).toBeVisible();
  await page.goto("/profile/preferences");
  await expect(page.getByRole("heading", { name: "Profile & Preferences" })).toBeVisible();
  await expect(page.getByRole("main", { name: "Main content" })).toHaveCount(1);
  expect(api.permissionReads()).toBeGreaterThan(0);
});

test("skip link, user disclosure and global actions work from the keyboard", async ({ page }) => {
  await setup(page);
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.getByRole("main", { name: "Main content" })).toBeFocused();
  const user = page.getByRole("button", { name: "User actions for Admin User" });
  await user.focus();
  await user.press("Enter");
  await expect(user).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("group", { name: "User actions" })).toBeVisible();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(user).toHaveAttribute("aria-expanded", "false");
  await expect(user).toBeFocused();
  await user.click();
  await user.press("Tab");
  await expect(page.getByRole("link", { name: "Preferences" })).toBeFocused();
  await page.getByRole("heading", { name: "Home" }).click();
  await expect(user).toHaveAttribute("aria-expanded", "false");
  await user.click();
  await page.getByRole("link", { name: "Preferences" }).click();
  await expect(page).toHaveURL(/\/profile\/preferences$/);
  await page.getByRole("link", { name: "Search" }).first().click();
  await expect(page).toHaveURL(/\/search$/);
  await user.click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem("access"))).toBeNull();
});

test("admin navigation reuses permissions; direct guard and friendly error routes remain", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/admin/workflows");
  await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workflow configuration" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Administration navigation" })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Administration navigation" }).getByRole("link", { name: "Workflows" })).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Workflow configuration" })).toBeVisible();
  expect(api.permissionReads()).toBeGreaterThan(0);
  await page.goto("/404-bogus");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByText("Unexpected Application Error")).toHaveCount(0);
  await setup(page, false);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Administration navigation" })).toHaveCount(0);
});

test("dirty Settings blocks shell navigation until the user decides", async ({ page }) => {
  await setup(page);
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "General settings" })).toBeVisible();
  await page.getByLabel("Web base URL").fill("http://example.test/rt");
  await page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Home" }).click();
  const confirmation = page.getByRole("dialog", { name: "Leave with unsaved changes?" });
  await expect(confirmation).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(confirmation).not.toBeVisible();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Home" }).click();
  await confirmation.getByRole("button", { name: "Leave page" }).click();
  await expect(page).toHaveURL(/\/$/);
});

for (const [width, color] of [[320, "light"], [768, "dark"], [1024, "light"], [1440, "dark"]] as const) {
  test(`shell at ${width}px in ${color}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme })), color);
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "Search Requests" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", color);
    const shell = page.getByRole("banner");
    await expect(shell).toHaveCSS("background-color", color === "dark" ? "rgb(39, 39, 42)" : "rgb(255, 255, 255)");
    await expect(page.getByRole("heading", { name: "Search Requests" })).toHaveCSS("color", "rgb(15, 23, 42)");
    await expect(page.locator(".legacy-page")).toHaveCSS("color-scheme", "light");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `.agent/tmp/m4-shell/search-${width}-${color}.png`, fullPage: true });
    if (width < 1024) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      const nav = page.getByRole("dialog", { name: "Navigation" });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("link", { name: "Search" })).toHaveCSS("border-left-color", color === "dark" ? "rgb(161, 161, 170)" : "rgb(71, 85, 105)");
      await expect.poll(() => nav.evaluate(element => element === document.activeElement || element.contains(document.activeElement))).toBe(true);
      if (width === 320) await nav.screenshot({ path: ".agent/tmp/m4-shell/navigation-320.png" });
      await nav.getByRole("link", { name: "New Request" }).click();
      await expect(page).toHaveURL(/\/requests\/new$/);
      await expect(nav).not.toBeVisible();
      await expect(page.getByRole("heading", { name: "New Request" })).toBeFocused();
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
      if (width === 320) {
        await page.goto("/profile/preferences");
        await expect(page.getByRole("heading", { name: "Profile & Preferences" })).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    } else {
      await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Search" })).toHaveCSS("border-left-color", color === "dark" ? "rgb(161, 161, 170)" : "rgb(71, 85, 105)");
    }
    await page.screenshot({ path: `.agent/tmp/m4-shell/${width}-${color}.png`, fullPage: true });
  });
}

for (const [os, effective] of [["light", "light"], ["dark", "dark"]] as const) {
  test(`System preference gives a ${effective} shell with ${os} OS`, async ({ page }) => {
    await setup(page);
    await page.emulateMedia({ colorScheme: os });
    await page.addInitScript(() => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: "system" })));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", effective);
    await expect(page.getByRole("banner")).toHaveCSS("background-color", effective === "dark" ? "rgb(39, 39, 42)" : "rgb(255, 255, 255)");
  });
}

test("shell screenshots cover Home, Admin and Detail without adding page baselines", async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: "light" })));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.screenshot({ path: ".agent/tmp/m4-shell/home-1440-light.png", fullPage: true });
  await page.goto("/admin/workflows");
  await expect(page.getByRole("heading", { name: "Workflow configuration" })).toBeVisible();
  await page.screenshot({ path: ".agent/tmp/m4-shell/admin-1440-light.png", fullPage: true });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`/requests/${requestId}`);
  await expect(page.getByRole("heading", { name: "Request detail fixture" })).toBeVisible();
  await page.screenshot({ path: ".agent/tmp/m4-shell/detail-1024-light.png", fullPage: true });
});

test("permission reads do not multiply during shell navigation", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const initial = api.permissionReads();
  expect(initial).toBeGreaterThan(0);
  await page.getByRole("banner").getByRole("link", { name: "New Request" }).click();
  await expect(page.getByRole("heading", { name: "New Request" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(api.permissionReads()).toBe(initial);
  console.info(`M4 mocked permission reads: initial Home=${initial}, after client navigation=${api.permissionReads()}`);
});
