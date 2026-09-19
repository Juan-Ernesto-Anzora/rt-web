const plugin = require("tailwindcss/plugin");
const tokens = require("./design-tokens.json");

function resolveColor(value) {
  const reference = /^\{(brand\.colors\.[\w.]+)\}$/.exec(value);
  const resolved = reference
    ? reference[1].split(".").reduce((node, key) => node?.[key], tokens)
    : value;
  if (typeof resolved !== "string" || !/^#[\da-f]{6}$/i.test(resolved)) {
    throw new Error(`Invalid color token: ${value}`);
  }
  return resolved;
}

const resolvedColors = Object.fromEntries(
  Object.entries(tokens.color).map(([name, value]) => [name, resolveColor(value)]),
);
const variables = Object.fromEntries(Object.entries(resolvedColors).map(([name, hex]) => [
  `--rt-color-${name}`,
  hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16)).join(" "),
]));
for (const [name, value] of Object.entries(tokens.radius)) {
  if (!/^\d+px$/.test(value)) throw new Error(`Invalid radius token: ${name}`);
  variables[`--rt-radius-${name}`] = value;
}

module.exports = {
  resolvedColors,
  resolveColor,
  colors: {
    ...tokens.brand.colors,
    ...Object.fromEntries(Object.keys(tokens.color).map((name) => [
      name, `rgb(var(--rt-color-${name}) / <alpha-value>)`,
    ])),
  },
  borderRadius: {
    ...Object.fromEntries(Object.keys(tokens.radius).map((name) => [name, `var(--rt-radius-${name})`])),
    // Preserve existing utilities and @apply output during incremental migration.
    xl: tokens.radius["legacy-control"],
    "2xl": tokens.radius["legacy-card"],
  },
  plugin: plugin(({ addBase }) => {
    addBase({ ":root": { ...variables, "--radius": tokens.radius.large } });
  }),
};
