import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { api, API_URL } from './api.js';

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const dateTime = value => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      onLogin(result);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login-wrap"><form className="login-card" onSubmit={submit}>
    <div className="brand-mark">C</div><p className="eyebrow">RESTAURANT OPERATIONS</p>
    <h1>Welcome to CafePOS</h1><p className="muted">Sign in to manage orders, menu and billing.</p>
    {error && <div className="alert">{error}</div>}
    <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
    <button className="primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <p className="hint">Use the admin credentials configured in server/.env.</p>
  </form></main>;
}

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('cafepos-session') || 'null'); } catch { return null; }
  });
  const [page, setPage] = useState('Dashboard');
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const token = session?.token;
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [m, o, d] = await Promise.all([
        api('/menu', { token }), api('/orders?limit=100', { token }), api('/dashboard', { token })
      ]);
      setMenu(m.items); setOrders(o.orders); setDashboard(d);
    } catch (err) { setNotice(err.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('order:created', ({ order }) => {
      setOrders(current => [order, ...current.filter(o => o._id !== order._id)].slice(0, 100));
      setNotice(`New bill ${order.invoiceNo} received from another device`);
      loadData();
    });
    socket.on('order:updated', ({ order }) => setOrders(current => current.map(o => o._id === order._id ? order : o)));
    socket.on('menu:updated', loadData);
    socket.on('connect_error', () => setNotice('Live sync reconnecting. Check backend connection.'));
    return () => socket.disconnect();
  }, [token, loadData]);

  function login(result) {
    sessionStorage.setItem('cafepos-session', JSON.stringify(result));
    setSession(result);
  }
  function logout() {
    sessionStorage.removeItem('cafepos-session'); setSession(null); setMenu([]); setOrders([]); setDashboard(null);
  }

  if (!session?.token) return <Login onLogin={login} />;

  const refresh = async () => { await loadData(); };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark small">C</div><div><strong>CafePOS</strong><small>Billing workspace</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      {['Dashboard', 'New Bill', 'Orders', 'Menu'].map((name, i) =>
        <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => { setPage(name); setNotice(''); }}>
          <span className="nav-icon">{['▦', '＋', '▤', '☷'][i]}</span>{name}
        </button>)}
      <div className="sidebar-bottom"><div className="user-avatar">{session.user.name.slice(0,1).toUpperCase()}</div><div className="user-details"><strong>{session.user.name}</strong><small>{session.user.role}</small></div><button className="logout" title="Sign out" onClick={logout}>↗</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">CAFE OPERATIONS</p><h1>{page}</h1></div><div className="top-actions"><span className="live-dot">● Live sync</span><button className="secondary" onClick={refresh}>↻ Refresh</button><button className="primary" onClick={() => setPage('New Bill')}>＋ New bill</button></div></header>
      {notice && <button className="notice" onClick={() => setNotice('')}>{notice} <span>×</span></button>}
      {loading && <div className="loading-line">Refreshing workspace…</div>}
      {page === 'Dashboard' && <Dashboard data={dashboard} orders={orders} onNew={() => setPage('New Bill')} />}
      {page === 'New Bill' && <POS menu={menu} token={token} user={session.user} onSaved={async order => { setOrders(curr => [order, ...curr]); setNotice(`Invoice ${order.invoiceNo} saved successfully`); await loadData(); setPage('Orders'); }} />}
      {page === 'Orders' && <Orders orders={orders} />}
      {page === 'Menu' && <MenuPage menu={menu} token={token} role={session.user.role} onChange={loadData} />}
      <footer>Built with React · Express · MongoDB · Socket.IO <span>Portfolio demo · {new Date().getFullYear()}</span></footer>
    </main>
  </div>;
}

