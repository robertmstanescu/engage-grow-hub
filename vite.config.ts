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
          if (!id.includes("node_modules")) return undefined;
          const m = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/); const pkg = m ? m[1] : "vendor";
          // Exact names only: a loose /^react/ would also catch react-* libraries
          // and create a chunk cycle (the editor chunk ended up holding React's
          // own use-sync-external-store shim, which the react chunk imported back).
          if (/^(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router|use-sync-external-store)$/.test(pkg)) return "react";
          if (/^@supabase/.test(pkg)) return "supabase";
          if (/^(@tiptap|prosemirror|@prosemirror|orderedmap|w3c-keyname|rope-sequence|linkifyjs)/.test(pkg)) return "editor";
          if (/^@dnd-kit/.test(pkg)) return "dnd";
          if (/^@radix-ui/.test(pkg)) return "radix";
          if (/^(zod|@tanstack)/.test(pkg)) return "data";
          return undefined;
        },
      },
    },
  },
}));
