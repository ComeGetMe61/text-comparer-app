import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "/text-comparer-app/",
  plugins: [react()],
  resolve: {
    alias: {
      // Monaco 0.57 exports JavaScript subpaths, but not its font stylesheet.
      "monaco-codicon-font": fileURLToPath(
        new URL(
          "./node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css",
          import.meta.url,
        ),
      ),
    },
  },
  server: {
    watch: { ignored: ["**/playwright-report/**", "**/test-results/**"] },
  },
  build: { chunkSizeWarningLimit: 1500 },
  test: { include: ["src/**/*.test.ts"] },
});
