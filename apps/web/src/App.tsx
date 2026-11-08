import { useEffect, useState, type FormEvent } from "react";
import {
  createOrder,
  exportMetrics,
  loadDashboard,
  updateOrderStatus,
  type DashboardSnapshot,
  type Order
} from "./api";

const money = (value: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);

export default function App() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("250");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      setData(await loadDashboard());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await createOrder(customerName, Number(amount));
      setCustomerName("");
      setMessage("Order created successfully.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create order");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(id: number, status: Order["status"]) {
    setBusy(true);
    try {
      await updateOrderStatus(id, status);
      setMessage("Order status updated.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update order");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    setMessage("");
    try {
      const result = await exportMetrics();
      setMessage(`Metrics export saved to ${result.bucket}/${result.key}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "S3 export failed");
    } finally {
      setBusy(false);
    }
  }

  const lowStock = data?.inventory.filter((item) => item.quantity <= item.reorder_level) ?? [];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">OPERATIONS INTELLIGENCE</p>
            <h1>Northstar <span>Analytics</span></h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="live-dot">Live workspace</span>
          <button className="button button-quiet" onClick={() => void refresh()} disabled={busy}>Refresh data</button>
          <button className="button button-primary" onClick={() => void handleExport()} disabled={busy}>
            Export metrics to S3
          </button>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">OVERVIEW / WORKSPACE</p>
          <h2>Good morning, operations team.</h2>
          <p className="muted">Track order flow, inventory health, and business performance in one place.</p>
        </div>
        <div className="date-chip">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      </section>

      {message && <div className="notice" role="status">{message}</div>}
      {error && <div className="alert" role="alert">{error}</div>}
      {loading && <p className="muted">Loading operational data…</p>}

      {data && (
        <>
          <section className="metrics-grid" aria-label="Business metrics">
            <article className="metric-card">
              <div className="metric-label">Total orders <span className="metric-icon">↗</span></div>
              <div className="metric-value">{data.metrics.totalOrders.toLocaleString()}</div>
              <p className="metric-foot">All recorded orders</p>
            </article>
            <article className="metric-card">
              <div className="metric-label">Open orders <span className="metric-icon">◷</span></div>
              <div className="metric-value">{data.metrics.openOrders.toLocaleString()}</div>
              <p className="metric-foot">Pending or processing</p>
            </article>
            <article className="metric-card">
              <div className="metric-label">Order revenue <span className="metric-icon">$</span></div>
              <div className="metric-value">{money(data.metrics.revenue)}</div>
              <p className="metric-foot">Excludes cancelled orders</p>
            </article>
            <article className="metric-card metric-warning">
              <div className="metric-label">Low-stock items <span className="metric-icon">!</span></div>
              <div className="metric-value">{data.metrics.lowStockItems.toLocaleString()}</div>
              <p className="metric-foot">At or below reorder threshold</p>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel orders-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">FULFILLMENT</p>
                  <h3>Recent orders</h3>
                </div>
                <span className="count-pill">{data.orders.length} shown</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="order-id">{order.order_number}</td>
                        <td>{order.customer_name}</td>
                        <td>{money(order.total_amount)}</td>
                        <td>
                          <select
                            aria-label={`Status for ${order.order_number}`}
                            className={`status-select status-${order.status}`}
                            value={order.status}
                            disabled={busy}
                            onChange={(event) => void handleStatus(order.id, event.currentTarget.value as Order["status"])}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.orders.length === 0 && <p className="empty">No orders to display.</p>}
              </div>
            </article>

            <article className="panel inventory-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">SUPPLY HEALTH</p>
                  <h3>Inventory watch</h3>
                </div>
                <span className="count-pill">{lowStock.length} alerts</span>
              </div>
              {lowStock.length === 0 ? (
                <div className="empty">All inventory levels are above reorder thresholds.</div>
              ) : (
                <div className="inventory-list">
                  {lowStock.map((item) => (
                    <div className="inventory-row" key={item.id}>
                      <div className="inventory-symbol">▦</div>
                      <div className="inventory-copy">
                        <strong>{item.name}</strong>
                        <span>{item.sku} · {item.category}</span>
                      </div>
                      <div className="stock-quantity">
                        <strong>{item.quantity}</strong>
                        <span>Reorder at {item.reorder_level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="inventory-total">
                <span>Tracked inventory items</span>
                <strong>{data.inventory.length}</strong>
              </div>
            </article>
          </section>

          <section className="panel create-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ORDER MANAGEMENT</p>
                <h3>Create an order</h3>
              </div>
              <span className="muted">New orders begin in Pending status</span>
            </div>
            <form className="order-form" onSubmit={(event) => void handleCreateOrder(event)}>
              <label>
                Customer name
                <input value={customerName} onChange={(event) => setCustomerName(event.currentTarget.value)} minLength={2} maxLength={180} required placeholder="Example customer" />
              </label>
              <label>
                Total amount (USD)
                <input type="number" value={amount} onChange={(event) => setAmount(event.currentTarget.value)} min="0.01" max="10000000" step="0.01" required />
              </label>
              <button className="button button-primary form-submit" type="submit" disabled={busy}>Create order</button>
            </form>
          </section>
        </>
      )}
      <footer><span>Northstar Analytics</span><span>Portfolio demonstration · React · Express · PostgreSQL</span></footer>
    </main>
  );
}
