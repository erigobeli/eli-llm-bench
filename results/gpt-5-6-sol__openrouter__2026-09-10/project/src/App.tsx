import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useSearchParams } from "react-router-dom";
import { api, queryString } from "./api";
import { type Client, type Deal, type Metrics, type Page, type Stage, stageLabels, stages } from "./types";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatMoney = (cents: number) => money.format(cents / 100);

function Icon({ name }: { name: "home" | "clients" | "deals" | "pipeline" }) {
  const paths = {
    home: <><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    clients: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 3 5v2"/></>,
    deals: <><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></>,
    pipeline: <><rect x="3" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/></>
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths[name]}</svg>;
}

function Layout({ children }: { children: ReactNode }) {
  const links = [
    ["/", "Visão geral", "home"], ["/clientes", "Clientes", "clients"],
    ["/negocios", "Negócios", "deals"], ["/pipeline", "Pipeline", "pipeline"]
  ] as const;
  return <div className="app-shell">
    <header className="topbar"><Link to="/" className="brand"><span className="brand-mark">CB</span>CRMBench Modelo</Link></header>
    <aside className="sidebar" aria-label="Navegação principal">
      {links.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === "/"}><Icon name={icon}/><span>{label}</span></NavLink>)}
    </aside>
    <main className="main">{children}</main>
  </div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Notice({ type = "info", children }: { type?: "info" | "success" | "error"; children: ReactNode }) {
  return <div className={`notice ${type}`} role={type === "error" ? "alert" : "status"}>{children}</div>;
}

function Loading() { return <div className="state"><span className="spinner"/>Carregando dados...</div>; }
function Empty({ children }: { children: ReactNode }) { return <div className="state empty">{children}</div>; }

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose}>×</button></div>
      {children}
    </section>
  </div>;
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return <div className="pagination" aria-label="Paginação">
    <span>Página <strong>{page}</strong> de <strong>{Math.max(totalPages, 1)}</strong></span>
    <div><button className="button secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Anterior">Anterior</button><button className="button secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Próxima">Próxima</button></div>
  </div>;
}

function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api<Metrics>("/api/dashboard"), api<Page<Deal>>("/api/deals?pageSize=4")])
      .then(([m, d]) => { setMetrics(m); setDeals(d.data); }).catch(e => setError(e.message));
  }, []);
  return <>
    <PageHeader eyebrow="Início" title="Visão geral" description="Acompanhe o desempenho comercial e as oportunidades recentes." action={<Link className="button primary" to="/negocios">+ Novo negócio</Link>}/>
    {error && <Notice type="error">{error}</Notice>}
    {!metrics ? !error && <Loading/> : <>
      <section className="metrics" aria-label="Indicadores">
        <article className="metric" data-testid="metric" data-metric="totalClients"><span>Clientes cadastrados</span><strong>{metrics.totalClients}</strong><small>Base ativa no CRM</small></article>
        <article className="metric" data-testid="metric" data-metric="openDeals"><span>Negócios abertos</span><strong>{metrics.openDeals}</strong><small>Em andamento no pipeline</small></article>
        <article className="metric accent" data-testid="metric" data-metric="pipelineValueInCents"><span>Valor em pipeline</span><strong>{formatMoney(metrics.pipelineValueInCents)}</strong><small>Oportunidades não fechadas</small></article>
      </section>
      <section className="panel"><div className="panel-header"><div><h2>Negócios recentes</h2><p>Últimas oportunidades adicionadas</p></div><Link to="/pipeline">Ver pipeline</Link></div>
        {deals.length === 0 ? <Empty>Nenhum negócio cadastrado.</Empty> : <div className="compact-list">{deals.map(deal => <div key={deal.id}><span className={`stage-dot ${deal.stage}`}/><div><strong>{deal.title}</strong><small>{deal.clientName}</small></div><b>{formatMoney(deal.valueInCents)}</b><span className={`badge ${deal.stage}`}>{stageLabels[deal.stage]}</span></div>)}</div>}
      </section>
    </>}
  </>;
}

