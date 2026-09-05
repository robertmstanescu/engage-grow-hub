import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { injectBuildHash } from "./scripts/inject-build-hash";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    injectBuildHash(),
    mcpPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
        // Third-party deps (React, react-router, react-query, the
        // Supabase client, Radix, lucide-react, DOMPurify…) rarely
        // change between deploys; app code changes on almost every
        // deploy. Without this, both were one bundle sharing one
        // content hash, so every deploy forced a full re-download of
        // megabytes of unchanged vendor code for returning visitors.
        // Splitting them means a content-only deploy only invalidates
        // the (much smaller) app chunk's cache.
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
}));
