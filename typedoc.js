export default {
  entryPoints: ["./index.ts"],
  out: "docs",
  exclude: "**/*.spec.ts",
  name: `CosmJS-ESM Documentation`,
  readme: "README.md",
  excludeExternals: true,
  excludePrivate: true,
};
