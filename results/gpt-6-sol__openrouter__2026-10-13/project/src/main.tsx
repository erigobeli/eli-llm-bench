import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useSearchParams } from 'react-router-dom';
import './style.css';

type Client = { id: number; name: string; email: string; company: string | null; createdAt: string; updatedAt: string };
type Stage = 'new' | 'contact' | 'proposal' | 'won';
type Deal = { id: number; title: string; valueInCents: number; clientId: number; stage: Stage; createdAt: string; updatedAt: string };
type Page<T> = { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
type Metrics = { totalClients: number; openDeals: number; pipelineValueInCents: number };
const stages: { value: Stage; label: string }[] = [
  { value: 'new', label: 'Novo' }, { value: 'contact', label: 'Em contato' },
  { value: 'proposal', label: 'Proposta' }, { value: 'won', label: 'Fechado' },
];
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const date = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
const stageName = (value: Stage) => stages.find(s => s.value === value)?.label || value;

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Não foi possível concluir a operação.');
  }
  return response.status === 204 ? undefined as T : response.json();
}

function Layout() {
  return <div className="app-shell">
    <header className="topbar"><div className="topbar-inner"><Link to="/" className="brand"><span className="brand-symbol" aria-hidden="true">C</span>CRMBench Modelo</Link><span className="topbar-caption">Área comercial</span></div></header>
    <nav className="navigation" aria-label="Navegação principal"><div className="nav-inner">
      {[['/', 'Visão geral'], ['/clientes', 'Clientes'], ['/negocios', 'Negócios'], ['/pipeline', 'Pipeline']].map(([to, label]) => <NavLink key={to} end={to === '/'} to={to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}
    </div></nav>
    <main className="main"><Routes><Route path="/" element={<Dashboard />} /><Route path="/clientes" element={<Clients />} /><Route path="/negocios" element={<Deals />} /><Route path="/pipeline" element={<Pipeline />} /><Route path="*" element={<section className="panel empty">Página não encontrada. <Link to="/">Voltar à visão geral</Link></section>} /></Routes></main>
  </div>;
}

function Heading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action && <div className="page-action">{action}</div>}</div>;
}
function Notice({ message, error, clear }: { message: string; error?: boolean; clear?: () => void }) {
  return message ? <div role="alert" className={`notice ${error ? 'notice-error' : 'notice-success'}`}>{message}{clear && <button type="button" aria-label="Fechar aviso" onClick={clear}>×</button>}</div> : null;
}
function Pagination({ pagination, setPage }: { pagination: Page<unknown>['pagination']; setPage: (n: number) => void }) {
  return <div className="pagination"><span>{pagination.total === 0 ? 'Nenhum registro' : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} de ${pagination.total}`}</span><div><button type="button" className="button subtle" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>Anterior</button><span className="page-count">Página {pagination.page} de {Math.max(pagination.totalPages, 1)}</span><button type="button" className="button subtle" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>Próxima</button></div></div>;
}

function Dashboard() {
  const [metrics, setMetrics] = React.useState<Metrics | null>(null);
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [error, setError] = React.useState('');
  React.useEffect(() => { Promise.all([api<Metrics>('/dashboard'), api<Page<Deal>>('/deals?pageSize=4')]).then(([m, d]) => { setMetrics(m); setDeals(d.data); }).catch(e => setError(e.message)); }, []);
  return <><Heading eyebrow="PAINEL COMERCIAL" title="Visão geral" detail="Acompanhe os indicadores e os negócios mais recentes." /><Notice message={error} error />{!metrics && !error ? <div className="panel empty">Carregando indicadores...</div> : metrics && <>
    <div className="metrics"><div className="metric panel" data-testid="metric" data-metric="totalClients"><span>Clientes cadastrados</span><strong>{metrics.totalClients}</strong><Link to="/clientes">Ver clientes <span aria-hidden="true">→</span></Link></div><div className="metric panel" data-testid="metric" data-metric="openDeals"><span>Negócios abertos</span><strong>{metrics.openDeals}</strong><Link to="/negocios">Ver negócios <span aria-hidden="true">→</span></Link></div><div className="metric panel" data-testid="metric" data-metric="pipelineValueInCents"><span>Valor no pipeline</span><strong>{money(metrics.pipelineValueInCents)}</strong><Link to="/pipeline">Ver pipeline <span aria-hidden="true">→</span></Link></div></div>
    <section className="panel"><div className="panel-heading"><div><h2>Negócios em destaque</h2><p>Uma visão rápida dos registros comerciais.</p></div><Link to="/negocios" className="text-link">Ver todos →</Link></div>{deals.length ? <div className="table-wrap"><table><thead><tr><th>Negócio</th><th>Valor</th><th>Etapa</th></tr></thead><tbody>{deals.map(deal => <tr key={deal.id}><td data-label="Negócio"><strong>{deal.title}</strong></td><td data-label="Valor">{money(deal.valueInCents)}</td><td data-label="Etapa"><span className={`badge ${deal.stage}`}>{stageName(deal.stage)}</span></td></tr>)}</tbody></table></div> : <div className="empty">Nenhum negócio cadastrado.</div>}</section>
  </>}</>;
}

function ClientForm({ initial, onSave, onCancel }: { initial: Client | null; onSave: (data: { name: string; email: string; company: string | null }) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = React.useState(initial?.name || '');
  const [email, setEmail] = React.useState(initial?.email || '');
  const [company, setCompany] = React.useState(initial?.company || '');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (name.trim().length < 2 || name.trim().length > 80) return setError('O nome deve ter entre 2 e 80 caracteres.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Informe um e-mail válido.');
    setSaving(true);
    try { await onSave({ name: name.trim(), email: email.trim(), company: company.trim() || null }); } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} noValidate><Notice message={error} error /><div className="fields"><label>Nome <span className="required">*</span><input name="name" value={name} onChange={e => setName(e.target.value)} autoFocus required maxLength={80} /></label><label>E-mail <span className="required">*</span><input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label className="wide">Empresa <span className="optional">Opcional</span><input name="company" value={company} onChange={e => setCompany(e.target.value)} /></label></div><div className="form-actions"><button type="button" className="button subtle" onClick={onCancel}>Cancelar</button><button type="submit" className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar cliente'}</button></div></form>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h2>{title}</h2><button type="button" className="close" aria-label="Fechar" onClick={onClose}>×</button></div>{children}</section></div>;
}

function Clients() {
  const [results, setResults] = React.useState<Page<Client> | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [editing, setEditing] = React.useState<Client | null | 'new'>(null);
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [revision, refresh] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => {
    let alive = true; setLoading(true); setError('');
    api<Page<Client>>(`/clients?page=${page}&pageSize=4&search=${encodeURIComponent(search)}`).then(data => { if (alive) { if (page > 1 && page > data.pagination.totalPages) setPage(Math.max(1, data.pagination.totalPages)); else setResults(data); } }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [search, page, revision]);
  async function save(data: { name: string; email: string; company: string | null }) {
    await api(`/clients${editing && editing !== 'new' ? `/${editing.id}` : ''}`, { method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify(data) });
    setEditing(null); setNotice(editing === 'new' ? 'Cliente criado com sucesso.' : 'Cliente atualizado com sucesso.'); refresh();
  }
  async function remove(client: Client) {
    if (!window.confirm(`Excluir o cliente “${client.name}”?`)) return;
    setNotice(''); setError('');
    try { await api(`/clients/${client.id}`, { method: 'DELETE' }); setNotice('Cliente excluído com sucesso.'); refresh(); } catch (e) { setError((e as Error).message); }
  }
  return <><Heading eyebrow="CADASTROS" title="Clientes" detail="Gerencie contatos e consulte seus negócios." action={<button type="button" className="button primary" onClick={() => setEditing('new')}>+ Novo cliente</button>} /><Notice message={notice} clear={() => setNotice('')} /><Notice message={error} error clear={() => setError('')} />
    <section className="panel"><div className="toolbar"><label className="search-field">Buscar clientes<input name="search" type="search" placeholder="Nome, e-mail ou empresa" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label><span className="toolbar-total">{results?.pagination.total ?? '—'} clientes</span></div>
      {loading ? <div className="empty">Carregando clientes...</div> : error ? <div className="empty">Não foi possível carregar os clientes.</div> : results && (results.data.length ? <><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Empresa</th><th>Cadastrado em</th><th className="actions-col">Ações</th></tr></thead><tbody>{results.data.map(client => <tr key={client.id} data-testid="client-row" data-id={client.id}><td data-label="Cliente"><strong>{client.name}</strong><small>{client.email}</small></td><td data-label="Empresa">{client.company || '—'}</td><td data-label="Cadastrado em">{date(client.createdAt)}</td><td data-label="Ações"><div className="row-actions"><Link className="text-link" to={`/negocios?clientId=${client.id}`}>Ver negócios</Link><button type="button" className="text-button" onClick={() => setEditing(client)}>Editar</button><button type="button" className="text-button danger" onClick={() => remove(client)}>Excluir</button></div></td></tr>)}</tbody></table></div><Pagination pagination={results.pagination} setPage={setPage} /></> : <div className="empty">Nenhum cliente encontrado.{search ? ' Tente outra busca.' : ' Cadastre o primeiro cliente.'}</div>)}
    </section>{editing && <Modal title={editing === 'new' ? 'Novo cliente' : 'Editar cliente'} onClose={() => setEditing(null)}><ClientForm initial={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} /></Modal>}</>;
}

function DealForm({ initial, clients, onSave, onCancel }: { initial: Deal | null; clients: Client[]; onSave: (data: { title: string; valueInCents: number; clientId: number; stage: Stage }) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = React.useState(initial?.title || '');
  const [value, setValue] = React.useState(initial ? (initial.valueInCents / 100).toFixed(2) : '');
  const [clientId, setClientId] = React.useState(initial?.clientId.toString() || '');
  const [stage, setStage] = React.useState<Stage>(initial?.stage || 'new');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (title.trim().length < 2 || title.trim().length > 120) return setError('O título deve ter entre 2 e 120 caracteres.');
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()) || !Number.isSafeInteger(Math.round(Number(value.replace(',', '.')) * 100))) return setError('Informe um valor válido, com até duas casas decimais.');
    if (!clientId || !clients.some(c => c.id === Number(clientId))) return setError('Selecione um cliente válido.');
    setSaving(true);
    try { await onSave({ title: title.trim(), valueInCents: Math.round(Number(value.replace(',', '.')) * 100), clientId: Number(clientId), stage }); } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} noValidate><Notice message={error} error /><div className="fields"><label className="wide">Título <span className="required">*</span><input name="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required autoFocus /></label><label>Valor (R$) <span className="required">*</span><input name="valueInCents" type="number" min="0" step="0.01" placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} required /></label><label>Etapa <span className="required">*</span><select name="stage" value={stage} onChange={e => setStage(e.target.value as Stage)}>{stages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label><label className="wide">Cliente <span className="required">*</span><select name="clientId" value={clientId} onChange={e => setClientId(e.target.value)} required><option value="">Selecione um cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><div className="form-actions"><button type="button" className="button subtle" onClick={onCancel}>Cancelar</button><button type="submit" className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar negócio'}</button></div></form>;
}

function Deals() {
  const [params, setParams] = useSearchParams();
  const [results, setResults] = React.useState<Page<Deal> | null>(null);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [search, setSearch] = React.useState('');
  const [stage, setStage] = React.useState('');
  const clientId = params.get('clientId') || '';
  const [page, setPage] = React.useState(1);
  const [editing, setEditing] = React.useState<Deal | null | 'new'>(null);
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [revision, refresh] = React.useReducer(n => n + 1, 0);
  React.useEffect(() => { api<Page<Client>>('/clients?pageSize=50').then(data => setClients(data.data)).catch(e => setError(e.message)); }, [revision]);
  React.useEffect(() => {
    let alive = true; setLoading(true); setError('');
    const query = new URLSearchParams({ page: String(page), pageSize: '4', search });
    if (stage) query.set('stage', stage);
    if (clientId) query.set('clientId', clientId);
    api<Page<Deal>>(`/deals?${query}`).then(data => { if (alive) { if (page > 1 && page > data.pagination.totalPages) setPage(Math.max(1, data.pagination.totalPages)); else setResults(data); } }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [search, stage, clientId, page, revision]);
  async function save(data: { title: string; valueInCents: number; clientId: number; stage: Stage }) {
    await api(`/deals${editing && editing !== 'new' ? `/${editing.id}` : ''}`, { method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify(data) });
    setEditing(null); setNotice(editing === 'new' ? 'Negócio criado com sucesso.' : 'Negócio atualizado com sucesso.'); refresh();
  }
  async function remove(deal: Deal) {
    if (!window.confirm(`Excluir o negócio “${deal.title}”?`)) return;
    setNotice(''); setError('');
    try { await api(`/deals/${deal.id}`, { method: 'DELETE' }); setNotice('Negócio excluído com sucesso.'); refresh(); } catch (e) { setError((e as Error).message); }
  }
  return <><Heading eyebrow="COMERCIAL" title="Negócios" detail="Organize oportunidades em todas as etapas da venda." action={<button type="button" className="button primary" onClick={() => setEditing('new')}>+ Novo negócio</button>} /><Notice message={notice} clear={() => setNotice('')} /><Notice message={error} error clear={() => setError('')} />
    <section className="panel"><div className="toolbar deal-toolbar"><label className="search-field">Buscar negócios<input name="search" type="search" placeholder="Buscar por título" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label><label>Etapa<select name="stageFilter" value={stage} onChange={e => { setStage(e.target.value); setPage(1); }}><option value="">Todas as etapas</option>{stages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label><label>Cliente<select name="clientFilter" value={clientId} onChange={e => { setParams(e.target.value ? { clientId: e.target.value } : {}); setPage(1); }}><option value="">Todos os clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><span className="toolbar-total">{results?.pagination.total ?? '—'} negócios</span></div>
      {loading ? <div className="empty">Carregando negócios...</div> : error ? <div className="empty">Não foi possível carregar os negócios.</div> : results && (results.data.length ? <><div className="table-wrap"><table><thead><tr><th>Negócio</th><th>Cliente</th><th>Valor</th><th>Etapa</th><th className="actions-col">Ações</th></tr></thead><tbody>{results.data.map(deal => <tr key={deal.id} data-testid="deal-row" data-id={deal.id}><td data-label="Negócio"><strong>{deal.title}</strong><small>Criado em {date(deal.createdAt)}</small></td><td data-label="Cliente">{clients.find(c => c.id === deal.clientId)?.name || `Cliente #${deal.clientId}`}</td><td data-label="Valor" className="amount">{money(deal.valueInCents)}</td><td data-label="Etapa"><span className={`badge ${deal.stage}`}>{stageName(deal.stage)}</span></td><td data-label="Ações"><div className="row-actions"><button type="button" className="text-button" onClick={() => setEditing(deal)}>Editar</button><button type="button" className="text-button danger" onClick={() => remove(deal)}>Excluir</button></div></td></tr>)}</tbody></table></div><Pagination pagination={results.pagination} setPage={setPage} /></> : <div className="empty">Nenhum negócio encontrado.{search || stage || clientId ? ' Ajuste os filtros.' : ' Cadastre o primeiro negócio.'}</div>)}
    </section>{editing && <Modal title={editing === 'new' ? 'Novo negócio' : 'Editar negócio'} onClose={() => setEditing(null)}><DealForm initial={editing === 'new' ? null : editing} clients={clients} onSave={save} onCancel={() => setEditing(null)} /></Modal>}</>;
}

