import { expect, test, type Page, type Route } from "@playwright/test";

const FLOW_1 = "c0000000-0000-4000-8000-000000000001";
const FLOW_2 = "c0000000-0000-4000-8000-000000000002";
const STATUS_1 = "d0000000-0000-4000-8000-000000000001";
const STATUS_2 = "d0000000-0000-4000-8000-000000000002";
const USER_1 = "e0000000-0000-4000-8000-000000000001";
const USER_2 = "e0000000-0000-4000-8000-000000000002";
const requestId = "a0000000-0000-4000-8000-000000000001";

type Fixture = {
  resultCount: number;
  totalCount: number | null;
  failSearch: boolean;
  failFlows: boolean;
  failUsers: boolean;
  emptyFlows: boolean;
  emptyUsers: boolean;
  emptyStatuses: boolean;
  omitLastId: boolean;
  omitNested: boolean;
  longContent: boolean;
  slowDelayMs: number;
  pageDelayMs: number;
  searchCalls: URL[];
  detailCalls: string[];
  catalogCalls: URL[];
};

function jwt() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ email: "agent@example.test", display_name: "Agent User", exp: 4102444800 })}.fixture`;
}

async function setup(page: Page): Promise<Fixture> {
  const state: Fixture = {
    resultCount: 10, totalCount: null, failSearch: false, failFlows: false, failUsers: false,
    emptyFlows: false, emptyUsers: false, emptyStatuses: false,
    omitLastId: false, omitNested: false, longContent: false, slowDelayMs: 0, pageDelayMs: 0,
    searchCalls: [], detailCalls: [], catalogCalls: [],
  };
  await page.addInitScript(token => { localStorage.setItem("access", token); localStorage.setItem("tenant", "ACME"); }, jwt());
  await page.route("**/api/**", async (route: Route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const respond = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/admin/me/permissions/") return respond({ is_admin: false, permissions: [] });
    if (url.pathname === "/api/search/requests") {
      state.searchCalls.push(url);
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      expect(route.request().headers()["x-tenant"]).toBe("ACME");
      const q = url.searchParams.get("q");
      if (q === "slow" && state.slowDelayMs) await new Promise(resolve => setTimeout(resolve, state.slowDelayMs));
      if (state.failSearch) return respond({ code: "validation_error", message: "Invalid search query.", details: [{ field: "updated_to", message: "Date range is invalid." }] }, 400);
      const pageNumber = Number(url.searchParams.get("page") || 1);
      if (pageNumber === 2 && state.pageDelayMs) await new Promise(resolve => setTimeout(resolve, state.pageDelayMs));
      const count = state.totalCount ?? state.resultCount;
      const size = pageNumber > Math.ceil(count / 25) ? 0 : state.resultCount;
      const filteredFlow = url.searchParams.get("flow_id") === FLOW_2;
      const filteredStatus = url.searchParams.get("status_id") === STATUS_2;
      const filteredAssignee = url.searchParams.get("assignee_id") === USER_2;
      const results = Array.from({ length: size }, (_, index) => ({
        request_id: state.omitLastId && index === size - 1 ? null : index === 0 ? requestId : `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        human_id: state.longContent && index === 0 ? "RT-2026-VERY-LONG-REQUEST-IDENTIFIER-000001" : `RT-2026-${String(index + 1).padStart(6, "0")}`,
        title: q === "fast" ? `Fast request ${index + 1}` : state.longContent && index === 0 ? "VPN " + "extraordinarilylongrequesttitle".repeat(4) : `VPN request ${index + 1}`,
        priority: index === 0 ? "high" : "normal",
        status_id: filteredStatus ? STATUS_2 : STATUS_1, assignee_id: filteredAssignee ? USER_2 : index === 1 ? null : USER_1, flow_id: filteredFlow ? FLOW_2 : FLOW_1,
        status: state.omitNested && index === 0 ? undefined : filteredStatus
          ? { status_id: STATUS_2, name: "Waiting", category: "waiting", is_terminal: false }
          : { status_id: STATUS_1, name: "Open", category: "open", is_terminal: false },
        requester: state.omitNested && index === 0 ? undefined : { user_id: USER_2, display_name: state.longContent ? "Very long requester display name " + "N".repeat(60) : "Requester User", email: "requester@example.test" },
        assignee: !filteredAssignee && index === 1 ? null : state.omitNested && index === 0 ? undefined : filteredAssignee
          ? { user_id: USER_2, display_name: "Admin User", email: "admin@example.test" }
          : { user_id: USER_1, display_name: state.longContent ? "Very long assigned user display name " + "A".repeat(60) : "Agent User", email: "agent@example.test" },
        flow: state.omitNested && index === 0 ? undefined : filteredFlow
          ? { flow_id: FLOW_2, name: "People Operations" }
          : { flow_id: FLOW_1, name: state.longContent ? "Very long flow name " + "F".repeat(60) : "IT Services" },
        created_at: "2026-09-20T12:00:00Z", updated_at: "2026-09-20T14:30:00Z", rank: 30,
        match_sources: index === 0 ? ["request", "comment", "attachment"] : ["request"],
      }));
      return respond({ count, page: pageNumber, page_size: 25, results });
    }
    if (url.pathname === "/api/flows/" || url.pathname === "/api/users/" || url.pathname.endsWith("/statuses/")) {
      state.catalogCalls.push(url);
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      expect(route.request().headers()["x-tenant"]).toBe("ACME");
      if (url.pathname === "/api/flows/") {
        if (state.failFlows) return respond({ code: "unavailable", message: "Flows unavailable", details: [] }, 503);
        if (state.emptyFlows) return respond({ count: 0, next: null, results: [] });
        return Number(url.searchParams.get("page")) === 1
          ? respond({ count: 2, next: "http://127.0.0.1:8000/api/flows/?page=2", results: [{ flow_id: FLOW_1, name: "IT Services" }] })
          : respond({ count: 2, next: null, results: [{ flow_id: FLOW_2, name: "People Operations" }] });
      }
      if (url.pathname.endsWith("/statuses/")) return respond(state.emptyStatuses ? [] : url.pathname.includes(FLOW_2)
        ? [{ status_id: STATUS_2, flow_id: FLOW_2, name: "Waiting", category: "waiting", is_terminal: false }]
        : [{ status_id: STATUS_1, flow_id: FLOW_1, name: "Open", category: "open", is_terminal: false }]);
      if (state.failUsers) return respond({ code: "unavailable", message: "Users unavailable", details: [] }, 503);
      if (state.emptyUsers) return respond({ count: 0, next: null, results: [] });
      if (url.searchParams.get("search")) return respond({ count: 1, next: null, results: [{ user_id: USER_2, display_name: "Admin User", email: "admin@example.test" }] });
      return Number(url.searchParams.get("page")) === 1
        ? respond({ count: 2, next: "http://127.0.0.1:8000/api/users/?page=2", results: [{ user_id: USER_1, display_name: "Agent User", email: "agent@example.test" }] })
        : respond({ count: 2, next: null, results: [{ user_id: USER_2, display_name: "Admin User", email: "admin@example.test" }] });
    }
    if (/^\/api\/requests\/[0-9a-f-]+\/$/.test(url.pathname)) {
      state.detailCalls.push(route.request().url());
      return respond({ request_id: requestId, human_id: "RT-2026-000001", title: "VPN request 1", description: "Detail only", priority: "high",
        status: { status_id: STATUS_1, name: "Open", category: "open", is_terminal: false }, requester: { user_id: USER_2, display_name: "Requester User" },
        assignee: { user_id: USER_1, display_name: "Agent User" }, flow: { flow_id: FLOW_1, name: "IT Services" }, created_at: "2026-09-20T12:00:00Z", updated_at: "2026-09-20T14:30:00Z", attachments: [] });
    }
    if (/^\/api\/requests\/[0-9a-f-]+\/(comments|attachments|activity|available-transitions)\/$/.test(url.pathname)) return respond([]);
    return respond({ code: "not_found", message: `Unhandled fixture API: ${url.pathname}`, details: [] }, 404);
  });
  return state;
}