interface ClientFormProps { client?: Client; onClose: () => void; onSaved: (message: string) => void }
function ClientForm({ client, onClose, onSaved }: ClientFormProps) {
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaving(true);
    const form = new FormData(event.currentTarget);
    const body = { name: form.get("name"), email: form.get("email"), company: form.get("company") };
    try {
      await api(client ? `/api/clients/${client.id}` : "/api/clients", { method: client ? "PATCH" : "POST", body: JSON.stringify(body) });
      onSaved(client ? "Cliente atualizado com sucesso." : "Cliente criado com sucesso.");
    } catch (e) { setError((e as Error).message); setSaving(false); }
  }
  return <form onSubmit={submit} className="form">
    {error && <Notice type="error">{error}</Notice>}
    <label>Nome <input name="name" required minLength={2} maxLength={80} defaultValue={client?.name}/></label>
    <label>E-mail <input name="email" type="email" required defaultValue={client?.email}/></label>
    <label>Empresa <input name="company" maxLength={120} defaultValue={client?.company ?? ""}/></label>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Salvando..." : "Salvar cliente"}</button></div>
  </form>;
}

function Clients() {
  const [result, setResult] = useState<Page<Client>>(); const [search, setSearch] = useState(""); const [query, setQuery] = useState("");
  const [page, setPage] = useState(1); const [modal, setModal] = useState<"new" | Client | null>(null); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [reload, setReload] = useState(0);
  useEffect(() => { setError(""); setResult(undefined); api<Page<Client>>(`/api/clients?${queryString({ search: query, page, pageSize: 4 })}`).then(setResult).catch(e => setError(e.message)); }, [query, page, reload]);
  function saved(text: string) { setModal(null); setMessage(text); setReload(x => x + 1); }
  async function remove(client: Client) {
    if (!window.confirm(`Excluir o cliente “${client.name}”?`)) return;
    try { await api(`/api/clients/${client.id}`, { method: "DELETE" }); setMessage("Cliente excluído com sucesso."); setReload(x => x + 1); } catch (e) { setError((e as Error).message); }
  }
  function searchSubmit(e: FormEvent) { e.preventDefault(); setPage(1); setQuery(search); }
  return <>
    <PageHeader eyebrow="Cadastros" title="Clientes" description="Gerencie contatos e consulte os negócios de cada cliente." action={<button className="button primary" onClick={() => setModal("new")}>+ Novo cliente</button>}/>
    {message && <Notice type="success">{message}</Notice>}{error && <Notice type="error">{error}</Notice>}
    <section className="panel data-panel">
      <form className="toolbar" role="search" onSubmit={searchSubmit}><label className="search-field"><span className="sr-only">Buscar clientes</span><input name="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou empresa"/></label><button className="button secondary">Buscar</button>{query && <button type="button" className="text-button" onClick={() => { setSearch(""); setQuery(""); setPage(1); }}>Limpar</button>}</form>
      {!result ? !error && <Loading/> : result.data.length === 0 ? <Empty>Nenhum cliente encontrado.</Empty> : <>
        <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Empresa</th><th>E-mail</th><th className="actions-head">Ações</th></tr></thead><tbody>
          {result.data.map(client => <tr key={client.id} data-testid="client-row" data-id={client.id}><td data-label="Cliente"><strong>{client.name}</strong></td><td data-label="Empresa">{client.company || <span className="muted">Não informada</span>}</td><td data-label="E-mail"><a href={`mailto:${client.email}`}>{client.email}</a></td><td data-label="Ações" className="row-actions"><Link className="text-button" to={`/negocios?clientId=${client.id}`}>Ver negócios</Link><button className="text-button" onClick={() => setModal(client)}>Editar</button><button className="text-button danger" onClick={() => remove(client)}>Excluir</button></td></tr>)}
        </tbody></table></div><Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} onPage={setPage}/></>}
    </section>
    {modal && <Modal title={modal === "new" ? "Novo cliente" : "Editar cliente"} onClose={() => setModal(null)}><ClientForm client={modal === "new" ? undefined : modal} onClose={() => setModal(null)} onSaved={saved}/></Modal>}
  </>;
}

