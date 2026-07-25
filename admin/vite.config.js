import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "https://ubiquitous-space-yodel-75j5qvq7p6xfp96-3000.app.github.dev",
        changeOrigin: true,
      },
    },
  },
});