async function ready(page: Page) {
  await expect(page.getByRole("link", { name: "VPN request 1", exact: true })).toBeVisible();
}

for (const n of [0, 1, 10, 25]) {
  test(`production-shaped Search with ${n} results uses no Detail enrichment`, async ({ page }, testInfo) => {
    const api = await setup(page);
    api.resultCount = n;
    await page.goto("/search?q=vpn");
    if (n) await ready(page);
    else await expect(page.getByText("No requests matched this search.")).toBeVisible();
    expect(api.detailCalls).toHaveLength(0);
    if (testInfo.config.metadata.searchPreview) expect(api.searchCalls).toHaveLength(1);
    expect(api.searchCalls.at(-1)?.searchParams.get("page_size")).toBe("25");
    expect(api.searchCalls.at(-1)?.searchParams.has("sort")).toBe(false);
    expect(api.searchCalls.at(-1)?.searchParams.has("tag")).toBe(false);
    if (n === 0) await page.screenshot({ path: ".agent/tmp/m6-search/empty-1440-light.png", fullPage: true });
    if (n === 10) await page.screenshot({ path: ".agent/tmp/m6-search/populated-1440-light.png", fullPage: true });
  });
}

test("result rows use compact summaries, sources and public title links", async ({ page }) => {
  const api = await setup(page);
  api.omitLastId = true;
  api.omitNested = true;
  await page.goto("/search?q=vpn");
  await expect(page.getByText("Status unavailable").first()).toBeVisible();
  await expect(page.getByText("Assignee unavailable").first()).toBeVisible();
  await expect(page.getByText("Unassigned").first()).toBeVisible();
  await expect(page.getByText("Matched in comments and attachment names").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "VPN request 10" })).toHaveCount(0);
  await expect(page.getByText("Detail only")).toHaveCount(0);
  await expect(page.getByText("30", { exact: true })).toHaveCount(0);
  expect(api.detailCalls).toHaveLength(0);
  const link = page.getByRole("link", { name: "VPN request 1", exact: true });
  await expect(link).toHaveAttribute("href", `/requests/${requestId}`);
  await link.focus();
  await expect(link).toBeFocused();
  await link.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/requests/${requestId}$`));
});

test("blank entry, explicit submit and full clear use URL without empty API reads", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/search");
  await expect(page.getByText("No search yet").first()).toBeVisible();
  expect(api.searchCalls).toHaveLength(0);
  const searchField = page.getByRole("textbox", { name: "Search requests" });
  await expect(searchField).toHaveAttribute("placeholder", "Search requests...");
  const help = page.getByText("Searches titles, descriptions, comments and attachment names.");
  await expect(help).toBeVisible();
  await expect(searchField).toHaveAttribute("aria-describedby", await help.getAttribute("id") || "");
  await searchField.fill("vpn");
  expect(api.searchCalls).toHaveLength(0);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=vpn$/);
  await ready(page);
  expect(api.searchCalls).toHaveLength(1);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByText("No search yet").first()).toBeVisible();
  expect(api.searchCalls).toHaveLength(1);
});

test("Filters disclosure names and expanded state follow the visible panel", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/search");
  const trigger = page.getByRole("button", { name: "Filters", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  const openTrigger = page.getByRole("button", { name: "Hide filters" });
  await expect(openTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("form", { name: "Search filters" })).toBeVisible();
  await expect(page.getByText("Select a flow to choose a status.")).toBeVisible();
  await openTrigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  expect(api.searchCalls).toHaveLength(0);
});

test("applied filters remain compact and removable at 320px Dark", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addInitScript(() => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: "dark" })));
  await page.goto(`/search?q=vpn&flow_id=${FLOW_2}&status_id=${STATUS_2}&assignee_id=${USER_1}&updated_from=2026-09-20&updated_to=2026-09-22`);
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.getByRole("button", { name: "Remove Flow filter: People Operations" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Status filter: Waiting" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Assignee filter: Agent User" })).toBeVisible();
  await page.getByRole("button", { name: "Hide filters" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".agent/tmp/m6-search/filters-applied-320-dark.png", fullPage: true });
});

test("explicit Search of the unchanged applied state refreshes once", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/search?q=vpn");
  await ready(page);
  const before = api.searchCalls.length;
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect.poll(() => api.searchCalls.length).toBe(before + 1);
  await expect(page).toHaveURL(/\/search\?q=vpn$/);
});

test("catalog filters use stable IDs and Apply makes one Search call", async ({ page }, testInfo) => {
  const api = await setup(page);
  await page.goto("/search?q=vpn");
  await ready(page);
  await page.getByRole("button", { name: "Filters" }).click();
  const panel = page.getByRole("form", { name: "Search filters" });
  await expect(panel.getByRole("option", { name: "People Operations" })).toBeAttached();
  const flowReads = api.catalogCalls.filter(url => url.pathname === "/api/flows/");
  if (testInfo.config.metadata.searchPreview) expect(flowReads).toHaveLength(2);
  else expect(flowReads.length).toBeGreaterThanOrEqual(2);
  const before = api.searchCalls.length;
  await panel.getByRole("combobox", { name: "Flow" }).selectOption(FLOW_2);
  await expect(panel.getByRole("option", { name: /Waiting/ })).toBeAttached();
  await panel.getByRole("combobox", { name: /Status/ }).selectOption(STATUS_2);
  await panel.getByRole("button", { name: "Load more users" }).click();
  await expect(panel.getByRole("option", { name: "Admin User" })).toBeAttached();
  await panel.getByRole("combobox", { name: "Assignee" }).selectOption(USER_2);
  await panel.getByRole("textbox", { name: "Updated from" }).fill("2026-09-20");
  await panel.getByRole("textbox", { name: "Updated to" }).fill("2026-09-22");
  expect(api.searchCalls).toHaveLength(before);
  await panel.getByRole("button", { name: "Apply filters" }).click();
  await expect.poll(() => api.searchCalls.length).toBe(before + 1);
  const params = api.searchCalls.at(-1)!.searchParams;
  expect(Object.fromEntries(params)).toMatchObject({ q: "vpn", flow_id: FLOW_2, status_id: STATUS_2, assignee_id: USER_2, updated_from: "2026-09-20", updated_to: "2026-09-22", page: "1", page_size: "25" });
  for (const ignored of ["flow", "status", "assignee", "tag", "sort"]) expect(params.has(ignored)).toBe(false);
  await expect(page.getByRole("button", { name: /Remove Flow filter: People Operations/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove Assignee filter: Admin User/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Search results" })).toContainText("Waiting");
  await expect(page.getByRole("region", { name: "Search results" })).toContainText("People Operations");
  await expect(page.getByText("Tag", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: ".agent/tmp/m6-search/filters-applied-1440-light.png", fullPage: true });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Search requests" })).toHaveValue("vpn");
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.getByRole("form", { name: "Search filters" }).getByRole("combobox", { name: "Flow" })).toHaveValue(FLOW_2);
  await expect(page.getByRole("form", { name: "Search filters" }).getByRole("combobox", { name: /Status/ })).toHaveValue(STATUS_2);
  await expect(page.getByRole("form", { name: "Search filters" }).getByRole("combobox", { name: "Assignee" })).toHaveValue(USER_2);
  await expect(page.getByRole("form", { name: "Search filters" }).getByRole("textbox", { name: "Updated to" })).toHaveValue("2026-09-22");
});

test("assignee catalog search uses server search and submits the public user ID", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/search?q=vpn");
  await ready(page);
  await page.getByRole("button", { name: "Filters" }).click();
  const panel = page.getByRole("form", { name: "Search filters" });
  await panel.getByRole("textbox", { name: "Find assignee" }).fill("admin");
  await panel.getByRole("button", { name: "Find users" }).click();
  await expect(panel.getByRole("option", { name: "Admin User" })).toBeAttached();
  expect(api.catalogCalls.at(-1)?.searchParams.get("search")).toBe("admin");
  await panel.getByRole("combobox", { name: "Assignee" }).selectOption(USER_2);
  const before = api.searchCalls.length;
  await panel.getByRole("button", { name: "Apply filters" }).click();
  await expect.poll(() => api.searchCalls.length).toBe(before + 1);
  expect(api.searchCalls.at(-1)?.searchParams.get("assignee_id")).toBe(USER_2);
});

test("status-only deep link persists and catalog failure leaves Search intact", async ({ page }) => {
  const api = await setup(page);
  api.failFlows = true;
  api.failUsers = true;
  await page.goto(`/search?q=vpn&status_id=${STATUS_1}`);
  await ready(page);
  await expect(page.getByRole("button", { name: /Remove Status filter: Unavailable status/ })).toBeVisible();
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Flows unavailable" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Users unavailable" })).toBeVisible();
  await ready(page);
  expect(api.searchCalls.at(-1)?.searchParams.get("status_id")).toBe(STATUS_1);
  api.failFlows = false;
  api.failUsers = false;
  await page.getByRole("button", { name: "Retry flows" }).click();
  await expect(page.getByRole("option", { name: "People Operations" })).toBeAttached();
  await page.getByRole("button", { name: /Remove Status filter/ }).click();
  await expect.poll(() => api.searchCalls.at(-1)?.searchParams.has("status_id")).toBe(false);
  await expect(page).toHaveURL(/q=vpn/);
});

test("empty tenant catalogs show honest local states without losing results", async ({ page }) => {
  const api = await setup(page);
  api.emptyFlows = true;
  api.emptyUsers = true;
  api.emptyStatuses = true;
  await page.goto(`/search?q=vpn&flow_id=${FLOW_1}`);
  await ready(page);
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.getByText("No flows available.")).toBeVisible();
  await expect(page.getByText("No users available.")).toBeVisible();
  await expect(page.getByText("No statuses available for this flow.")).toBeVisible();
  await ready(page);
  expect(api.searchCalls.at(-1)?.searchParams.get("flow_id")).toBe(FLOW_1);
});

test("Detail Back restores Search query, IDs and page", async ({ page }) => {
  const api = await setup(page);
  api.totalCount = 50;
  api.resultCount = 25;
  await page.goto(`/search?q=vpn&flow_id=${FLOW_1}&page=2`);
  await ready(page);
  expect(api.detailCalls).toHaveLength(0);
  await page.getByRole("link", { name: "VPN request 1", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/requests/${requestId}$`));
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`q=vpn&flow_id=${FLOW_1}&page=2`));
  await ready(page);
  expect(api.searchCalls.at(-1)?.searchParams.get("page")).toBe("2");
  expect(api.searchCalls.at(-1)?.searchParams.get("flow_id")).toBe(FLOW_1);
});

