import { expect, test, type Page, type Route } from "@playwright/test";

const requestId = "a0000000-0000-4000-8000-000000000010";
const rows = Array.from({ length: 10 }, (_, index) => ({
  request_id: index === 9 ? null : index === 0 ? requestId : `a0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  human_id: `RT-2026-${String(index + 1).padStart(6, "0")}`,
  title: index === 0 ? "VPN access for the support team" : `Request ${index + 1}`,
  status: index === 8 ? null : { status_id: "b0000000-0000-4000-8000-000000000001", name: "Open", category: "open" },
  priority: index === 0 ? "high" : "normal",
  assignee: index === 0 ? { user_id: "b0000000-0000-4000-8000-000000000002", display_name: "Admin User", email: "admin@example.com" } : null,
  requester: { user_id: "b0000000-0000-4000-8000-000000000003", display_name: "Pat Requester", email: "pat@example.com" },
  flow: { flow_id: "b0000000-0000-4000-8000-000000000004", name: "IT Services" },
  updated_at: "2026-09-20T14:30:00Z",
}));

type Fixture = { summaryCalls: number; listCalls: URL[]; detailCalls: number; failSummary: boolean; failList: boolean; emptyList: boolean; rowLimit: number | null; listDelayMs: number };

function jwt() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ email: "admin@example.com", display_name: "Admin User", exp: 4102444800 })}.fixture`;
}

async function setup(page: Page): Promise<Fixture> {
  const state: Fixture = { summaryCalls: 0, listCalls: [], detailCalls: 0, failSummary: false, failList: false, emptyList: false, rowLimit: null, listDelayMs: 0 };
  await page.addInitScript(token => {
    localStorage.setItem("access", token);
    localStorage.setItem("tenant", "ACME");
  }, jwt());
  await page.route("**/api/**", async (route: Route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(4);
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/admin/me/permissions/") return reply({ is_admin: false, permissions: [] });
    if (path === "/dashboard/summary/") {
      state.summaryCalls++;
      return state.failSummary ? reply({ code: "unavailable", message: "Summary unavailable" }, 503)
        : reply({ open: 12, in_progress: 4, due_today: 2, overdue: 1 });
    }
    if (path === "/requests/" && route.request().method() === "GET") {
      state.listCalls.push(url);
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      expect(route.request().headers()["x-tenant"]).toBe("ACME");
      if (state.listDelayMs) await new Promise(resolve => setTimeout(resolve, state.listDelayMs));
      return state.failList ? reply({ code: "unavailable", message: "Requests unavailable" }, 503)
        : reply({ count: state.emptyList ? 0 : state.rowLimit ?? 25, results: state.emptyList ? [] : state.rowLimit === null ? rows : rows.slice(0, state.rowLimit) });
    }
    if (path.startsWith("/requests/") && path.endsWith("/")) {
      state.detailCalls++;
      if (path === `/requests/${requestId}/`) return reply({
        ...rows[0], description: "Fixture detail", created_at: "2026-09-20T12:00:00Z", attachments: [],
      });
      if (/\/(comments|attachments|activity|available-transitions)\/$/.test(path)) return reply([]);
    }
    return reply({ code: "not_found", message: `Unhandled fixture API: ${path}`, details: [] }, 404);
  });
  return state;
}

async function ready(page: Page) {
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "VPN access for the support team" })).toBeVisible();
}

