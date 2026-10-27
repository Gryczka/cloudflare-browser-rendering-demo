import net from "node:net";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

/**
 * Check whether a TCP port is free. Returns true if we can bind it.
 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port);
  });
}

export default defineConfig(async ({ command }) => {
  if (
    process.env.GARDEN_STAGING === "1" &&
    process.env.GARDEN_PRODUCTION_PREFLIGHT === "1"
  )
    throw new Error("Select staging or production preflight, not both");
  // TanStack devtools starts its own WebSocket event bus on port 42069.
  // If that port is already taken (e.g. another dev server running),
  // the whole process crashes with EADDRINUSE.  Probe first.
  const devtoolsPort = 42069;
  const canUseDevtools =
    command === "serve" && (await isPortFree(devtoolsPort));

  const plugins = [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      ...(process.env.GARDEN_STAGING === "1"
        ? { configPath: "./wrangler.staging.jsonc" }
        : process.env.GARDEN_PRODUCTION_PREFLIGHT === "1"
          ? { configPath: "./wrangler.production-preflight.jsonc" }
          : {}),
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ];

  if (canUseDevtools) {
    const { devtools } = await import("@tanstack/devtools-vite");
    plugins.unshift(devtools());
  } else if (command === "serve") {
    console.warn(
      `[vite] TanStack devtools skipped – port ${devtoolsPort} is already in use`,
    );
  }

  return {
    server: {
      port: 3000,
      strictPort: false,
    },
    plugins,
  };
});
