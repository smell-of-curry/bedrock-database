const esbuild = require("esbuild");
const fsExtra = require("fs-extra");
const isDev = process.argv[2] === "dev";

const dir = "./scripts";

if (!fsExtra.existsSync(dir)) {
  fsExtra.mkdirSync(dir);
}
fsExtra.emptyDirSync(dir);

esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "scripts/index.js",
    minify: !isDev,
    platform: "neutral",
    sourcemap: true,
    watch: isDev,
    external: [
      "@minecraft/server",
      "@minecraft/server-ui",
      "@minecraft/server-net",
      "@minecraft/server-admin",
    ],
    legalComments: isDev ? "none" : "none",
  })
  .then((r) => {
    console.log(
      `\x1b[33m%s\x1b[0m`,
      `[${new Date().toLocaleTimeString()}]`,
      `Built for ${isDev ? "development" : "production"}...`
    );
  });
