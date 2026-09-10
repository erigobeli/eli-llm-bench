import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Stage = 'new' | 'contact' | 'proposal' | 'won';
type Client = { id: number; name: string; email: string; company: string | null; createdAt: string; updatedAt: string };
type Deal = { id: number; title: string; valueInCents: number; clientId: number; stage: Stage; createdAt: string; updatedAt: string };
type Page<T> = { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
const stageLabels: Record<Stage, string> = { new: 'Novo', contact: 'Em contato', proposal: 'Proposta', won: 'Fechado' };
const formatMoney = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) {
    const result = await response.json().catch(() => ({ error: 'Não foi possível concluir a operação.' }));
    throw new Error(result.error);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const path = window.location.pathname;
  const links = [['/', 'Visão geral'], ['/clientes', 'Clientes'], ['/negocios', 'Negócios'], ['/pipeline', 'Pipeline']];
  return <div className="shell"><aside className="sidebar"><a className="brand" href="/">CRMBench Modelo</a><nav>{links.map(([href, label]) => <a key={href} href={href} className={path === href ? 'active' : ''}>{label}</a>)}</nav><div className="sidebar-note">Gestão comercial</div></aside><main>{children}</main></div>;
}

function Notice({ error, success }: { error: string; success: string }) {
  return <>{error && <p className="notice error" role="alert">{error}</p>}{success && <p className="notice success" role="status">{success}</p>}</>;
}

function Dashboard() {
  const [metrics, setMetrics] = useState<{ totalClients: number; openDeals: number; pipelineValueInCents: number }>();
  const [error, setError] = useState('');
  useEffect(() => { api<typeof metrics>('/dashboard').then(setMetrics).catch((e: Error) => setError(e.message)); }, []);
  return <Layout><PageHead title="Visão geral" subtitle="Acompanhe a operação comercial em um só lugar." />
    {error ? <Notice error={error} success="" /> : !metrics ? <p className="loading">Carregando indicadores...</p> : <section className="metrics">
      <Metric label="Clientes" value={String(metrics.totalClients)} name="clients" />
      <Metric label="Negócios abertos" value={String(metrics.openDeals)} name="open-deals" />
      <Metric label="Valor no pipeline" value={formatMoney(metrics.pipelineValueInCents)} name="pipeline-value" />
    </section>}
    <section className="overview"><h2>Próximos passos</h2><p>Cadastre clientes, acompanhe os negócios e atualize as etapas do pipeline.</p><div><a className="button" href="/clientes">Gerenciar clientes</a><a className="button secondary" href="/pipeline">Ver pipeline</a></div></section>
  </Layout>;
}
function Metric({ label, value, name }: { label: string; value: string; name: string }) { return <article className="metric" data-testid="metric" data-metric={name}><span>{label}</span><strong>{value}</strong></article>; }
function PageHead({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <header className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>; }
function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) { return <div className="pagination"><span>Página {page} de {Math.max(1, totalPages)}</span><button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>Anterior</button><button type="button" onClick={() => onPage(page + 1)} disabled={totalPages === 0 || page >= totalPages}>Próxima</button></div>; }

function Clients() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [query, setQuery] = useState('');
  const [result, setResult] = useState<Page<Client>>(); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const load = () => { setError(''); api<Page<Client>>(`/clients?page=${page}&pageSize=4&search=${encodeURIComponent(query)}`).then(setResult).catch((e: Error) => setError(e.message)); };
  useEffect(load, [page, query]);
  function submitSearch(e: FormEvent) { e.preventDefault(); setPage(1); setQuery(search); }
  async function remove(client: Client) { if (!window.confirm(`Excluir ${client.name}?`)) return; try { await api(`/clients/${client.id}`, { method: 'DELETE' }); setSuccess('Cliente excluído com sucesso.'); load(); } catch (e) { setError((e as Error).message); } }
  return <Layout><PageHead title="Clientes" subtitle="Organize sua base de relacionamentos." action={<button className="button" onClick={() => setEditing('new')}>Novo cliente</button>} /><Notice error={error} success={success} />
    <form className="toolbar" onSubmit={submitSearch}><label>Buscar clientes<input name="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, e-mail ou empresa" /></label><button className="button secondary">Buscar</button></form>
    {editing && <ClientForm client={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSuccess('Cliente salvo com sucesso.'); load(); }} onError={setError} />}
    {!result ? <p className="loading">Carregando clientes...</p> : result.data.length === 0 ? <p className="empty">Nenhum cliente encontrado.</p> : <><div className="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Empresa</th><th>Ações</th></tr></thead><tbody>{result.data.map(client => <tr key={client.id} data-testid="client-row" data-id={client.id}><td>{client.name}</td><td>{client.email}</td><td>{client.company || '—'}</td><td className="actions"><button onClick={() => window.location.href = `/negocios?clientId=${client.id}`}>Ver negócios</button><button onClick={() => setEditing(client)}>Editar</button><button className="danger" onClick={() => remove(client)}>Excluir</button></td></tr>)}</tbody></table></div><Pagination {...result.pagination} onPage={setPage} /></>}
  </Layout>;
}

