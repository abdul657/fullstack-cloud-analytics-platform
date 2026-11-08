import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";

const server = createApp(pool).listen(config.port, () => {
  console.log(`Analytics API listening on port ${config.port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received; closing HTTP server`);
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