async function allDeals() {
  const first = await api<Page<Deal>>('/deals?pageSize=50');
  const rest = await Promise.all(Array.from({ length: first.pagination.totalPages - 1 }, (_, i) => api<Page<Deal>>(`/deals?pageSize=50&page=${i + 2}`)));
  return [first, ...rest].flatMap(p => p.data);
}
function Pipeline() {
  const [deals, setDeals] = React.useState<Deal[] | null>(null);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [over, setOver] = React.useState<Stage | null>(null);
  React.useEffect(() => { Promise.all([allDeals(), api<Page<Client>>('/clients?pageSize=50')]).then(([d, c]) => { setDeals(d); setClients(c.data); }).catch(e => setError(e.message)); }, []);
  async function changeStage(dealId: number, stage: Stage) {
    const deal = deals?.find(d => d.id === dealId);
    if (!deal || deal.stage === stage) return;
    setError(''); setNotice('');
    try {
      const updated = await api<Deal>(`/deals/${dealId}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
      setDeals(current => current?.map(d => d.id === dealId ? updated : d) || null);
      setNotice(`“${deal.title}” movido para ${stageName(stage)}.`);
    } catch (e) { setError((e as Error).message); }
  }
  return <><Heading eyebrow="COMERCIAL" title="Pipeline" detail="Acompanhe cada oportunidade. Arraste cartões entre as colunas ou altere a etapa pelo seletor." action={<Link className="button primary" to="/negocios">Ver negócios</Link>} /><Notice message={notice} clear={() => setNotice('')} /><Notice message={error} error clear={() => setError('')} />
    {!deals && !error ? <div className="panel empty">Carregando pipeline...</div> : deals && <div className="pipeline">{stages.map(s => { const items = deals.filter(d => d.stage === s.value); return <section key={s.value} className={`pipeline-column ${over === s.value ? 'drop-over' : ''}`} aria-label={s.label} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(s.value); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(null); }} onDrop={event => { event.preventDefault(); const dealId = Number(event.dataTransfer.getData('text/plain')) || dragging; setOver(null); setDragging(null); if (dealId) void changeStage(dealId, s.value); }}><div className="column-header"><div><h2>{s.label}</h2><span>{items.length} {items.length === 1 ? 'negócio' : 'negócios'}</span></div><strong>{money(items.reduce((sum, d) => sum + d.valueInCents, 0))}</strong></div><div className="column-body">{items.length ? items.map(deal => <article className="deal-card" data-testid="deal-card" data-id={deal.id} key={deal.id} draggable onDragStart={event => { event.dataTransfer.setData('text/plain', String(deal.id)); event.dataTransfer.effectAllowed = 'move'; setDragging(deal.id); }} onDragEnd={() => { setDragging(null); setOver(null); }}><span className="card-grip" aria-hidden="true">⋮⋮</span><h3>{deal.title}</h3><p>{clients.find(c => c.id === deal.clientId)?.name || `Cliente #${deal.clientId}`}</p><strong>{money(deal.valueInCents)}</strong><label>Etapa<select name={`stage-${deal.id}`} aria-label={`Etapa de ${deal.title}`} value={deal.stage} onChange={e => void changeStage(deal.id, e.target.value as Stage)}>{stages.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></article>) : <div className="column-empty">Nenhum negócio nesta etapa</div>}</div></section>; })}</div>}
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><Layout /></BrowserRouter></React.StrictMode>);