test("Home renders M5B rows without detail fan-out and navigates by public ID", async ({ page }, testInfo) => {
  const api = await setup(page);
  await page.goto("/");
  await ready(page);
  await expect(page.getByRole("region", { name: "Requests" })).toContainText("Admin User");
  await expect(page.getByRole("region", { name: "Requests" })).toContainText("Unassigned");
  await expect(page.getByRole("region", { name: "Requests" })).toContainText("IT Services");
  await expect(page.getByRole("region", { name: "Requests" })).toContainText("Status unavailable");
  await expect(page.getByRole("link", { name: "Request 10" })).toHaveCount(0);
  await expect(page.getByRole("table").getByRole("cell", { name: "High" })).toBeVisible();
  await expect(page.getByRole("table").getByText("Priority: high")).toHaveCount(0);
  expect(api.detailCalls).toBe(0);
  if (testInfo.config.metadata.dashboardPreview) {
    expect(api.summaryCalls).toBe(1);
    expect(api.listCalls).toHaveLength(1);
  }
  expect(api.listCalls.at(-1)?.searchParams.get("page_size")).toBe("10");
  expect(api.listCalls.at(-1)?.searchParams.get("sort")).toBe("-updated_at");
  const requestLink = page.getByRole("link", { name: "VPN access for the support team" });
  await expect(requestLink).toHaveAttribute("href", `/requests/${requestId}`);
  await requestLink.focus();
  await expect(requestLink).toBeFocused();
  await requestLink.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/requests/${requestId}$`));
});

for (const rowCount of [0, 1]) {
  test(`Home with ${rowCount} rows makes no Detail reads`, async ({ page }, testInfo) => {
    const api = await setup(page);
    api.rowLimit = rowCount;
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(page.getByText(`${rowCount} requests`)).toBeVisible();
    if (rowCount) await expect(page.getByRole("link", { name: "VPN access for the support team" })).toBeVisible();
    else await expect(page.getByText("No tasks assigned to you.")).toBeVisible();
    expect(api.detailCalls).toBe(0);
    if (testInfo.config.metadata.dashboardPreview) {
      expect(api.summaryCalls).toBe(1);
      expect(api.listCalls).toHaveLength(1);
    }
  });
}

test("initial skeleton and keyboard queue selection preserve accessible state", async ({ page }) => {
  const api = await setup(page);
  api.listDelayMs = 400;
  await page.goto("/");
  await expect(page.getByText("Loading requests...")).toBeVisible();
  await expect(page.getByRole("region", { name: "Requests" })).toHaveCount(0);
  await ready(page);
  const queue = page.getByRole("button", { name: "Other Tasks" });
  await queue.focus();
  await expect(queue).toBeFocused();
  await queue.press("Enter");
  await expect(queue).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/queue=other_tasks/);
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("mine")).toBe("false");
});

test("queue, quick filter, sort, page, history and refresh use list-only requests", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/");
  await ready(page);
  const initialLists = api.listCalls.length;
  await page.getByRole("group", { name: "Request queues" }).getByRole("button", { name: "Other Tasks" }).click();
  await expect(page).toHaveURL(/queue=other_tasks/);
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("mine")).toBe("false");
  expect(api.listCalls.length).toBe(initialLists + 1);
  await page.getByRole("group", { name: "Quick filters" }).getByRole("button", { name: "High Priority" }).click();
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("priority")).toBe("high");
  await page.getByRole("button", { name: "Next requests page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("page")).toBe("2");
  await page.getByLabel("Sort").selectOption("updated_at");
  await expect(page).not.toHaveURL(/page=2/);
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("sort")).toBe("updated_at");
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await page.goForward();
  await expect(page).toHaveURL(/sort=updated_at/);
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByRole("button", { name: "High Priority" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Other Tasks" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("page")).toBe("2");
  await page.getByRole("button", { name: "My Open" }).click();
  await expect(page.getByRole("button", { name: "My Tasks" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("closed")).toBe("false");
  expect(api.listCalls.at(-1)?.searchParams.get("mine")).toBe("true");
  expect(api.listCalls.at(-1)?.searchParams.get("page")).toBe("1");
  await page.getByRole("button", { name: "Closed", exact: true }).click();
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("closed")).toBe("true");
  await page.getByRole("button", { name: "Unassigned", exact: true }).click();
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("assignee")).toBe("unassigned");
  const beforeRefresh = { summary: api.summaryCalls, list: api.listCalls.length };
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect.poll(() => api.summaryCalls).toBe(beforeRefresh.summary + 1);
  await expect.poll(() => api.listCalls.length).toBe(beforeRefresh.list + 1);
  expect(api.detailCalls).toBe(0);
});

test("all queues use the supported predicates and Detail Back restores Dashboard state", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/");
  await ready(page);
  expect(api.listCalls.at(-1)?.searchParams.get("mine")).toBe("true");
  await page.getByRole("button", { name: "My Requests", exact: true }).click();
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("requested_by_me")).toBe("true");
  const beforeRecent = api.listCalls.length;
  await page.getByRole("button", { name: "Recently Updated" }).click();
  await expect.poll(() => api.listCalls.length).toBe(beforeRecent + 1);
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("sort")).toBe("-updated_at");
  expect(api.listCalls.at(-1)?.searchParams.has("mine")).toBe(false);
  expect(api.listCalls.at(-1)?.searchParams.has("requested_by_me")).toBe(false);
  await page.getByRole("button", { name: "High Priority" }).click();
  await page.getByRole("button", { name: "Next requests page" }).click();
  await expect(page).toHaveURL(/queue=recently_updated/);
  await expect(page).toHaveURL(/quick=high_priority/);
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("link", { name: "VPN access for the support team" }).click();
  await expect(page).toHaveURL(new RegExp(`/requests/${requestId}$`));
  await page.goBack();
  await expect(page).toHaveURL(/queue=recently_updated/);
  await expect(page.getByRole("button", { name: "Recently Updated" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "High Priority" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => api.listCalls.at(-1)?.searchParams.get("page")).toBe("2");
});

test("invalid URL canonicalizes and Home search enters unified Search immediately", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/?queue=bogus&quick=bogus&page=-4&sort=bogus");
  await ready(page);
  await expect(page).toHaveURL("/");
  expect(api.listCalls.at(-1)?.searchParams.get("mine")).toBe("true");
  await page.getByLabel("Search all requests").fill("vpn support");
  await page.getByRole("button", { name: "Search all" }).click();
  await expect(page).toHaveURL(/\/search\?q=vpn%20support$/);
});

test("summary/list errors and empty results stay independent", async ({ page }) => {
  const api = await setup(page);
  api.failSummary = true;
  await page.goto("/");
  await ready(page);
  await expect(page.getByRole("alert")).toContainText("Summary unavailable");
  await expect(page.getByRole("region", { name: "Requests" })).toBeVisible();
  await page.screenshot({ path: ".agent/tmp/m5-dashboard/summary-error-1440.png", fullPage: true });
  api.failSummary = false;
  await page.getByRole("alert").getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  api.failList = true;
  await page.getByRole("group", { name: "Request queues" }).getByRole("button", { name: "My Requests" }).click();
  await expect(page.getByRole("alert")).toContainText("Requests unavailable");
  await expect(page.getByText("No requests created by you.")).toHaveCount(0);
  await page.screenshot({ path: ".agent/tmp/m5-dashboard/list-error-1440.png", fullPage: true });
  api.failList = false;
  api.emptyList = true;
  await page.getByRole("alert").getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByText("No requests created by you.")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.screenshot({ path: ".agent/tmp/m5-dashboard/empty-1440.png", fullPage: true });
  expect(api.detailCalls).toBe(0);
});

for (const [width, theme] of [[320, "light"], [768, "dark"], [1024, "light"], [1440, "light"], [1440, "dark"]] as const) {
  test(`Home at ${width}px in ${theme}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: value })), theme);
    await page.goto("/");
    await ready(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("heading", { name: "Work queue" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.agent/tmp/m5-dashboard/home-${width}-${theme}.png`, fullPage: true });
  });
}

test("system preference resolves Dashboard theme", async ({ page }) => {
  await setup(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: "system" })));
  await page.goto("/");
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
