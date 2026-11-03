import { defineConfig } from "vite"

// The package build: the core entry in lib/. The React entry and the demo come in the next stage.
export default defineConfig({
  build: {
    outDir: "lib",
    emptyOutDir: true,
    // The page that uses the package minifies it with its own build.
    minify: false,
    lib: {
      entry: { core: "src/core.ts" },
      formats: ["es"]
    }
  }
})
