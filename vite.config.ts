import { defineConfig, Plugin } from "vite";
import solid from "vite-plugin-solid";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const loadFilesPlugin: Plugin = {
  name: "load-files-api",
  configureServer(server) {
    const dataFolder = join(process.cwd(), "data"); // Path to your data folder

    server.middlewares.use(async (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: Function) => {
      if (req.url === "/api/load-files") {
        try {
          const files = await readdir(dataFolder);
          const data = [];

          for (const file of files) {
            if (file.endsWith(".json")) {
              const filePath = join(dataFolder, file);
              const fileContent = await readFile(filePath, "utf8");
              const jsonData = JSON.parse(fileContent);
              data.push(jsonData);
            }
          }

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (error as Error).message }));
        }
      } else {
        next();
      }
    });
  },
};

export default defineConfig({
  plugins: [solid(), loadFilesPlugin],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: 'localhost',
    port: 1337,
    open: false,
  },
});
