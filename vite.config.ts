import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { componentTagger } from "lovable-tagger";
import fs from "fs";
import path from "path";

const googleServicesPath = path.resolve(__dirname, "android/app/google-services.json");
const hasFirebaseAndroid =
  fs.existsSync(googleServicesPath) && fs.statSync(googleServicesPath).size > 0;

export default defineConfig(({ mode }) => ({
  base: "./",
  define: {
    __HAS_FIREBASE_ANDROID__: JSON.stringify(hasFirebaseAndroid),
  },
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
