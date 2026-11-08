import { describe, expect, it } from "vitest";
import { normalizeMetricsRow } from "../src/services/metrics.js";

describe("normalizeMetricsRow", () => {
  it("normalizes PostgreSQL aggregate strings into API numbers", () => {
    expect(normalizeMetricsRow({
      total_orders: "12",
      open_orders: "5",
      revenue: "4219.75",
      low_stock_items: "3"
    })).toEqual({
      totalOrders: 12,
      openOrders: 5,
      revenue: 4219.75,
      lowStockItems: 3
    });
  });

  it("uses zero for null aggregate values", () => {
    expect(normalizeMetricsRow({
      total_orders: 0,
      open_orders: 0,
      revenue: 0,
      low_stock_items: 0
    })).toEqual({
      totalOrders: 0,
      openOrders: 0,
      revenue: 0,
      lowStockItems: 0
    });
  });
});
