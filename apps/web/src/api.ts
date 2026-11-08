export interface DashboardMetrics {
  totalOrders: number;
  openOrders: number;
  revenue: number;
  lowStockItems: number;
}
export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  status: "pending" | "processing" | "shipped" | "cancelled";
  total_amount: number | string;
  created_at: string;
}
export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorder_level: number;
  unit_price: number | string;
}
export interface DashboardSnapshot {
  metrics: DashboardMetrics;
  orders: Order[];
  inventory: InventoryItem[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(message.error || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadDashboard(): Promise<DashboardSnapshot> {
  const [metrics, orders, inventory] = await Promise.all([
    request<DashboardMetrics>("/api/metrics/summary"),
    request<{ items: Order[] }>("/api/orders?limit=8"),
    request<{ items: InventoryItem[] }>("/api/inventory")
  ]);
  return { metrics, orders: orders.items, inventory: inventory.items };
}

export function createOrder(customerName: string, totalAmount: number): Promise<Order> {
  return request<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify({ customerName, totalAmount })
  });
}

export function updateOrderStatus(id: number, status: Order["status"]): Promise<Order> {
  return request<Order>(`/api/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function exportMetrics(): Promise<{ bucket: string; key: string }> {
  return request<{ bucket: string; key: string }>("/api/exports/metrics", { method: "POST" });
}
