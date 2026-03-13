import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      // Proxy Invidious API in development to avoid CORS issues
      "/invidious": {
        target: "https://inv.nadeko.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/invidious/, ""),
        secure: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    // Code splitting for better load performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["framer-motion", "lucide-react", "sonner"],
        },
      },
    },
  },
  // Ensure VITE_ env vars are exposed to the client
  define: {
    __APP_VERSION__: JSON.stringify("2.0.0"),
  },
}));
