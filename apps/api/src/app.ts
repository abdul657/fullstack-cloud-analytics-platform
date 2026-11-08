import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import type { Pool } from "pg";
import { config } from "./config.js";
import { getDashboardMetrics } from "./services/metrics.js";
import { exportMetricsToS3 } from "./services/s3-export.js";

const orderInputSchema = z.object({
  customerName: z.string().trim().min(2).max(180),
  totalAmount: z.number().finite().positive().max(10_000_000)
}).strict();
const statusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "cancelled"])
}).strict();
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export function createApp(pool: Pool) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "128kb" }));

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch {
      res.status(503).json({ status: "degraded", database: "unavailable" });
    }
  });

  app.get("/api/metrics/summary", async (_req, res, next) => {
    try {
      res.json(await getDashboardMetrics(pool));
    } catch (error) { next(error); }
  });

  app.get("/api/orders", async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
        return;
      }
      const result = await pool.query(
        `SELECT id, order_number, customer_name, status, total_amount, created_at
         FROM orders ORDER BY created_at DESC LIMIT $1`,
        [parsed.data.limit]
      );
      res.json({ items: result.rows });
    } catch (error) { next(error); }
  });

  app.post("/api/orders", async (req, res, next) => {
    try {
      const parsed = orderInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid order payload", details: parsed.error.flatten() });
        return;
      }
      const orderNumber = `ORD-${Date.now()}`;
      const result = await pool.query(
        `INSERT INTO orders (order_number, customer_name, status, total_amount)
         VALUES ($1, $2, 'pending', $3)
         RETURNING id, order_number, customer_name, status, total_amount, created_at`,
        [orderNumber, parsed.data.customerName, parsed.data.totalAmount]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) { next(error); }
  });

  app.patch("/api/orders/:id/status", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ error: "Order id must be a positive integer" });
        return;
      }
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid status", details: parsed.error.flatten() });
        return;
      }
      const result = await pool.query(
        `UPDATE orders SET status = $1 WHERE id = $2
         RETURNING id, order_number, customer_name, status, total_amount, created_at`,
        [parsed.data.status, id]
      );
      if (result.rowCount === 0) {
        res.status(404).json({ error: "Order not found", id });
        return;
      }
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  app.get("/api/inventory", async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, sku, name, category, quantity, reorder_level, unit_price, updated_at
         FROM inventory_items ORDER BY quantity ASC, name ASC`
      );
      res.json({ items: result.rows });
    } catch (error) { next(error); }
  });

  app.post("/api/exports/metrics", async (_req, res, next) => {
    try {
      if (!config.awsS3Bucket) {
        res.status(503).json({ error: "AWS_S3_BUCKET is not configured for this environment" });
        return;
      }
      const metrics = await getDashboardMetrics(pool);
      const key = await exportMetricsToS3(metrics);
      res.status(201).json({ bucket: config.awsS3Bucket, key });
    } catch (error) { next(error); }
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);
  return app;
}
