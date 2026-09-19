const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../public/theme-init.js"), "utf8");

function boot({ stored = null, dark = false, blocked = false, writeBlocked = false } = {}) {
  const mediaListeners = new Set();
  const storageListeners = new Set();
  let writes = 0;
  const root = { dataset: {}, style: {} };
  const media = {
    matches: dark,
    addEventListener: (_, listener) => mediaListeners.add(listener),
    removeEventListener: (_, listener) => mediaListeners.delete(listener),
  };
  const window = {
    matchMedia: () => media,
    localStorage: {
      getItem() { if (blocked) throw Error("blocked"); return stored; },
      setItem(key, value) { assert.equal(key, "rt.profile.preferences"); if (blocked || writeBlocked) throw Error("blocked"); writes++; stored = value; },
    },
    addEventListener: (_, listener) => storageListeners.add(listener),
    removeEventListener: (_, listener) => storageListeners.delete(listener),
  };
  vm.runInNewContext(source, { window, document: { documentElement: root } });
  return {
    runtime: window.rtTheme, root, mediaListeners, storageListeners,
    stored: () => JSON.parse(stored),
    writes: () => writes,
    os(value) { media.matches = value; mediaListeners.forEach(fn => fn()); },
    storage(value, key = "rt.profile.preferences") { stored = value; storageListeners.forEach(fn => fn({ key })); },
  };
}

for (const [preference, os, effective] of [["light", true, "light"], ["dark", false, "dark"], ["system", true, "dark"], ["system", false, "light"]]) {
  test(`${preference} with OS dark=${os} resolves to ${effective} before subscribing`, () => {
    const { runtime, root } = boot({ stored: JSON.stringify({ theme: preference }), dark: os });
    assert.equal(runtime.getSnapshot().preferenceTheme, preference);
    assert.equal(runtime.getSnapshot().effectiveTheme, effective);
    assert.equal(root.dataset.theme, effective);
    assert.equal(root.style.colorScheme, effective);
  });
}

test("system follows OS changes; explicit preference ignores OS; subscriptions clean up", () => {
  const b = boot();
  const stop = b.runtime.subscribe(() => {});
  b.os(true);
  assert.equal(b.root.dataset.theme, "dark");
  b.runtime.setPreference("light");
  b.os(false); b.os(true);
  assert.equal(b.root.dataset.theme, "light");
  b.runtime.setPreference("dark");
  b.os(false);
  assert.equal(b.root.dataset.theme, "dark");
  assert.equal(b.root.style.colorScheme, "dark");
  stop();
  assert.equal(b.mediaListeners.size, 0);
  assert.equal(b.storageListeners.size, 0);
});

test("missing, invalid and inaccessible storage fall back to system safely", () => {
  for (const stored of [null, "broken", "[]", '"dark"', '{"theme":"sepia"}', '{"theme":null}']) {
    const b = boot({ stored, dark: true });
    assert.equal(b.runtime.getSnapshot().preferenceTheme, "system");
    assert.equal(b.root.dataset.theme, "dark");
  }
  const b = boot({ blocked: true });
  assert.equal(b.runtime.setPreference("dark"), false);
  assert.equal(b.root.dataset.theme, "dark");
  assert.ok(b.runtime.getSnapshot().persistenceError);
});

test("theme update merges latest stored unrelated fields including unknown fields", () => {
  const b = boot({ stored: JSON.stringify({ theme: "light", density: "comfortable", emailNotifications: false, language: "es" }) });
  b.runtime.setPreference("dark");
  assert.deepEqual(b.stored(), { theme: "dark", density: "comfortable", emailNotifications: false, language: "es" });
});

test("a failed write preserves session theme during later unrelated preference updates", () => {
  const b = boot({ stored: '{"theme":"light"}', writeBlocked: true });
  assert.equal(b.runtime.setPreference("dark"), false);
  b.runtime.updatePreferences({ density: "comfortable" });
  assert.equal(b.runtime.getSnapshot().preferenceTheme, "dark");
  assert.equal(b.runtime.getSnapshot().preferences.density, "comfortable");
  assert.equal(b.stored().theme, "light");
});

test("cross-tab changes and clearing storage update root without writing back", () => {
  const b = boot();
  const stop = b.runtime.subscribe(() => {});
  b.storage('{"theme":"dark","density":"comfortable","emailNotifications":false}');
  assert.equal(b.root.dataset.theme, "dark");
  assert.equal(b.runtime.getSnapshot().preferences.emailNotifications, false);
  b.storage(null, null);
  assert.equal(b.runtime.getSnapshot().preferenceTheme, "system");
  assert.equal(b.root.dataset.theme, "light");
  assert.equal(b.writes(), 0);
  stop();
});

test("listeners remain for remaining subscribers and reattach after the last cleanup", () => {
  const b = boot();
  const stopA = b.runtime.subscribe(() => {});
  const stopB = b.runtime.subscribe(() => {});
  stopA();
  assert.equal(b.mediaListeners.size, 1);
  b.os(true);
  assert.equal(b.root.dataset.theme, "dark");
  stopB();
  assert.equal(b.mediaListeners.size, 0);
  assert.equal(b.storageListeners.size, 0);
  b.os(false);
  const stopC = b.runtime.subscribe(() => {});
  assert.equal(b.root.dataset.theme, "light");
  stopC();
  assert.equal(b.mediaListeners.size, 0);
});
