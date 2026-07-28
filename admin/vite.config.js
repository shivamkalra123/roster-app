import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: fileURLToPath(new URL("./node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(new URL("./node_modules/react-dom", import.meta.url)),
      "lucide-react": fileURLToPath(new URL("./node_modules/lucide-react", import.meta.url)),
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "https://ubiquitous-space-yodel-75j5qvq7p6xfp96-3000.app.github.dev",
        changeOrigin: true,
      },
    },
  },
});
