import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: '0.0.0.0', // Allows access from other devices on the same network
    port: 5173,      // Optional: specify a port (default is 5173)
    open: false,     // Prevents auto-opening the browser on localhost
  },
});