function Dashboard({ data, orders, onNew }) {
  const stats = [
    ['TODAY REVENUE', money(data?.todayRevenue), 'Paid completed orders'],
    ['TODAY ORDERS', data?.todayOrders ?? '—', 'Completed today'],
    ['PENDING PAYMENTS', data?.pendingPayments ?? '—', 'Awaiting payment'],
    ['ACTIVE MENU ITEMS', data?.menuCount ?? '—', 'Available to order']
  ];
  return <div className="page-content">
    <section className="welcome-panel"><div><p className="eyebrow light">YOUR DAILY OVERVIEW</p><h2>Good service starts here.</h2><p>Keep orders moving and every bill accounted for.</p></div><button className="white-button" onClick={onNew}>＋ Create a bill</button><div className="welcome-decoration">☕</div></section>
    <section className="stats-grid">{stats.map(([label, value, sub], i) => <div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className={`stat-icon icon-${i}`}>{['₹', '↗', '◷', '☷'][i]}</span></div><strong>{value}</strong><small>{sub}</small></div>)}</section>
    <section className="panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Latest billing activity across your workspace.</p></div><span className="count-pill">{orders.length} loaded</span></div><OrderTable orders={orders.slice(0, 6)} /></section>
  </div>;
}

function POS({ menu, token, user, onSaved }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [discount, setDiscount] = useState('0');
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('intra-state');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const categories = ['All', ...new Set(menu.map(item => item.category))];
  const visible = menu.filter(item => (category === 'All' || item.category === category) && item.name.toLowerCase().includes(search.toLowerCase()));
  const subtotal = useMemo(() => Math.round(cart.reduce((sum, row) => sum + row.price * row.quantity, 0) * 100) / 100, [cart]);
  const safeDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const gstRate = Number(import.meta.env.VITE_GST_RATE || 5);
  const taxable = Math.max(0, subtotal - safeDiscount);
  const tax = Math.round(taxable * gstRate) / 100;
  const cgst = placeOfSupply === 'intra-state' ? Math.round(tax * 50) / 100 : 0;
  const sgst = placeOfSupply === 'intra-state' ? tax - cgst : 0;
  const igst = placeOfSupply === 'inter-state' ? tax : 0;
  const total = Math.round((taxable + tax) * 100) / 100;

  function add(item) {
    setCart(current => {
      const found = current.find(row => row._id === item._id);
      return found ? current.map(row => row._id === item._id ? { ...row, quantity: row.quantity + 1 } : row)
        : [...current, { _id: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  }
  function changeQty(id, qty) {
    if (qty <= 0) return setCart(current => current.filter(row => row._id !== id));
    setCart(current => current.map(row => row._id === id ? { ...row, quantity: Math.min(999, qty) } : row));
  }
  async function checkout() {
    setError('');
    if (!cart.length) return setError('Add at least one menu item.');
    if (discount === '' || !Number.isFinite(Number(discount)) || Number(discount) < 0 || Number(discount) > subtotal) return setError('Discount must be between ₹0 and subtotal.');
    if (orderType === 'dine-in' && !tableNumber.trim()) return setError('Enter a table number for dine-in orders.');
    setBusy(true);
    try {
      const result = await api('/orders', {
        token, method: 'POST',
        body: JSON.stringify({
          items: cart.map(row => ({ menuItemId: row._id, quantity: row.quantity })),
          discount: Number(discount), orderType, tableNumber, customerName, placeOfSupply, paymentMethod, paymentStatus
        })
      });
      setCart([]); setDiscount('0'); setTableNumber(''); setCustomerName('');
      onSaved(result.order);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="page-content pos-layout">
    <section className="menu-browser panel">
      <div className="panel-heading"><div><h2>Menu items</h2><p>Select products to add them to the current bill.</p></div><span className="count-pill">{menu.length} items</span></div>
      <div className="menu-controls"><input placeholder="⌕  Search menu…" value={search} onChange={e => setSearch(e.target.value)} /><div className="category-tabs">{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
      <div className="product-grid">{visible.map((item, i) => <button key={item._id} className="product-card" onClick={() => add(item)}><span className={`food-art food-${i % 6}`}>{['☕', '🥤', '🥪', '🍟', '🍰', '🍵'][i % 6]}</span><span className="product-category">{item.category}</span><strong>{item.name}</strong><span className="product-bottom"><b>{money(item.price)}</b><i>＋</i></span></button>)}</div>
      {!visible.length && <div className="empty-state">No menu items match this search.</div>}
    </section>
    <section className="checkout-panel panel">
      <div className="panel-heading"><div><h2>Current bill</h2><p>Review items before checkout.</p></div><span className="cart-count">{cart.reduce((s, i) => s + i.quantity, 0)}</span></div>
      <div className="checkout-fields">
        <label>Order type<select value={orderType} onChange={e => setOrderType(e.target.value)}><option value="dine-in">Dine-in</option><option value="takeaway">Takeaway</option><option value="delivery">Delivery</option></select></label>
        {orderType === 'dine-in' && <label>Table number<input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="e.g. T04" /></label>}
        <label>Customer name (optional)<input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" /></label>
      </div>
      <div className="cart-items">{cart.map(row => <div className="cart-row" key={row._id}><div className="cart-item-info"><strong>{row.name}</strong><small>{money(row.price)} each</small></div><div className="qty-control"><button onClick={() => changeQty(row._id, row.quantity - 1)}>−</button><span>{row.quantity}</span><button onClick={() => changeQty(row._id, row.quantity + 1)}>＋</button></div><strong className="line-price">{money(row.price * row.quantity)}</strong></div>)}
        {!cart.length && <div className="cart-empty"><span>＋</span><strong>Your bill is empty</strong><small>Choose a menu item to get started.</small></div>}
      </div>
      <div className="tax-fields"><label>Discount (₹)<input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} /></label><label>Tax treatment<select value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)}><option value="intra-state">CGST + SGST</option><option value="inter-state">IGST</option></select></label><label>Payment method<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="other">Other</option></select></label><label>Payment status<select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}><option value="paid">Paid</option><option value="pending">Pending</option></select></label></div>
      <div className="bill-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><b>− {money(safeDiscount)}</b></div><div><span>Taxable amount</span><b>{money(taxable)}</b></div><div><span>GST ({gstRate}%)</span><b>{money(tax)}</b></div><div className="tax-detail"><span>CGST / SGST</span><span>{money(cgst)} / {money(sgst)}</span></div>{placeOfSupply === 'inter-state' && <div className="tax-detail"><span>IGST</span><span>{money(igst)}</span></div>}<div className="grand-total"><span>Total due</span><strong>{money(total)}</strong></div></div>
      {error && <div className="alert">{error}</div>}
      <button className="primary full checkout-button" onClick={checkout} disabled={busy || !cart.length}>{busy ? 'Saving bill…' : `Complete bill · ${money(total)}`}</button>
      <p className="hint">Tax shown here is an estimate. The server recalculates the final invoice total.</p>
    </section>
  </div>;
}

function Orders({ orders }) {
  const [query, setQuery] = useState('');
  const filtered = orders.filter(o => `${o.invoiceNo} ${o.customerName} ${o.orderType}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-content"><section className="panel"><div className="panel-heading"><div><h2>All orders</h2><p>Invoices are synchronized across connected sessions.</p></div><span className="count-pill">{filtered.length} orders</span></div><input className="table-search" placeholder="Search invoice, customer or order type…" value={query} onChange={e => setQuery(e.target.value)} /><OrderTable orders={filtered} /></section></div>;
}

function OrderTable({ orders }) {
  if (!orders.length) return <div className="empty-state">No transactions yet. Create your first bill to see it here.</div>;
  return <div className="table-wrap"><table><thead><tr><th>INVOICE</th><th>ORDER</th><th>DATE & TIME</th><th>PAYMENT</th><th>STATUS</th><th className="right">TOTAL</th><th></th></tr></thead><tbody>{orders.map(o => <tr key={o._id}><td><strong className="invoice">{o.invoiceNo}</strong><small>{o.customerName || 'Walk-in customer'}</small></td><td><span className="capitalize">{o.orderType}</span>{o.tableNumber && <small>Table {o.tableNumber}</small>}</td><td>{dateTime(o.createdAt)}</td><td><span className="capitalize">{o.paymentMethod}</span><small>{o.paymentStatus}</small></td><td><span className={`status ${o.status === 'cancelled' ? 'cancelled' : o.paymentStatus === 'pending' ? 'pending' : 'paid'}`}>{o.status === 'cancelled' ? 'Cancelled' : o.paymentStatus === 'pending' ? 'Pending' : 'Completed'}</span></td><td className="right amount">{money(o.grandTotal)}</td><td><button className="text-button" onClick={() => printInvoice(o)}>Print</button></td></tr>)}</tbody></table></div>;
}

function printInvoice(order) {
  const win = window.open('', '_blank', 'width=700,height=800');
  if (!win) return alert('Allow pop-ups to print the invoice.');
  const itemRows = order.items.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>${i.quantity}</td><td>₹${Number(i.unitPrice).toFixed(2)}</td><td>₹${Number(i.lineTotal).toFixed(2)}</td></tr>`).join('');
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(order.invoiceNo)}</title><style>body{font:14px Arial;max-width:680px;margin:30px auto;color:#222}h1{text-align:center}p{text-align:center;color:#555}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.totals{margin-left:auto;width:260px}.totals div{display:flex;justify-content:space-between;padding:5px}.total{font-size:20px;font-weight:bold;border-top:2px solid #222;padding-top:10px!important}@media print{button{display:none}}</style></head><body><h1>CafePOS</h1><p>Restaurant & Café Tax Invoice</p><hr><div>Invoice: <b>${escapeHtml(order.invoiceNo)}</b><br>Date: ${new Date(order.createdAt).toLocaleString('en-IN')}<br>Customer: ${escapeHtml(order.customerName || 'Walk-in customer')}<br>Order: ${escapeHtml(order.orderType)} ${order.tableNumber ? '· Table '+escapeHtml(order.tableNumber) : ''}</div><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table><div class="totals"><div><span>Subtotal</span><b>₹${Number(order.subtotal).toFixed(2)}</b></div><div><span>Discount</span><b>₹${Number(order.discount).toFixed(2)}</b></div><div><span>Taxable</span><b>₹${Number(order.taxableAmount).toFixed(2)}</b></div><div><span>CGST</span><b>₹${Number(order.cgst).toFixed(2)}</b></div><div><span>SGST</span><b>₹${Number(order.sgst).toFixed(2)}</b></div><div><span>IGST</span><b>₹${Number(order.igst).toFixed(2)}</b></div><div class="total"><span>Total</span><b>₹${Number(order.grandTotal).toFixed(2)}</b></div></div><p>Thank you for visiting!</p><button onclick="window.print()">Print invoice</button></body></html>`);
  win.document.close(); win.focus();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function MenuPage({ menu, token, role, onChange }) {
  const [form, setForm] = useState({ name: '', category: 'Coffee', price: '', stock: '0' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await api('/menu', { token, method: 'POST', body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock) }) });
      setForm({ name: '', category: 'Coffee', price: '', stock: '0' }); await onChange();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function remove(item) {
    if (!confirm(`Remove ${item.name} from the active menu?`)) return;
    try { await api(`/menu/${item._id}`, { token, method: 'DELETE' }); await onChange(); }
    catch (err) { setError(err.message); }
  }
  return <div className="page-content"><section className="panel"><div className="panel-heading"><div><h2>Menu management</h2><p>Manage the items available at checkout.</p></div><span className="count-pill">{menu.length} active items</span></div>
    {role === 'admin' ? <form className="menu-add-form" onSubmit={add}><label>Item name<input required maxLength="100" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Masala tea" /></label><label>Category<input required maxLength="60" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label><label>Price (₹)<input type="number" required min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label><label>Stock<input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></label><button className="primary" disabled={busy}>{busy ? 'Adding…' : '＋ Add item'}</button></form> : <p className="muted">Only admins can add or remove menu items.</p>}
    {error && <div className="alert">{error}</div>}
    <div className="table-wrap"><table><thead><tr><th>ITEM</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th>{role === 'admin' && <th></th>}</tr></thead><tbody>{menu.map(item => <tr key={item._id}><td><strong>{item.name}</strong></td><td>{item.category}</td><td className="amount">{money(item.price)}</td><td>{item.trackStock ? item.stock : 'Not tracked'}</td><td><span className="status paid">Active</span></td>{role === 'admin' && <td><button className="text-button danger-text" onClick={() => remove(item)}>Remove</button></td>}</tr>)}</tbody></table></div>
  </section></div>;
}

export default App;
