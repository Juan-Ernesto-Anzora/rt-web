import { expect, test, type Page, type Route } from "@playwright/test";

const ADMIN_PERMISSIONS = [
  "admin.read", "admin.users", "admin.roles", "admin.permissions", "admin.workflows",
  "admin.audit.read", "reports.read", "reports.export", "sla.manage", "admin.settings",
  "tenant.settings.manage", "featureflags.manage", "notifications.manage",
];

function testJwt() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ email: "admin@example.com", display_name: "Admin User", exp: 4_102_444_800 })}.test`;
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockApi(page: Page, authorized = true) {
  let workflow: { flow_id: string; name: string; description: string; created_at: string } | null = null;
  const workflowStatuses: Array<{ status_id: string; flow_id: string; name: string; category: string; is_terminal: boolean; created_at: string }> = [];
  let requestTitle = "Responsive request";
  
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method();
    
    // Non-fetch/xhr requests should continue
    if (!["fetch", "xhr"].includes(request.resourceType())) {
      return route.continue();
    }
    
    try {
      // Auth endpoints
      if (path === "/auth/jwt/create" && method === "POST") {
        return json(route, { access: testJwt(), refresh: "test-refresh" });
      }
      
      if (path === "/admin/me/permissions/") {
        if (!authorized) return json(route, { code: "permission_denied", message: "Denied", details: [] }, 403);
        return json(route, { 
          tenant_id: "11111111-1111-4111-8111-111111111111", 
          user: { 
            user_id: "22222222-2222-4222-8222-222222222222", 
            display_name: "Admin User", 
            email: "admin@example.com" 
          }, 
          permissions: ADMIN_PERMISSIONS
        });
      }
      
      // Dashboard
      if (path === "/dashboard/summary/") {
        return json(route, { open: 2, in_progress: 1, waiting: 0, closed: 3, due_today: 1, overdue: 0, assigned_to_me: 2, unassigned: 0 });
      }
      
      // Requests - GET list
      if (path === "/requests/" && method === "GET") {
        return json(route, { count: 0, next: null, previous: null, results: [] });
      }
      
      // Requests - POST create
      if (path === "/requests/" && method === "POST") {
        const body = await request.postDataJSON();
        requestTitle = body.title;
        return json(route, { request_id: "a0000000-0000-4000-8000-000000000010" });
      }
      
      // Request detail
      if (/^\/requests\/[0-9a-f-]+\/$/.test(path)) {
        return json(route, { 
          request_id: path.split("/")[2], 
          human_id: "RT-2026-000123", 
          title: requestTitle, 
          description: "Request detail smoke data.",
          priority: "normal",
          status_id: "b0000000-0000-4000-8000-000000000002",
          flow_id: "b0000000-0000-4000-8000-000000000001",
          requester_id: "b0000000-0000-4000-8000-000000000003"
        });
      }
      
      // Request sub-resources
      if (/^\/requests\/[0-9a-f-]+\/(comments|attachments|activity)\/$/.test(path)) {
        return json(route, []);
      }
      
      // Available transitions
      if (/^\/requests\/[0-9a-f-]+\/available-transitions\/$/.test(path)) {
        return json(route, [{ 
          transition_id: "c0000000-0000-4000-8000-000000000001", 
          name: "Move to In Progress" 
        }]);
      }
      
      // Transition action
      if (/^\/requests\/[0-9a-f-]+\/transition\/$/.test(path) && method === "POST") {
        return json(route, { 
          request_id: "a0000000-0000-4000-8000-000000000010", 
          status_id: "c0000000-0000-4000-8000-000000000011" 
        });
      }
      
      // Admin - Users
      if (path === "/admin/users/") {
        return json(route, { 
          count: 1, 
          next: null, 
          previous: null, 
          results: [{ 
            user_id: "33333333-3333-4333-8333-333333333333", 
            email: "agent@example.com", 
            display_name: "Agent User" 
          }] 
        });
      }
      
      // Admin - Roles
      if (path === "/admin/roles/") {
        return json(route, { count: 0, next: null, previous: null, results: [] });
      }
      
      // Admin - Permissions
      if (path === "/admin/permissions/") {
        return json(route, { count: 0, next: null, previous: null, results: [] });
      }
      
      // Admin - Workflows - GET list
      if (path === "/admin/workflows/" && method === "GET") {
        return json(route, workflow ? [workflow] : []);
      }
      
      // Admin - Workflows - POST create
      if (path === "/admin/workflows/" && method === "POST") {
        const body = await request.postDataJSON();
        workflow = { 
          flow_id: "b0000000-0000-4000-8000-000000000001", 
          name: body.name, 
          description: body.description, 
          created_at: new Date().toISOString() 
        };
        return json(route, workflow);
      }
      
      // Admin - Workflow detail - GET
      if (/^\/admin\/workflows\/[0-9a-f-]+\/$/.test(path) && method === "GET") {
        return json(route, { 
          ...(workflow ?? { flow_id: path.split("/")[3], name: "Workflow", description: "" }), 
          statuses: workflowStatuses 
        });
      }
      
      // Admin - Workflow detail - PATCH
      if (/^\/admin\/workflows\/[0-9a-f-]+\/$/.test(path) && method === "PATCH") {
        const body = await request.postDataJSON();
        workflow = { 
          ...(workflow ?? { flow_id: path.split("/")[3], name: "Workflow", description: "" }), 
          ...body, 
          created_at: workflow?.created_at ?? new Date().toISOString() 
        };
        return json(route, workflow);
      }
      
      // Admin - Workflow statuses - POST create
      if (/^\/admin\/workflows\/[0-9a-f-]+\/statuses\/$/.test(path) && method === "POST") {
        const body = await request.postDataJSON();
        const status = { 
          status_id: `d0000000-0000-4000-8000-${String(workflowStatuses.length).padStart(24, "0")}`, 
          flow_id: path.split("/")[3], 
          ...body, 
          created_at: new Date().toISOString() 
        };
        workflowStatuses.push(status);
        return json(route, status);
      }
      
      // Flows
      if (path === "/flows/") {
        return json(route, [{ 
          flow_id: "b0000000-0000-4000-8000-000000000001", 
          name: "Browser Demo Flow", 
          description: "" 
        }]);
      }
      
      // Flow statuses
      if (path === "/flows/b0000000-0000-4000-8000-000000000001/statuses/") {
        return json(route, [{ 
          status_id: "b0000000-0000-4000-8000-000000000002", 
          name: "Open", 
          category: "open", 
          is_terminal: false, 
          created_at: new Date().toISOString() 
        }]);
      }
      
      // Users
      if (path === "/users/") {
        return json(route, [{ 
          user_id: "b0000000-0000-4000-8000-000000000003", 
          email: "requester@example.com", 
          display_name: "Requester User" 
        }]);
      }
      
      // Reports
      if (path === "/reports/summary/") {
        return json(route, { 
          total: 6, 
          open: 2, 
          in_progress: 1, 
          waiting: 0, 
          closed: 3, 
          due_today: 1, 
          overdue: 0, 
          unassigned: 0, 
          assigned_to_me: 2, 
          by_priority: [{ priority: "normal", count: 4 }] 
        });
      }
      
      // Admin settings
      if (path === "/admin/settings/") {
        return json(route, { 
          settings: [
            { 
              setting_id: "50000000-0000-4000-8000-000000000001", 
              key: "web_base_url", 
              value: "http://127.0.0.1:5173", 
              value_type: "url", 
              is_sensitive: false, 
              has_value: true, 
              updated_at: "2026-08-01T12:00:00Z" 
            },
            { 
              setting_id: "50000000-0000-4000-8000-000000000002", 
              key: "default_timezone", 
              value: "America/El_Salvador", 
              value_type: "timezone", 
              is_sensitive: false, 
              has_value: true, 
              updated_at: "2026-08-01T12:00:00Z" 
            },
            { 
              setting_id: "50000000-0000-4000-8000-000000000003", 
              key: "default_page_size", 
              value: "25", 
              value_type: "integer", 
              is_sensitive: false, 
              has_value: true, 
              updated_at: "2026-08-01T12:00:00Z" 
            },
            { 
              setting_id: "50000000-0000-4000-8000-000000000004", 
              key: "email_from", 
              value: "rt@example.com", 
              value_type: "email", 
              is_sensitive: false, 
              has_value: true, 
              updated_at: "2026-08-01T12:00:00Z" 
            },
          ] 
        });
      }
      
      // Feature flags
      if (path === "/admin/feature-flags/") {
        return json(route, ["adminConsole", "slaEnabled", "exportsEnabled", "notificationTemplates"].map((key, index) => ({ 
          feature_flag_id: `60000000-0000-4000-8${index}-000000000000`, 
          key, 
          enabled: true 
        })));
      }
      
      // Notification templates - list
      if (path === "/admin/notification-templates/") {
        return json(route, ["request.created", "request.assigned", "comment.added", "request.closed"].map((event_type, index) => ({ 
          notification_template_id: `70000000-0000-4000-8${index}-000000000000`, 
          event_type, 
          subject_template: "Template", 
          body_template: "Template" 
        })));
      }
      
      // Notification templates - detail
      if (path.startsWith("/admin/notification-templates/") && method === "GET") {
        return json(route, { 
          notification_template_id: path.split("/")[3], 
          event_type: "request.created", 
          subject_template: "Template", 
          body_template: "Template" 
        });
      }
      
      // Audit
      if (path === "/admin/audit/") {
        return json(route, { 
          count: 1, 
          next: null, 
          previous: null, 
          results: [{ 
            activity_id: "80000000-0000-4000-8000-000000000001", 
            request_id: null, 
            actor_id: null, 
            type: "role", 
            object_type: "role", 
            action: "updated", 
            timestamp: new Date().toISOString() 
          }] 
        });
      }
      
      // Unhandled routes return 404
      return json(route, { code: "not_found", message: `Unhandled smoke API route: ${path}`, details: [] }, 404);
    } catch (error) {
      console.error("Mock API error:", error);
      return json(route, { code: "internal_error", message: String(error), details: [] }, 500);
    }
  });
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Tenant code").fill("ACME");
  await page.getByLabel("Username").fill("admin@example.com");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
}

test("admin login and Sprint 3 navigation smoke", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await mockApi(page);
  await login(page);
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();

  await page.getByRole("button", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "Users and memberships" })).toBeVisible();
  await expect(page.getByText("Agent User")).toBeVisible();

  await page.getByRole("button", { name: "Workflows" }).click();
  await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();

  await page.getByRole("button", { name: "Reports" }).click();
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Priority breakdown" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "General settings" })).toBeVisible();

  await page.getByRole("button", { name: "Audit" }).click();
  await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible();
  await expect(page.getByText("Admin · role · updated")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("unauthorized admin route uses friendly 403", async ({ page }) => {
  await mockApi(page, false);
  await login(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  await expect(page.getByText("Unexpected Application Error")).toHaveCount(0);
});

test("unknown route uses friendly 404", async ({ page }) => {
  await page.goto("/not-a-real-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByText("Unexpected Application Error")).toHaveCount(0);
});

test("Sprint 3 admin and request detail avoid page-level mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mockApi(page);
  await login(page);
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  for (const section of ["Users", "Roles & Permissions", "Workflows", "Reports", "Settings", "Audit"]) {
    await page.getByRole("button", { name: section, exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto("/requests/a0000000-0000-4000-8000-000000000010");
  await expect(page.getByRole("heading", { name: "Responsive request" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("workflow create and edit use POST then PATCH", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await page.getByRole("button", { name: "Workflows", exact: true }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name *").fill("WEB-D10 Workflow");
  await page.getByRole("dialog").getByLabel("Description").fill("Created in browser smoke");
  
  // Use Promise.all to run request listener and click concurrently
  const [createRequest] = await Promise.all([
    page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname.endsWith("/api/admin/workflows/")),
    page.getByRole("button", { name: "Create workflow" }).click()
  ]);
  
  expect(createRequest.postDataJSON()).toEqual({ name: "WEB-D10 Workflow", description: "Created in browser smoke" });
  await expect(page.getByLabel("Name *").first()).toHaveValue("WEB-D10 Workflow");
  await page.getByLabel("Description").first().fill("Updated in browser smoke");
  
  const [patchRequest] = await Promise.all([
    page.waitForRequest((request) => request.method() === "PATCH" && /\/api\/admin\/workflows\/[0-9a-f-]+\/$/.test(new URL(request.url()).pathname)),
    page.getByRole("button", { name: "Save workflow" }).click()
  ]);
  
  expect(patchRequest.postDataJSON()).toEqual({ name: "WEB-D10 Workflow", description: "Updated in browser smoke" });
  await expect(page.getByText("Workflow updated.")).toBeVisible();
  const statusForm = page.locator("form").filter({ has: page.getByPlaceholder("Waiting for customer") });
  await statusForm.getByPlaceholder("Waiting for customer").fill("Open");
  
  const [statusRequest] = await Promise.all([
    page.waitForRequest((request) => request.method() === "POST" && /\/api\/admin\/workflows\/[0-9a-f-]+\/statuses\/$/.test(new URL(request.url()).pathname)),
    statusForm.getByRole("button", { name: "Add", exact: true }).click()
  ]);
  
  expect(statusRequest.postDataJSON()).toEqual({ name: "Open", category: "open", is_terminal: false });
  await expect(page.getByRole("cell", { name: "Open", exact: true })).toBeVisible();
});

test("request creation uses readable lookups and public IDs", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto("/requests/new");
  await expect(page.getByLabel("Flow *")).toContainText("Browser Demo Flow");
  await page.getByLabel("Title *").fill("WEB-D10 Request");
  await page.getByLabel("Description *").fill("Created through readable browser controls.");
  await page.getByLabel("Flow *").selectOption({ label: "Browser Demo Flow" });
  await page.getByLabel("Requester *").selectOption({ label: "Requester User" });
  await page.getByLabel("Assignee").selectOption("");
  
  const [requestPromise] = await Promise.all([
    page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname.endsWith("/api/requests/")),
    page.getByRole("button", { name: "Create Request" }).click()
  ]);
  
  const body = requestPromise.postDataJSON();
  expect(body).toMatchObject({ flow_id: "b0000000-0000-4000-8000-000000000001", status_id: "b0000000-0000-4000-8000-000000000002", requester_id: "b0000000-0000-4000-8000-000000000003", assignee_id: null, priority: "normal" });
  await expect(page).toHaveURL(/\/requests\/a0000000-0000-4000-8000-000000000010$/);
  await expect(page.getByRole("heading", { name: "WEB-D10 Request" })).toBeVisible();
  await expect(page.getByLabel("Flow ID")).toHaveCount(0);
});

test("workflow transition sends comment once with exact contract field", async ({ page }) => {
  await mockApi(page);
  let duplicateCommentPosts = 0;
  
  await page.route("**/api/requests/a0000000-0000-4000-8000-000000000010/comments/", async (route) => {
    if (route.request().method() === "POST") duplicateCommentPosts += 1;
    return json(route, []);
  });
  
  await login(page);
  await page.goto("/requests/a0000000-0000-4000-8000-000000000010");
  await page.getByRole("button", { name: "Move to In Progress" }).click();
  await page.locator("#transition-comment").fill("Single transition comment");
  
  const [transitionRequest] = await Promise.all([
    page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname.endsWith("/transition/")),
    page.getByRole("button", { name: "Apply Action" }).click()
  ]);
  
  expect(transitionRequest.postDataJSON()).toEqual({ transition_id: "c0000000-0000-4000-8000-000000000001", comment: "Single transition comment" });
  expect(duplicateCommentPosts).toBe(0);
});
