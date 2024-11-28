import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: 'localhost', // Allows access from other devices on the same network
    port: 1337,      // Optional: specify a port (default is 5173)
    open: false,     // Prevents auto-opening the browser on localhost
  },
});