interface DealFormProps { deal?: Deal; clients: Client[]; onClose: () => void; onSaved: (message: string) => void }
function DealForm({ deal, clients, onClose, onSaved }: DealFormProps) {
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget);
    const reais = Number(form.get("value"));
    const body = { title: form.get("title"), valueInCents: Number.isFinite(reais) ? Math.round(reais * 100) : -1, clientId: Number(form.get("clientId")), stage: form.get("stage") };
    try { await api(deal ? `/api/deals/${deal.id}` : "/api/deals", { method: deal ? "PATCH" : "POST", body: JSON.stringify(body) }); onSaved(deal ? "Negócio atualizado com sucesso." : "Negócio criado com sucesso."); }
    catch (e) { setError((e as Error).message); setSaving(false); }
  }
  return <form onSubmit={submit} className="form">
    {error && <Notice type="error">{error}</Notice>}
    <label>Título <input name="title" required minLength={2} maxLength={120} defaultValue={deal?.title}/></label>
    <div className="form-grid"><label>Valor (R$) <input name="value" type="number" min="0" step="0.01" required defaultValue={deal ? (deal.valueInCents / 100).toFixed(2) : ""}/></label><label>Etapa <select name="stage" defaultValue={deal?.stage ?? "new"}>{stages.map(stage => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label></div>
    <label>Cliente <select name="clientId" required defaultValue={deal?.clientId ?? ""}><option value="" disabled>Selecione um cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Salvando..." : "Salvar negócio"}</button></div>
  </form>;
}

function useAllClients() {
  const [clients, setClients] = useState<Client[]>([]);
  useEffect(() => { api<Page<Client>>("/api/clients?pageSize=50").then(r => setClients(r.data)).catch(() => undefined); }, []);
  return clients;
}

function Deals() {
  const clients = useAllClients(); const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<Page<Deal>>(); const [search, setSearch] = useState(params.get("search") || ""); const [query, setQuery] = useState(params.get("search") || "");
  const [stage, setStage] = useState(params.get("stage") || ""); const [clientId, setClientId] = useState(params.get("clientId") || ""); const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"new" | Deal | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [reload, setReload] = useState(0);
  useEffect(() => {
    setParams(p => { const next = new URLSearchParams(p); ["search", "stage", "clientId"].forEach(k => next.delete(k)); if (query) next.set("search", query); if (stage) next.set("stage", stage); if (clientId) next.set("clientId", clientId); return next; }, { replace: true });
    setResult(undefined); setError(""); api<Page<Deal>>(`/api/deals?${queryString({ search: query, stage, clientId, page, pageSize: 4 })}`).then(setResult).catch(e => setError(e.message));
  }, [query, stage, clientId, page, reload, setParams]);
  function saved(text: string) { setModal(null); setMessage(text); setReload(x => x + 1); }
  async function remove(deal: Deal) { if (!window.confirm(`Excluir o negócio “${deal.title}”?`)) return; try { await api(`/api/deals/${deal.id}`, { method: "DELETE" }); setMessage("Negócio excluído com sucesso."); setReload(x => x + 1); } catch (e) { setError((e as Error).message); } }
  function clear() { setSearch(""); setQuery(""); setStage(""); setClientId(""); setPage(1); }
  return <>
    <PageHeader eyebrow="Vendas" title="Negócios" description="Acompanhe oportunidades, valores e responsáveis em todas as etapas." action={<button className="button primary" onClick={() => setModal("new")}>+ Novo negócio</button>}/>
    {message && <Notice type="success">{message}</Notice>}{error && <Notice type="error">{error}</Notice>}
    <section className="panel data-panel">
      <form className="toolbar deal-toolbar" role="search" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search); }}><label className="search-field"><span className="sr-only">Buscar negócios</span><input name="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título"/></label><label><span className="sr-only">Filtrar por etapa</span><select name="stageFilter" value={stage} onChange={e => { setStage(e.target.value); setPage(1); }}><option value="">Todas as etapas</option>{stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}</select></label><label><span className="sr-only">Filtrar por cliente</span><select name="clientFilter" value={clientId} onChange={e => { setClientId(e.target.value); setPage(1); }}><option value="">Todos os clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="button secondary">Buscar</button>{(query || stage || clientId) && <button type="button" className="text-button" onClick={clear}>Limpar</button>}</form>
      {!result ? !error && <Loading/> : result.data.length === 0 ? <Empty>Nenhum negócio encontrado com estes filtros.</Empty> : <>
        <div className="table-wrap"><table><thead><tr><th>Negócio</th><th>Cliente</th><th>Valor</th><th>Etapa</th><th className="actions-head">Ações</th></tr></thead><tbody>
          {result.data.map(deal => <tr key={deal.id} data-testid="deal-row" data-id={deal.id}><td data-label="Negócio"><strong>{deal.title}</strong></td><td data-label="Cliente">{deal.clientName}</td><td data-label="Valor" className="money">{formatMoney(deal.valueInCents)}</td><td data-label="Etapa"><span className={`badge ${deal.stage}`}>{stageLabels[deal.stage]}</span></td><td data-label="Ações" className="row-actions"><button className="text-button" onClick={() => setModal(deal)}>Editar</button><button className="text-button danger" onClick={() => remove(deal)}>Excluir</button></td></tr>)}
        </tbody></table></div><Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} onPage={setPage}/></>}
    </section>
    {modal && <Modal title={modal === "new" ? "Novo negócio" : "Editar negócio"} onClose={() => setModal(null)}><DealForm deal={modal === "new" ? undefined : modal} clients={clients} onClose={() => setModal(null)} onSaved={saved}/></Modal>}
  </>;
}