function ClientForm({ client, onClose, onSaved, onError }: { client?: Client; onClose: () => void; onSaved: () => void; onError: (v: string) => void }) {
  const [name, setName] = useState(client?.name ?? ''); const [email, setEmail] = useState(client?.email ?? ''); const [company, setCompany] = useState(client?.company ?? ''); const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); onError(''); try { await api(client ? `/clients/${client.id}` : '/clients', { method: client ? 'PATCH' : 'POST', body: JSON.stringify({ name, email, company: company || null }) }); onSaved(); } catch (err) { onError((err as Error).message); } finally { setSaving(false); } }
  return <section className="form-panel"><h2>{client ? 'Editar cliente' : 'Novo cliente'}</h2><form onSubmit={submit} className="form-grid"><label>Nome<input name="name" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><label>E-mail<input name="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Empresa<input name="company" value={company} onChange={e => setCompany(e.target.value)} /></label><div className="form-actions"><button className="button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button><button type="button" className="button secondary" onClick={onClose}>Cancelar</button></div></form></section>;
}

function Deals() {
  const suppliedClient = new URLSearchParams(window.location.search).get('clientId') || '';
  const [clients, setClients] = useState<Client[]>([]); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [stage, setStage] = useState(''); const [clientId, setClientId] = useState(suppliedClient);
  const [result, setResult] = useState<Page<Deal>>(); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [editing, setEditing] = useState<Deal | 'new' | null>(null);
  useEffect(() => { api<Page<Client>>('/clients?page=1&pageSize=50').then(v => setClients(v.data)).catch((e: Error) => setError(e.message)); }, []);
  const load = () => { setError(''); const params = new URLSearchParams({ page: String(page), pageSize: '4', search: query }); if (stage) params.set('stage', stage); if (clientId) params.set('clientId', clientId); api<Page<Deal>>(`/deals?${params}`).then(setResult).catch((e: Error) => setError(e.message)); };
  useEffect(load, [page, query, stage, clientId]);
  function submitSearch(e: FormEvent) { e.preventDefault(); setPage(1); setQuery(search); }
  async function remove(deal: Deal) { if (!window.confirm(`Excluir ${deal.title}?`)) return; try { await api(`/deals/${deal.id}`, { method: 'DELETE' }); setSuccess('Negócio excluído com sucesso.'); load(); } catch (e) { setError((e as Error).message); } }
  const clientName = (id: number) => clients.find(c => c.id === id)?.name || `Cliente #${id}`;
  return <Layout><PageHead title="Negócios" subtitle="Acompanhe e mantenha suas oportunidades." action={<button className="button" onClick={() => setEditing('new')}>Novo negócio</button>} /><Notice error={error} success={success} />
    <form className="toolbar filters" onSubmit={submitSearch}><label>Buscar negócios<input name="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Título" /></label><label>Etapa<select name="stage" value={stage} onChange={e => { setPage(1); setStage(e.target.value); }}><option value="">Todas</option>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Cliente<select name="clientId" value={clientId} onChange={e => { setPage(1); setClientId(e.target.value); }}><option value="">Todos</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="button secondary">Buscar</button></form>
    {editing && <DealForm deal={editing === 'new' ? undefined : editing} clients={clients} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSuccess('Negócio salvo com sucesso.'); load(); }} onError={setError} />}
    {!result ? <p className="loading">Carregando negócios...</p> : result.data.length === 0 ? <p className="empty">Nenhum negócio encontrado.</p> : <><div className="table-wrap"><table><thead><tr><th>Negócio</th><th>Cliente</th><th>Etapa</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{result.data.map(deal => <tr key={deal.id} data-testid="deal-row" data-id={deal.id}><td>{deal.title}</td><td>{clientName(deal.clientId)}</td><td><span className={`badge ${deal.stage}`}>{stageLabels[deal.stage]}</span></td><td>{formatMoney(deal.valueInCents)}</td><td className="actions"><button onClick={() => setEditing(deal)}>Editar</button><button className="danger" onClick={() => remove(deal)}>Excluir</button></td></tr>)}</tbody></table></div><Pagination {...result.pagination} onPage={setPage} /></>}
  </Layout>;
}

