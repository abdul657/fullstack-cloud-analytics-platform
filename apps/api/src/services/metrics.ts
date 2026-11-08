import type { Pool } from "pg";

export interface DashboardMetrics {
  totalOrders: number;
  openOrders: number;
  revenue: number;
  lowStockItems: number;
}
export interface MetricsRow {
  total_orders: string | number;
  open_orders: string | number;
  revenue: string | number;
  low_stock_items: string | number;
}

export function normalizeMetricsRow(row: MetricsRow): DashboardMetrics {
  return {
    totalOrders: Number(row.total_orders ?? 0),
    openOrders: Number(row.open_orders ?? 0),
    revenue: Number(row.revenue ?? 0),
    lowStockItems: Number(row.low_stock_items ?? 0)
  };
}

export async function getDashboardMetrics(pool: Pool): Promise<DashboardMetrics> {
  const result = await pool.query<MetricsRow>(`
    SELECT
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) AS open_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status <> 'cancelled'), 0) AS revenue,
      (SELECT COUNT(*) FROM inventory_items WHERE quantity <= reorder_level) AS low_stock_items
    FROM orders
  `);
  const row = result.rows[0];
  if (!row) throw new Error("Metrics query returned no result");
  return normalizeMetricsRow(row);
}