function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [dragging, setDragging] = useState<number>();
  function load() { api<Page<Deal>>("/api/deals?pageSize=50").then(r => setDeals(r.data)).catch(e => setError(e.message)); }
  useEffect(load, []);
  async function move(id: number, stage: Stage) {
    const current = deals?.find(d => d.id === id); if (!current || current.stage === stage) return;
    setDeals(items => items?.map(d => d.id === id ? { ...d, stage } : d)); setError("");
    try { await api(`/api/deals/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) }); setMessage(`“${current.title}” movido para ${stageLabels[stage]}.`); }
    catch (e) { setDeals(items => items?.map(d => d.id === id ? current : d)); setError((e as Error).message); }
  }
  return <>
    <PageHeader eyebrow="Vendas" title="Pipeline" description="Arraste as oportunidades entre as etapas ou use o seletor em cada cartão." action={<Link className="button primary" to="/negocios">+ Novo negócio</Link>}/>
    {message && <Notice type="success">{message}</Notice>}{error && <Notice type="error">{error}</Notice>}
    {!deals ? !error && <Loading/> : <div className="pipeline">
      {stages.map(stage => { const items = deals.filter(d => d.stage === stage); return <section key={stage} className={`pipeline-column ${dragging ? "drag-active" : ""}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const id = Number(e.dataTransfer.getData("text/plain") || dragging); if (id) move(id, stage); setDragging(undefined); }}>
        <header><div><span className={`stage-dot ${stage}`}/><h2>{stageLabels[stage]}</h2><b>{items.length}</b></div><strong>{formatMoney(items.reduce((sum, d) => sum + d.valueInCents, 0))}</strong></header>
        <div className="pipeline-cards">{items.length === 0 ? <div className="column-empty">Solte um negócio aqui</div> : items.map(deal => <article key={deal.id} className="deal-card" draggable onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(deal.id)); setDragging(deal.id); }} onDragEnd={() => setDragging(undefined)} data-testid="deal-card" data-id={deal.id}>
          <div className="drag-handle" aria-hidden="true">⠿</div><h3>{deal.title}</h3><p>{deal.clientName}</p><strong>{formatMoney(deal.valueInCents)}</strong><label><span>Mover para</span><select name={`stage-${deal.id}`} aria-label={`Etapa de ${deal.title}`} value={deal.stage} onChange={e => move(deal.id, e.target.value as Stage)}>{stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}</select></label>
        </article>)}</div>
      </section>; })}
    </div>}
  </>;
}

function NotFound() { return <div className="not-found"><strong>404</strong><h1>Página não encontrada</h1><Link className="button primary" to="/">Voltar ao início</Link></div>; }

export default function App() {
  return <Layout><Routes><Route path="/" element={<Dashboard/>}/><Route path="/clientes" element={<Clients/>}/><Route path="/negocios" element={<Deals/>}/><Route path="/pipeline" element={<Pipeline/>}/><Route path="*" element={<NotFound/>}/></Routes></Layout>;
}