test("out-of-range page retains server total and offers an earlier page", async ({ page }) => {
  const api = await setup(page);
  api.totalCount = 10;
  await page.goto("/search?q=vpn&page=99");
  await expect(page.getByText("No results on this page.")).toBeVisible();
  await expect(page.getByText("Page 99 of 1")).toBeVisible();
  expect(api.searchCalls.at(-1)?.searchParams.get("page")).toBe("99");
  expect(api.detailCalls).toHaveLength(0);
  await page.getByRole("button", { name: "Previous results page" }).click();
  await expect(page).toHaveURL(/page=98/);
});

test("paging retains focus and never labels prior rows as the next page", async ({ page }) => {
  const api = await setup(page);
  api.resultCount = 25;
  api.totalCount = 75;
  api.pageDelayMs = 300;
  await page.goto("/search?q=vpn");
  await ready(page);
  const next = page.getByRole("button", { name: "Next results page" });
  await next.focus();
  await next.click();
  await expect(page).toHaveURL(/page=2/);
  await expect(next).toBeFocused();
  await expect(page.getByRole("link", { name: "VPN request 1", exact: true })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Loading data" })).toBeVisible();
  await ready(page);
  await expect(next).toBeFocused();
});

test("Cancel discards drafts; paging uses applied state and Back restores it", async ({ page }) => {
  const api = await setup(page);
  api.totalCount = 50;
  api.resultCount = 25;
  await page.goto("/search?q=vpn");
  await ready(page);
  await page.getByRole("button", { name: "Filters" }).click();
  const panel = page.getByRole("form", { name: "Search filters" });
  await expect(panel.getByRole("option", { name: "IT Services" })).toBeAttached();
  await panel.getByRole("combobox", { name: "Flow" }).selectOption(FLOW_1);
  await panel.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/search\?q=vpn$/);
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByRole("form", { name: "Search filters" }).getByRole("combobox", { name: "Flow" })).toHaveValue("");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("textbox", { name: "Search requests" }).fill("unsaved");
  const before = api.searchCalls.length;
  await page.getByRole("button", { name: "Next results page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(() => api.searchCalls.length).toBe(before + 1);
  expect(api.searchCalls.at(-1)?.searchParams.get("q")).toBe("vpn");
  await page.goBack();
  await expect(page).toHaveURL(/\/search\?q=vpn$/);
  await page.goForward();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Search requests" })).toHaveValue("vpn");
});

test("malformed URL is canonicalized; reversed dates validate before Search", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/search?q=vpn&status_id=bad&tag=legacy&page=-3");
  await ready(page);
  await expect(page).toHaveURL(/\/search\?q=vpn$/);
  await expect(page.getByText(/Invalid status_id filter was removed/)).toBeVisible();
  expect(api.searchCalls.at(-1)?.searchParams.has("status_id")).toBe(false);
  await page.getByRole("button", { name: "Filters" }).click();
  const panel = page.getByRole("form", { name: "Search filters" });
  await panel.getByRole("textbox", { name: "Updated from" }).fill("2026-09-22");
  await panel.getByRole("textbox", { name: "Updated to" }).fill("2026-09-20");
  const before = api.searchCalls.length;
  await panel.getByRole("button", { name: "Apply filters" }).click();
  await expect(panel.getByText("Updated to must be on or after Updated from.")).toBeVisible();
  expect(api.searchCalls).toHaveLength(before);
});

