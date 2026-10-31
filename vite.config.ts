import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, type Plugin } from "vite";

// Writes the built asset list and a per-build cache name into dist/sw.js, so the
// service worker saves the whole app on install and replaces it on each deploy.
function precacheBuildAssets(): Plugin {
  let outDir = "dist";
  let assets: string[] = [];
  return {
    name: "precache-build-assets",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      assets = Object.keys(bundle)
        .filter((file) => file.startsWith("assets/"))
        .sort()
        .map((file) => `/${file}`);
    },
    closeBundle() {
      const swPath = path.join(outDir, "sw.js");
      const source = fs.readFileSync(swPath, "utf8");
      const hash = createHash("sha256").update(assets.join("\n") + source).digest("hex").slice(0, 10);
      const replaced = source
        .replace("const CACHE_NAME = 'zed-rush-dev';", `const CACHE_NAME = 'zed-rush-${hash}';`)
        .replace("const BUILD_ASSETS = [];", `const BUILD_ASSETS = ${JSON.stringify(assets)};`);
      if (!replaced.includes(`zed-rush-${hash}`) || !replaced.includes(assets[0] ?? "/assets/")) {
        throw new Error("precache-build-assets: placeholders not found in public/sw.js");
      }
      fs.writeFileSync(swPath, replaced);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), tailwindcss(), precacheBuildAssets()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
