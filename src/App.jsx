import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import "./App.css";
import {
  loadLocalWorkspace,
  loadWorkspace,
  saveWorkspace,
  subscribeWorkspace,
} from "./utils/workspaceSync";

const credentials = { username: "Admin_digital", password: "Mohidul" };
const invoiceSuggestions = [
  { icon: "◈", description: "Frontend development", qty: 1, rate: 25000, hsn: "998314" },
  { icon: "⌘", description: "Backend & API integration", qty: 1, rate: 30000, hsn: "998314" },
  { icon: "✦", description: "UI/UX design sprint", qty: 1, rate: 12000, hsn: "998314" },
  { icon: "⚙", description: "Maintenance & support", qty: 1, rate: 5000, hsn: "998314" },
];

const emptyItem = { icon: "◈", description: "", qty: 1, rate: 0, hsn: "998314" };

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function newInvoiceId() {
  const now = new Date();
  return `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
}

function directoryEntry(value) {
  if (typeof value === "string") {
    return { id: `legacy-${value}`, name: value, details: "", createdAt: "" };
  }
  return value;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("digitalInvoiceAuth") === "true");
  const [auth, setAuth] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState(emptyItem);
  const [invoiceId, setInvoiceId] = useState(newInvoiceId);
  const [billPaid, setBillPaid] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [client, setClient] = useState({ name: "", email: "", phone: "", company: "", address: "" });
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const local = loadLocalWorkspace();
    setInvoiceHistory(local.invoiceHistory);
    setClients(local.clients);
    setProjects(local.projects);
    let cancelled = false;
    loadWorkspace().then((workspace) => {
      if (cancelled) return;
      setInvoiceHistory(workspace.invoiceHistory);
      setClients(workspace.clients);
      setProjects(workspace.projects);
    });
    const unsubscribe = subscribeWorkspace((workspace) => {
      setInvoiceHistory(workspace.invoiceHistory);
      setClients(workspace.clients);
      setProjects(workspace.projects);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const subtotal = items.reduce((sum, item) => sum + Number(item.qty) * Number(item.rate), 0);
  const total = subtotal;
  const currentReceived = Math.min(Math.max(Number(receivedAmount) || 0, 0), total);
  const balanceDue = Math.max(total - currentReceived, 0);
  const paidTotal = invoiceHistory.reduce((sum, invoice) => sum + Number(invoice.receivedAmount ?? (invoice.billPaid ? invoice.totalAmount : 0)), 0);
  const outstanding = invoiceHistory.reduce((sum, invoice) => sum + Math.max(invoice.totalAmount - Number(invoice.receivedAmount ?? (invoice.billPaid ? invoice.totalAmount : 0)), 0), 0);
  const currentDate = new Date().toLocaleDateString("en-IN");

  useEffect(() => {
    if (!total) {
      setQrCodeUrl("");
      return;
    }
    QRCode.toDataURL(`upi://pay?pa=mohidulh71@oksbi&pn=Mohidul%20Haque&am=${Math.max(total - currentReceived, 0)}&cu=INR&tn=${invoiceId}`, {
      width: 180,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    }).then(setQrCodeUrl).catch(() => setQrCodeUrl(""));
  }, [total, currentReceived, invoiceId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleLogin = (event) => {
    event.preventDefault();
    if (auth.username === credentials.username && auth.password === credentials.password) {
      setIsAuthenticated(true);
      localStorage.setItem("digitalInvoiceAuth", "true");
      setAuthError("");
    } else {
      setAuthError("That login does not match. Please check your credentials.");
    }
  };

  const addItem = (event) => {
    event.preventDefault();
    if (!newItem.description.trim() || Number(newItem.rate) <= 0) return;
    setItems([...items, { ...newItem, qty: Number(newItem.qty), rate: Number(newItem.rate) }]);
    setNewItem(emptyItem);
  };

  const saveInvoice = () => {
    if (!items.length) {
      setToast("Add at least one line item first.");
      return false;
    }
    const record = {
      id: invoiceId,
      date: currentDate,
      clientName: client.name || "Independent client",
      clientCompany: client.company,
      clientPhone: client.phone,
      clientEmail: client.email,
      totalAmount: total,
      receivedAmount: currentReceived,
      itemCount: items.length,
      items,
      author: "Mohidul Haque",
      createdAt: new Date().toISOString(),
      billPaid,
    };
    const updated = [record, ...invoiceHistory.filter((entry) => entry.id !== invoiceId)].slice(0, 100);
    setInvoiceHistory(updated);
    saveWorkspace({ invoiceHistory: updated, clients, projects })
      .then(({ synced }) => setToast(synced ? "Invoice saved and synced worldwide." : "Invoice saved locally. Open Super Admin and verify the GitHub token."))
      .catch((error) => {
        console.error("Unable to sync invoice", error);
        setToast(`Invoice saved locally. Cloud sync failed: ${error.message}`);
      });
    return true;
  };

  const updateDirectory = async (type, action, entry) => {
    const current = type === "clients" ? clients : projects;
    const existing = current.map(directoryEntry);
    let next;
    if (action === "delete") {
      next = existing.filter((item) => item.id !== entry.id);
    } else {
      const record = {
        ...entry,
        id: entry.id || `${type}-${Date.now()}`,
        name: entry.name.trim(),
        details: (entry.details || "").trim(),
        updatedAt: new Date().toISOString(),
        createdAt: entry.createdAt || new Date().toISOString(),
      };
      if (!record.name) return;
      next = entry.id
        ? existing.map((item) => item.id === entry.id ? record : item)
        : [record, ...existing];
      if (new Set(next.map((item) => item.name.toLowerCase())).size !== next.length) {
        setToast(`That ${type === "clients" ? "client" : "project"} already exists.`);
        return;
      }
    }
    const workspace = { invoiceHistory, clients: type === "clients" ? next : clients, projects: type === "projects" ? next : projects };
    if (type === "clients") setClients(next); else setProjects(next);
    try {
      const { synced } = await saveWorkspace(workspace);
      const label = type === "clients" ? "Client" : "Project";
      setToast(synced ? `${label} ${action === "delete" ? "deleted" : action === "update" ? "updated" : "added"} and synced worldwide.` : `${label} ${action === "delete" ? "deleted" : action === "update" ? "updated" : "added"} locally. Configure cloud sync in Super Admin.`);
    } catch (error) {
      console.error("Unable to sync directory entry", error);
      setToast(`Saved locally. Cloud sync failed: ${error.message}`);
    }
  };

  const downloadPDF = () => {
    if (!saveInvoice()) return;
    const originalTitle = document.title;
    document.title = `${invoiceId}-${client.name || "client"}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  const resetInvoice = () => {
    setItems([]);
    setClient({ name: "", email: "", phone: "", company: "", address: "" });
    setBillPaid(false);
    setReceivedAmount(0);
    setInvoiceId(newInvoiceId());
    setNewItem(emptyItem);
  };

  const loadInvoice = (invoice) => {
    setInvoiceId(invoice.id);
    setItems(invoice.items || []);
    setClient({ name: invoice.clientName === "Independent client" ? "" : invoice.clientName, email: invoice.clientEmail || "", phone: invoice.clientPhone || "", company: invoice.clientCompany || "", address: "" });
    setBillPaid(invoice.billPaid);
    setReceivedAmount(invoice.receivedAmount ?? (invoice.billPaid ? invoice.totalAmount : 0));
    setActiveView("invoice");
    setToast("Invoice loaded for editing.");
  };

  const filteredHistory = useMemo(() => invoiceHistory.filter((invoice) => {
    const needle = searchTerm.toLowerCase();
    return !needle || invoice.id.toLowerCase().includes(needle) || invoice.clientName.toLowerCase().includes(needle);
  }), [invoiceHistory, searchTerm]);

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-decoration decoration-one" />
        <div className="login-decoration decoration-two" />
        <div className="login-card">
          <div className="brand-mark">⌁</div>
          <p className="eyebrow">FREELANCE OS</p>
          <h1>Welcome back<span>.</span></h1>
          <p className="login-subtitle">Your calm command center for shipping great work and getting paid on time.</p>
          <form onSubmit={handleLogin} className="login-form">
            <label>Login ID<input value={auth.username} onChange={(event) => setAuth({ ...auth, username: event.target.value })} placeholder="Your login ID" required /></label>
            <label>Password<input type="password" value={auth.password} onChange={(event) => setAuth({ ...auth, password: event.target.value })} placeholder="Your password" required /></label>
            {authError && <div className="form-error">{authError}</div>}
            <button className="primary-button wide" type="submit">Enter workspace <span>→</span></button>
          </form>
          <p className="login-footnote">Private workspace · Built for independent developers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar print:hidden">
        <div className="sidebar-brand"><div className="brand-mark small">⌁</div><div><strong>Folio</strong><span>developer OS</span></div></div>
        <div className="profile-chip"><div className="avatar">MH</div><div><strong>Mohidul Haque</strong><span>Software developer</span></div><span className="status-dot" /></div>
        <nav>
          <p className="nav-label">Workspace</p>
          {[["overview", "▦", "Overview"], ["invoice", "＋", "New invoice"], ["history", "◷", "Invoices"], ["clients", "◎", "Clients"], ["projects", "⌘", "Projects"]].map(([view, icon, label]) => (
            <button key={view} className={`nav-item ${activeView === view ? "active" : ""}`} onClick={() => setActiveView(view)}><span>{icon}</span>{label}{view === "history" && invoiceHistory.length > 0 && <b>{invoiceHistory.length}</b>}</button>
          ))}
          <p className="nav-label nav-label-bottom">Account</p>
          <button className="nav-item" onClick={() => { localStorage.removeItem("digitalInvoiceAuth"); setIsAuthenticated(false); }}><span>↪</span>Sign out</button>
        </nav>
        <div className="sidebar-footer"><span className="spark">✦</span><p><strong>Keep building.</strong><br />Your next great project starts here.</p></div>
      </aside>

      <main className="main-content">
        <header className="topbar print:hidden"><div className="mobile-brand"><div className="brand-mark small">⌁</div><strong>Folio</strong></div><div className="topbar-date">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}<span className="topbar-divider" /> <span className="online"><i /> All systems good</span></div><button className="icon-button" title="Notifications">♢</button></header>

        {activeView === "overview" && <Overview invoiceHistory={invoiceHistory} paidTotal={paidTotal} outstanding={outstanding} total={total} setActiveView={setActiveView} />}
        {activeView === "invoice" && <InvoiceEditor {...{ items, newItem, setNewItem, addItem, client, setClient, invoiceId, billPaid, setBillPaid, receivedAmount: currentReceived, setReceivedAmount, subtotal, total, balanceDue, currentDate, invoiceSuggestions, resetInvoice, downloadPDF, qrCodeUrl, saveInvoice }} />}
        {activeView === "history" && <HistoryView history={filteredHistory} searchTerm={searchTerm} setSearchTerm={setSearchTerm} loadInvoice={loadInvoice} />}
        {activeView === "clients" && <DirectoryView title="Clients" description="Keep every relationship in one place." icon="◎" values={clients} type="clients" onSave={(entry) => updateDirectory("clients", entry.id ? "update" : "create", entry)} onDelete={(entry) => updateDirectory("clients", "delete", entry)} />}
        {activeView === "projects" && <DirectoryView title="Projects" description="A simple view of the work behind your invoices." icon="⌘" values={projects} type="projects" onSave={(entry) => updateDirectory("projects", entry.id ? "update" : "create", entry)} onDelete={(entry) => updateDirectory("projects", "delete", entry)} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Overview({ invoiceHistory, paidTotal, outstanding, setActiveView }) {
  const recent = invoiceHistory.slice(0, 4);
  return <div className="page-wrap">
    <div className="page-heading"><div><p className="eyebrow">MONDAY, YOUR WORKSPACE</p><h1>Good morning, Mohidul <span>✦</span></h1><p className="muted">Here’s what’s happening across your freelance practice.</p></div><button className="primary-button" onClick={() => setActiveView("invoice")}>＋ Create invoice</button></div>
    <section className="hero-card"><div><p className="eyebrow light">YOUR INDEPENDENT STUDIO</p><h2>Make space for<br /><em>good work.</em></h2><p>Track projects, send polished invoices, and keep your business moving.</p><button className="hero-link" onClick={() => setActiveView("projects")}>View your workflow <span>→</span></button></div><div className="hero-graphic"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span>⌁</span></div></section>
    <div className="section-header"><h2>At a glance</h2><span className="muted">Updated just now</span></div>
    <section className="metric-grid"><Metric label="Total collected" value={money(paidTotal)} detail="From paid invoices" tone="violet" /><Metric label="Awaiting payment" value={money(outstanding)} detail="Across open invoices" tone="peach" /><Metric label="Invoices sent" value={invoiceHistory.length} detail="This workspace" tone="mint" /><Metric label="On-time rate" value={invoiceHistory.length ? "100%" : "—"} detail="Keep the streak going" tone="blue" /></section>
    <section className="content-grid"><div className="panel recent-panel"><div className="panel-heading"><div><h2>Recent invoices</h2><p className="muted">Your latest billing activity</p></div><button className="text-button" onClick={() => setActiveView("history")}>View all <span>→</span></button></div>{recent.length ? recent.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />) : <EmptyState setActiveView={setActiveView} />}</div><div className="panel focus-panel"><div className="panel-heading"><div><h2>Today’s focus</h2><p className="muted">A little structure goes a long way</p></div><span className="focus-icon">✦</span></div><div className="focus-list"><div className="focus-item done"><span>✓</span><div><strong>Workspace setup</strong><small>Ready to go</small></div></div><div className="focus-item"><span>○</span><div><strong>Send your next invoice</strong><small>Keep cash flow healthy</small></div></div><div className="focus-item"><span>○</span><div><strong>Update your project log</strong><small>Capture what you shipped</small></div></div></div></div></section>
  </div>;
}

function Metric({ label, value, detail, tone }) { return <div className={`metric-card ${tone}`}><div className="metric-icon">✦</div><p>{label}</p><strong>{value}</strong><span>{detail}</span></div>; }
function EmptyState({ setActiveView }) { return <div className="empty-state"><span>◌</span><p>No invoices yet</p><small>Create your first invoice to see it here.</small><button className="text-button" onClick={() => setActiveView("invoice")}>Create invoice →</button></div>; }
function InvoiceRow({ invoice }) { const received = Number(invoice.receivedAmount ?? (invoice.billPaid ? invoice.totalAmount : 0)); const status = received >= invoice.totalAmount ? "Paid" : received > 0 ? "Partial" : "Pending"; return <div className="invoice-row"><div className="invoice-symbol">⌁</div><div className="invoice-row-main"><strong>{invoice.clientName}</strong><span>{invoice.id} · {invoice.date}</span></div><strong className="row-amount">{money(invoice.totalAmount)}</strong><span className={`status ${status.toLowerCase()}`}>{status}</span><span className="row-arrow">→</span></div>; }

function InvoiceEditor({ items, newItem, setNewItem, addItem, client, setClient, invoiceId, billPaid, setBillPaid, receivedAmount, setReceivedAmount, subtotal, total, balanceDue, currentDate, invoiceSuggestions, resetInvoice, downloadPDF, qrCodeUrl, saveInvoice }) {
  const updateClient = (event) => setClient({ ...client, [event.target.name]: event.target.value });
  const updatePaidStatus = () => {
    const nextPaid = !billPaid;
    setBillPaid(nextPaid);
    setReceivedAmount(nextPaid ? total : 0);
  };
  return <div className="page-wrap invoice-page">
    <div className="page-heading"><div><p className="eyebrow">BILLING / NEW INVOICE</p><h1>Create an invoice <span>✦</span></h1><p className="muted">A clear invoice makes great work feel even better.</p></div><div className="heading-actions"><button className="secondary-button" onClick={resetInvoice}>Reset</button><button className="primary-button" onClick={downloadPDF}>Save & print <span>↗</span></button></div></div>
    <div className="invoice-layout"><section className="invoice-form-panel panel"><div className="invoice-meta"><div><span className="field-caption">Invoice number</span><strong>{invoiceId}</strong></div><div><span className="field-caption">Issue date</span><strong>{currentDate}</strong></div><label className="received-field"><span className="field-caption">Amount received</span><div><span>₹</span><input type="number" min="0" max={total} value={receivedAmount || ""} onChange={(event) => { setReceivedAmount(Math.min(Number(event.target.value) || 0, total)); setBillPaid(Number(event.target.value) >= total && total > 0); }} placeholder="0" /></div></label><label className="paid-toggle"><input type="checkbox" checked={billPaid} onChange={updatePaidStatus} /><span>{billPaid ? "Paid in full" : "Mark as paid"}</span></label></div>
      <div className="form-section"><div className="section-title"><span>01</span><div><h2>Client details</h2><p>Who is this invoice for?</p></div></div><div className="field-grid"><label>Client contact<input name="name" value={client.name} onChange={updateClient} placeholder="e.g. Priya Sharma" /></label><label>Company name<input name="company" value={client.company} onChange={updateClient} placeholder="e.g. Acme Studio" /></label><label>Email address<input type="email" name="email" value={client.email} onChange={updateClient} placeholder="hello@client.com" /></label><label>Phone number<input name="phone" value={client.phone} onChange={updateClient} placeholder="+91 00000 00000" /></label><label className="field-wide">Billing address<input name="address" value={client.address} onChange={updateClient} placeholder="Client billing address" /></label></div></div>
      <div className="form-section"><div className="section-title"><span>02</span><div><h2>Line items</h2><p>What did you build or deliver?</p></div></div><div className="suggestion-list">{invoiceSuggestions.map((suggestion) => <button type="button" key={suggestion.description} onClick={() => setNewItem(suggestion)} className="suggestion-pill"><span>{suggestion.icon}</span>{suggestion.description}</button>)}</div><form className="item-form" onSubmit={addItem}><input className="item-icon" name="icon" value={newItem.icon} onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })} aria-label="Icon" /><input name="description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="Describe a deliverable" required /><input className="item-qty" type="number" min="1" name="qty" value={newItem.qty} onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })} aria-label="Quantity" /><input className="item-rate" type="number" min="0" name="rate" value={newItem.rate} onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })} placeholder="Rate" required /><button className="add-item" type="submit">Add item</button></form><div className="line-items">{items.length ? items.map((item, index) => <div className="line-item" key={`${item.description}-${index}`}><span className="line-item-icon">{item.icon}</span><div><strong>{item.description}</strong><small>{item.qty} × {money(item.rate)}</small></div><strong>{money(item.qty * item.rate)}</strong></div>) : <div className="line-empty">Your deliverables will appear here.</div>}</div><div className="total-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="total-row"><span>Amount received</span><strong className="received-amount">{money(receivedAmount)}</strong></div><div className="total-row grand-total"><span>Balance due</span><strong>{money(balanceDue)}</strong></div></div>
      <div className="invoice-actions"><button className="secondary-button" onClick={() => saveInvoice()}>Save draft</button><button className="primary-button" onClick={downloadPDF}>Save & print invoice <span>↗</span></button></div>
    </section><aside className="invoice-preview panel"><div className="preview-label">LIVE PREVIEW · PRINT READY</div><div className="preview-paper"><div className="preview-brand-bar" /><div className="preview-top"><div className="preview-brand"><div className="preview-logo">⌁</div><div><strong>MOHIDUL HAQUE</strong><span>Software developer · Independent studio</span></div></div><div className="preview-invoice"><small>PROFESSIONAL INVOICE</small><strong>{invoiceId}</strong><span className={billPaid ? "invoice-paid" : balanceDue < total ? "invoice-partial" : ""}>{billPaid ? "PAID IN FULL" : balanceDue < total ? "PARTIALLY PAID" : "DUE UPON RECEIPT"}</span></div></div><div className="preview-rule" /><div className="preview-contact"><span>Web · Mobile · API Engineering</span><span>mohidul-hq.me · +91 9531976493</span></div><div className="preview-bill"><div><small>BILLED TO</small><strong>{client.name || "Your client"}</strong><span>{client.company || "Client company"}</span><span>{client.email || "client@email.com"}</span>{client.phone && <span>{client.phone}</span>}{client.address && <span>{client.address}</span>}</div><div><small>ISSUE DATE</small><strong>{currentDate}</strong><small className="preview-due-label">BALANCE DUE</small><strong>{money(balanceDue)}</strong></div></div><div className="preview-table-head"><span>DESCRIPTION</span><span>AMOUNT</span></div><div className="preview-lines">{items.length ? items.map((item, index) => <div key={index}><span><b>{item.description}</b><small>{item.qty} × {money(item.rate)}</small></span><strong>{money(item.qty * item.rate)}</strong></div>) : <div className="preview-placeholder">Add line items to preview</div>}</div><div className="preview-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Received</span><strong className="summary-received">{money(receivedAmount)}</strong></div><div className="preview-total"><span>Balance due</span><strong>{money(balanceDue)}</strong></div></div><div className="preview-footer"><div className="payment-block">{qrCodeUrl ? <img src={qrCodeUrl} alt="UPI payment QR" /> : <div className="qr-placeholder">QR</div>}<span>Scan to pay balance via UPI</span><small>mohidulh71@oksbi</small></div><div className="thank-you"><strong>Thank you for your trust.</strong><p>Built with care by Mohidul Haque.<br />Questions? Get in touch anytime.</p></div></div><div className="preview-terms">This invoice is issued by Mohidul Haque · Payment terms: due upon receipt · Please retain for your records.</div></div></aside></div>;
  </div>;
}

function HistoryView({ history, searchTerm, setSearchTerm, loadInvoice }) {
  return <div className="page-wrap"><div className="page-heading"><div><p className="eyebrow">BILLING / ARCHIVE</p><h1>Invoices <span>✦</span></h1><p className="muted">Every conversation, deliverable, and payment in one place.</p></div><div className="history-count">{history.length} records</div></div><div className="panel history-panel"><div className="history-toolbar"><div className="search-box">⌕<input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by client or invoice number..." /></div></div>{history.length ? <div className="history-list">{history.map((invoice) => <div className="history-card" key={invoice.id}><div className="history-card-icon">⌁</div><div className="history-card-main"><strong>{invoice.clientName}</strong><span>{invoice.id} · {invoice.date} · {invoice.itemCount} deliverable{invoice.itemCount === 1 ? "" : "s"}</span></div><strong className="history-amount">{money(invoice.totalAmount)}</strong><span className={`status ${invoice.billPaid ? "paid" : "pending"}`}>{invoice.billPaid ? "Paid" : "Pending"}</span><button className="text-button" onClick={() => loadInvoice(invoice)}>Open →</button></div>)}</div> : <EmptyState />}</div></div>;
}

function DirectoryView({ title, description, icon, values, type, onSave, onDelete }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const entries = values.map(directoryEntry);
  const filtered = entries.filter((entry) => `${entry.name} ${entry.details}`.toLowerCase().includes(query.toLowerCase()));
  const label = type === "clients" ? "client" : "project";
  const openNew = () => setEditing({ name: "", details: "" });
  return <div className="page-wrap">
    <div className="page-heading"><div><p className="eyebrow">WORKSPACE / DIRECTORY</p><h1>{title} <span>{icon}</span></h1><p className="muted">{description}</p></div><button className="primary-button" onClick={openNew}>＋ Add {label}</button></div>
    <div className="directory-toolbar panel"><div className="search-box">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} /></div><span className="directory-count">{filtered.length} {filtered.length === 1 ? label : `${label}s`}</span></div>
    <div className="directory-grid">{filtered.length ? filtered.map((entry) => <div className="directory-card panel" key={entry.id}><div className="directory-avatar">{entry.name.slice(0, 2).toUpperCase()}</div><div className="directory-card-content"><strong>{entry.name}</strong><span>{entry.details || (type === "clients" ? "Client relationship" : "Active workstream")}</span></div><div className="directory-actions"><button className="icon-button small" onClick={() => setEditing(entry)} aria-label={`Edit ${entry.name}`}>✎</button><button className="icon-button small danger" onClick={() => setConfirming(entry)} aria-label={`Delete ${entry.name}`}>×</button></div></div>) : <div className="panel directory-empty"><span>{icon}</span><h2>{query ? `No ${label}s found` : `Your ${type} will live here.`}</h2><p>{query ? "Try a different search term." : `Start by adding your first ${label}.`}</p>{!query && <button className="text-button" onClick={openNew}>＋ Add {label}</button>}</div>}</div>
    {editing && <DirectoryModal label={label} entry={editing} onClose={() => setEditing(null)} onSave={(entry) => { onSave(entry); setEditing(null); }} />}
    {confirming && <div className="modal-backdrop"><div className="confirm-modal panel"><span className="modal-icon danger">!</span><h2>Delete {confirming.name}?</h2><p>This cannot be undone. The record will be removed from this workspace.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setConfirming(null)}>Cancel</button><button className="danger-button" onClick={() => { onDelete(confirming); setConfirming(null); }}>Delete {label}</button></div></div></div>}
  </div>;
}

function DirectoryModal({ label, entry, onClose, onSave }) {
  const [form, setForm] = useState({ name: entry.name || "", details: entry.details || "" });
  const isEdit = Boolean(entry.id);
  const submit = (event) => { event.preventDefault(); onSave({ ...entry, ...form }); };
  return <div className="modal-backdrop"><form className="directory-modal panel" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">{isEdit ? "EDIT RECORD" : "NEW RECORD"}</p><h2>{isEdit ? `Edit ${label}` : `Add ${label}`}</h2></div><button type="button" className="icon-button small" onClick={onClose} aria-label="Close">×</button></div><label>{label === "client" ? "Client name" : "Project name"}<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={label === "client" ? "e.g. Priya Sharma" : "e.g. Mobile app redesign"} required maxLength="80" /></label><label>Notes <span className="optional">(optional)</span><textarea value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder={label === "client" ? "Company, email, or a useful note" : "Scope, status, or a useful note"} maxLength="160" rows="3" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{isEdit ? "Save changes" : `Add ${label}`}</button></div></form></div>;
}

export default App;
