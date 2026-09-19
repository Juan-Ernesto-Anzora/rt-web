const assert = require("node:assert/strict");
const { test } = require("node:test");
const postcss = require("postcss");
const tailwind = require("tailwindcss");
const tokens = require("../design/design-tokens.json");
const mapping = require("../design/tailwind-tokens.cjs");

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((value) => {
    const c = parseInt(value, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test("required semantic roles resolve; malformed and missing references fail", () => {
  const roles = "background foreground surface surface-subtle surface-raised surface-hover surface-active text-default text-muted text-subtle text-inverse border border-strong action-primary action-primary-hover action-primary-foreground focus-ring status-info status-info-surface status-success status-success-surface status-warning status-warning-surface status-danger status-danger-surface".split(" ");
  assert.deepEqual(Object.keys(mapping.resolvedColors).sort(), roles.sort());
  for (const value of Object.values(mapping.resolvedColors)) assert.match(value, /^#[\da-f]{6}$/i);
  assert.throws(() => mapping.resolveColor("{brand.colors.missing.500}"));
  assert.throws(() => mapping.resolveColor("{color.background}"));
  assert.throws(() => mapping.resolveColor("red"));
});

test("new text/status/action pairs meet AA and focus/strong borders meet non-text contrast", () => {
  const c = mapping.resolvedColors;
  for (const text of ["foreground", "text-default", "text-muted", "text-subtle"]) {
    for (const surface of ["background", "surface", "surface-subtle", "surface-raised", "surface-hover", "surface-active"]) {
      assert.ok(contrast(c[text], c[surface]) >= 4.5, `${text} on ${surface}`);
    }
  }
  for (const status of ["info", "success", "warning", "danger"]) {
    for (const bg of [c.surface, c[`status-${status}-surface`]]) {
      assert.ok(contrast(c[`status-${status}`], bg) >= 4.5, status);
    }
  }
  for (const action of ["action-primary", "action-primary-hover"]) {
    assert.ok(contrast(c["action-primary-foreground"], c[action]) >= 4.5);
    assert.ok(contrast(c["text-inverse"], c[action]) >= 4.5);
  }
  for (const surface of ["surface", "surface-subtle", "surface-hover", "surface-active"]) {
    assert.ok(contrast(c["focus-ring"], c[surface]) >= 3);
    assert.ok(contrast(c["border-strong"], c[surface]) >= 3);
  }
  console.log(`New danger contrast: ${contrast(c["status-danger"], c.surface).toFixed(2)}:1 on white`);
});

test("legacy palette and radius compatibility remain stable", () => {
  assert.deepEqual(tokens.brand.colors, {
    primary: { 50: "#EEF2FF", 500: "#6366F1", 600: "#4F46E5", 700: "#4338CA" },
    accent: { 500: "#10B981", 600: "#059669" }, info: { 500: "#0EA5E9" },
    warning: { 500: "#F59E0B" }, danger: { 500: "#F43F5E" },
    neutral: { 50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1", 600: "#475569", 700: "#334155", 800: "#1F2937", 900: "#0F172A" },
  });
  assert.equal(mapping.borderRadius.xl, "14px");
  assert.equal(mapping.borderRadius["2xl"], "20px");
  assert.deepEqual(tokens.radius, { small: "4px", medium: "8px", large: "12px", "legacy-control": "14px", "legacy-card": "20px" });
});

test("Tailwind emits variables, semantic utilities, opacity and unchanged legacy utilities", async () => {
  const result = await postcss([tailwind({
    content: [{ raw: 'bg-surface/50 text-status-danger border-border-strong rounded-small rounded-legacy-card bg-primary-600 rounded-xl rounded-2xl', extension: "html" }],
    theme: { extend: { colors: mapping.colors, borderRadius: mapping.borderRadius } },
    plugins: [mapping.plugin],
  })]).process("@tailwind base; @tailwind utilities;", { from: undefined });
  const declarations = (selector) => {
    const values = {};
    result.root.walkRules(selector, rule => rule.walkDecls(decl => { values[decl.prop] = decl.value; }));
    return values;
  };
  assert.equal(declarations(":root")["--rt-color-surface"], "255 255 255");
  assert.equal(declarations(":root")["--radius"], "12px");
  assert.equal(declarations(".bg-surface\\/50")["background-color"], "rgb(var(--rt-color-surface) / 0.5)");
  assert.match(declarations(".text-status-danger").color, /var\(--rt-color-status-danger\)/);
  assert.match(declarations(".border-border-strong")["border-color"], /var\(--rt-color-border-strong\)/);
  assert.equal(declarations(".rounded-small")["border-radius"], "var(--rt-radius-small)");
  assert.equal(declarations(".rounded-legacy-card")["border-radius"], "var(--rt-radius-legacy-card)");
  assert.equal(declarations(".rounded-xl")["border-radius"], "14px");
  assert.equal(declarations(".rounded-2xl")["border-radius"], "20px");
  assert.equal(declarations(".bg-primary-600")["background-color"], "rgb(79 70 229 / var(--tw-bg-opacity, 1))");
});