test("Search failure, retry and stale response isolation remain separate states", async ({ page }) => {
  const api = await setup(page);
  api.failSearch = true;
  await page.goto("/search?q=vpn");
  await expect(page.getByRole("alert").filter({ hasText: "Invalid search query." })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Updated to: Date range is invalid.");
  await expect(page.getByRole("form", { name: "Search filters" }).getByText("Date range is invalid.")).toBeVisible();
  await page.screenshot({ path: ".agent/tmp/m6-search/error-1440-light.png", fullPage: true });
  await expect(page.getByText("No requests matched this search.")).toHaveCount(0);
  await expect(page).toHaveURL(/q=vpn/);
  api.failSearch = false;
  const beforeRetry = api.searchCalls.length;
  await page.getByRole("button", { name: "Retry search" }).click();
  await ready(page);
  expect(api.searchCalls.length).toBe(beforeRetry + 1);
  await page.getByRole("textbox", { name: "Search requests" }).fill("slow");
  api.slowDelayMs = 400;
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=slow/);
  await page.getByRole("textbox", { name: "Search requests" }).fill("fast");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("link", { name: "Fast request 1", exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole("link", { name: "Fast request 1", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "VPN request 1", exact: true })).toHaveCount(0);
});

for (const [width, theme] of [[1440, "light"], [1440, "dark"], [1024, "light"], [768, "dark"], [320, "light"], [320, "dark"]] as const) {
  test(`populated Search at ${width}px in ${theme}`, async ({ page }) => {
    const api = await setup(page);
    api.longContent = true;
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: value })), theme);
    await page.goto("/search?q=vpn");
    await expect(page.getByRole("link", { name: /VPN extraordinarilylongrequesttitle/ })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width >= 1024) await expect.poll(() => page.evaluate(() =>
      [...document.querySelectorAll("[aria-label='Search results'] tbody tr:first-child td")].every(cell => cell.scrollWidth <= cell.clientWidth + 1),
    )).toBe(true);
    await page.getByRole("button", { name: "Filters" }).click();
    await expect(page.getByRole("button", { name: "Hide filters" })).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 320) {
      const searchSection = page.getByRole("main", { name: "Main content" }).locator("section").first();
      expect((await searchSection.boundingBox())!.y).toBeGreaterThanOrEqual((await page.getByRole("banner").boundingBox())!.y + (await page.getByRole("banner").boundingBox())!.height);
      const assigneeInput = await page.getByRole("textbox", { name: "Find assignee" }).boundingBox();
      const findUsers = await page.getByRole("button", { name: "Find users" }).boundingBox();
      expect(findUsers!.y).toBeGreaterThanOrEqual(assigneeInput!.y + assigneeInput!.height);
    }
    await page.screenshot({ path: `.agent/tmp/m6-search/search-${width}-${theme}.png`, fullPage: true });
  });
}

test("640px CSS reflow proxy for a 1280px viewport at 200% zoom", async ({ page }) => {
  const api = await setup(page);
  api.longContent = true;
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/search?q=vpn");
  await expect(page.getByRole("link", { name: /VPN extraordinarilylongrequesttitle/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Filters" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("System preference updates Search surface and Home handoff opens one applied query", async ({ page }, testInfo) => {
  const api = await setup(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("rt.profile.preferences", JSON.stringify({ theme: "system" })));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Search all requests" }).fill("vpn");
  await page.getByRole("button", { name: "Search all" }).click();
  await ready(page);
  await expect(page).toHaveURL(/\/search\?q=vpn$/);
  if (testInfo.config.metadata.searchPreview) expect(api.searchCalls).toHaveLength(1);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