function DealForm({ deal, clients, onClose, onSaved, onError }: { deal?: Deal; clients: Client[]; onClose: () => void; onSaved: () => void; onError: (v: string) => void }) {
  const [title, setTitle] = useState(deal?.title ?? ''); const [value, setValue] = useState(String((deal?.valueInCents ?? 0) / 100)); const [clientId, setClientId] = useState(String(deal?.clientId ?? clients[0]?.id ?? '')); const [stage, setStage] = useState<Stage>(deal?.stage ?? 'new'); const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); onError(''); const valueInCents = Math.round(Number(value.replace(',', '.')) * 100); try { await api(deal ? `/deals/${deal.id}` : '/deals', { method: deal ? 'PATCH' : 'POST', body: JSON.stringify({ title, valueInCents, clientId: Number(clientId), stage }) }); onSaved(); } catch (err) { onError((err as Error).message); } finally { setSaving(false); } }
  return <section className="form-panel"><h2>{deal ? 'Editar negócio' : 'Novo negócio'}</h2>{clients.length === 0 ? <p className="empty">Cadastre um cliente antes de criar um negócio.</p> : <form onSubmit={submit} className="form-grid"><label>Título<input name="title" required minLength={2} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label><label>Valor (R$)<input name="value" type="number" min="0" step="0.01" required value={value} onChange={e => setValue(e.target.value)} /></label><label>Cliente<select name="clientId" required value={clientId} onChange={e => setClientId(e.target.value)}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Etapa<select name="stage" value={stage} onChange={e => setStage(e.target.value as Stage)}>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="form-actions"><button className="button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button><button type="button" className="button secondary" onClick={onClose}>Cancelar</button></div></form>}</section>;
}

function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(); const [clients, setClients] = useState<Client[]>([]); const [error, setError] = useState(''); const [moving, setMoving] = useState<number>();
  const load = () => { api<Page<Deal>>('/deals?page=1&pageSize=50').then(v => setDeals(v.data)).catch((e: Error) => setError(e.message)); };
  useEffect(() => { load(); api<Page<Client>>('/clients?page=1&pageSize=50').then(v => setClients(v.data)).catch((e: Error) => setError(e.message)); }, []);
  async function move(deal: Deal, stage: Stage) { if (deal.stage === stage) return; setMoving(deal.id); try { await api(`/deals/${deal.id}`, { method: 'PATCH', body: JSON.stringify({ stage }) }); load(); } catch (e) { setError((e as Error).message); } finally { setMoving(undefined); } }
  const clientName = (id: number) => clients.find(c => c.id === id)?.name || `Cliente #${id}`;
  return <Layout><PageHead title="Pipeline" subtitle="Arraste os negócios para avançar as etapas." /><Notice error={error} success="" />{!deals ? <p className="loading">Carregando pipeline...</p> : <div className="pipeline">{(Object.keys(stageLabels) as Stage[]).map(stage => <section className="pipeline-column" key={stage} onDragOver={e => e.preventDefault()} onDrop={e => { const id = Number(e.dataTransfer.getData('deal-id')); const deal = deals.find(item => item.id === id); if (deal) move(deal, stage); }}><h2>{stageLabels[stage]} <span>{deals.filter(d => d.stage === stage).length}</span></h2><div className="cards">{deals.filter(d => d.stage === stage).map(deal => <article className="deal-card" key={deal.id} data-testid="deal-card" data-id={deal.id} draggable onDragStart={e => e.dataTransfer.setData('deal-id', String(deal.id))}><h3>{deal.title}</h3><p>{clientName(deal.clientId)}</p><strong>{formatMoney(deal.valueInCents)}</strong><label>Etapa<select name={`stage-${deal.id}`} aria-label={`Etapa de ${deal.title}`} value={deal.stage} disabled={moving === deal.id} onChange={e => move(deal, e.target.value as Stage)}>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></article>)}</div></section>)}</div>}</Layout>;
}

function App() { const path = window.location.pathname; if (path === '/clientes') return <Clients />; if (path === '/negocios') return <Deals />; if (path === '/pipeline') return <Pipeline />; return <Dashboard />; }
createRoot(document.getElementById('root')!).render(<App />);
