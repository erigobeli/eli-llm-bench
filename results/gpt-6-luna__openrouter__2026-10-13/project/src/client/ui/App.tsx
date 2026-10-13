import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { api, money, stageLabels, stageOrder, type Client, type Dashboard, type Deal, type Page, type Stage } from './api';

type Toast = { kind: 'success' | 'error'; message: string } | null;
const pageSize = 4;

function useToast() {
  const [toast, setToast] = useState<Toast>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return { toast, setToast };
}

function Shell({ children, toast }: { children: ReactNode; toast: Toast }) {
  const links = [
    { to: '/', label: 'Visão geral', icon: '◫', end: true },
    { to: '/clientes', label: 'Clientes', icon: '♙' },
    { to: '/negocios', label: 'Negócios', icon: '▤' },
    { to: '/pipeline', label: 'Pipeline', icon: '⇥' },
  ];
  return <div className="app-shell">
    <header className="topbar">
      <NavLink to="/" className="brand"><span className="brand-mark">C</span><span>CRMBench Modelo</span></NavLink>
      <span className="topbar-caption">Gestão comercial</span>
    </header>
    <div className="shell-body">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="nav-caption">ESPAÇO DE TRABALHO</div>
        <nav>{links.map(link => <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="nav-icon" aria-hidden="true">{link.icon}</span>{link.label}
        </NavLink>)}</nav>
        <div className="sidebar-footer"><span className="status-dot" /> Dados locais</div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
    {toast && <div className={`toast ${toast.kind}`} role="status">{toast.message}</div>}
  </div>;
}

function PageHeader({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action}</div>;
}

function Loading() { return <div className="state-message" role="status">Carregando…</div>; }
function ErrorState({ message }: { message: string }) { return <div className="state-message error-text" role="alert">{message}</div>; }

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return <div className="pagination">
    <span className="pagination-summary">Página {page} de {Math.max(1, totalPages)}</span>
    <div className="pagination-actions">
      <button className="button secondary small" type="button" aria-label="Anterior" onClick={() => onChange(page - 1)} disabled={page <= 1}>Anterior</button>
      <button className="button secondary small" type="button" aria-label="Próxima" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>Próxima</button>
    </div>
  </div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}>×</button></div>
      {children}
    </section>
  </div>;
}

function ClientForm({ initial, onSave, onCancel }: { initial?: Client; onSave: (values: { name: string; email: string; company: string | null }) => Promise<void>; onCancel: () => void }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const company = String(form.get('company') ?? '').trim();
    if (name.length < 2 || name.length > 80) { setError('O nome deve ter entre 2 e 80 caracteres.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Informe um e-mail válido.'); return; }
    setSaving(true);
    try { await onSave({ name, email, company: company || null }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  };
  return <form className="form" onSubmit={submit}>
    <label>Nome completo<input name="name" autoFocus required minLength={2} maxLength={80} defaultValue={initial?.name ?? ''} /></label>
    <label>E-mail<input name="email" type="email" required defaultValue={initial?.email ?? ''} /></label>
    <label>Empresa <span className="optional">Opcional</span><input name="company" maxLength={120} defaultValue={initial?.company ?? ''} /></label>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar cliente'}</button></div>
  </form>;
}

function DealForm({ initial, clients, onSave, onCancel }: { initial?: Deal; clients: Client[]; onSave: (values: { title: string; valueInCents: number; clientId: number; stage: Stage }) => Promise<void>; onCancel: () => void }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const valueText = String(form.get('value') ?? '').replace(',', '.');
    const amount = Number(valueText);
    const clientId = Number(form.get('clientId'));
    const stage = String(form.get('stage')) as Stage;
    if (title.length < 2 || title.length > 120) { setError('O título deve ter entre 2 e 120 caracteres.'); return; }
    if (!Number.isFinite(amount) || amount < 0 || !clients.some(client => client.id === clientId)) { setError('Informe um valor válido e selecione um cliente.'); return; }
    setSaving(true);
    try { await onSave({ title, valueInCents: Math.round(amount * 100), clientId, stage }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  };
  return <form className="form" onSubmit={submit}>
    <label>Nome do negócio<input name="title" autoFocus required minLength={2} maxLength={120} defaultValue={initial?.title ?? ''} /></label>
    <div className="form-row">
      <label>Valor (R$)<input name="value" type="number" min="0" step="0.01" required defaultValue={initial ? (initial.valueInCents / 100).toFixed(2) : ''} /></label>
      <label>Etapa<select name="stage" defaultValue={initial?.stage ?? 'new'}>{stageOrder.map(stage => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label>
    </div>
    <label>Cliente<select name="clientId" defaultValue={initial?.clientId ?? ''} required><option value="" disabled>Selecione um cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar negócio'}</button></div>
  </form>;
}

function ClientsPage({ notify }: { notify: (toast: Toast) => void }) {
  const [result, setResult] = useState<Page<Client> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const [related, setRelated] = useState<{ client: Client; deals: Deal[]; error?: string } | null>(null);
  const load = useCallback(() => {
    setBusy(true); setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    api<Page<Client>>(`/api/clients?${params}`).then(setResult).catch(cause => setError(cause.message)).finally(() => setBusy(false));
  }, [page, search, refresh]);
  useEffect(load, [load]);
  const save = async (values: { name: string; email: string; company: string | null }) => {
    if (editing === undefined) return;
    await api<Client>(editing ? `/api/clients/${editing.id}` : '/api/clients', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(values) });
    setEditing(undefined); setRefresh(value => value + 1); notify({ kind: 'success', message: editing ? 'Cliente atualizado.' : 'Cliente criado.' });
  };
  const remove = async (client: Client) => {
    if (!window.confirm(`Excluir o cliente “${client.name}”? Esta ação não pode ser desfeita.`)) return;
    try { await api(`/api/clients/${client.id}`, { method: 'DELETE' }); notify({ kind: 'success', message: 'Cliente excluído.' }); setRefresh(value => value + 1); }
    catch (cause) { notify({ kind: 'error', message: cause instanceof Error ? cause.message : 'Não foi possível excluir o cliente.' }); }
  };
  const showDeals = async (client: Client) => {
    try {
      const response = await api<Page<Deal>>(`/api/deals?clientId=${client.id}&pageSize=50`);
      setRelated({ client, deals: response.data });
    } catch (cause) { setRelated({ client, deals: [], error: cause instanceof Error ? cause.message : 'Não foi possível carregar os negócios.' }); }
  };
  return <>
    <PageHeader eyebrow="RELACIONAMENTO" title="Clientes" detail="Cadastre e acompanhe seus relacionamentos comerciais." action={<button className="button primary" onClick={() => setEditing(null)}>＋ <span>Novo cliente</span></button>} />
    <section className="panel">
      <div className="panel-toolbar"><div className="record-count">{result?.pagination.total ?? '—'} clientes</div><label className="search-box"><span aria-hidden="true">⌕</span><input name="search" placeholder="Buscar clientes…" aria-label="Buscar clientes" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label></div>
      {busy ? <Loading /> : error ? <ErrorState message={error} /> : result?.data.length ? <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Empresa</th><th>E-mail</th><th className="actions-heading">Ações</th></tr></thead><tbody>{result.data.map(client => <tr key={client.id} data-testid="client-row" data-id={client.id}>
        <td data-label="Nome"><strong>{client.name}</strong></td><td data-label="Empresa">{client.company || '—'}</td><td data-label="E-mail" className="muted">{client.email}</td>
        <td data-label="Ações"><div className="row-actions"><button className="text-button" onClick={() => void showDeals(client)}>Ver negócios</button><button className="icon-button" aria-label={`Editar ${client.name}`} onClick={() => setEditing(client)}>Editar</button><button className="icon-button danger-action" aria-label={`Excluir ${client.name}`} onClick={() => void remove(client)}>Excluir</button></div></td>
      </tr>)}</tbody></table></div> : <div className="empty-state"><strong>Nenhum cliente encontrado</strong><span>{search ? 'Tente alterar a busca.' : 'Cadastre seu primeiro cliente para começar.'}</span></div>}
      {result && <Pager page={page} totalPages={result.pagination.totalPages} onChange={setPage} />}
    </section>
    {editing !== undefined && <Modal title={editing ? 'Editar cliente' : 'Novo cliente'} onClose={() => setEditing(undefined)}><ClientForm initial={editing ?? undefined} onSave={save} onCancel={() => setEditing(undefined)} /></Modal>}
    {related && <Modal title={`Negócios de ${related.client.name}`} onClose={() => setRelated(null)}>{related.error ? <div className="state-message error-text">{related.error}</div> : related.deals.length ? <div className="related-list">{related.deals.map(deal => <div className="related-item" key={deal.id}><div><strong>{deal.title}</strong><span>{stageLabels[deal.stage]}</span></div><b>{money(deal.valueInCents)}</b></div>)}</div> : <div className="empty-state"><strong>Sem negócios relacionados</strong></div>}<div className="form-actions"><button className="button secondary" onClick={() => setRelated(null)}>Fechar</button></div></Modal>}
  </>;
}

function DealsPage({ notify }: { notify: (toast: Toast) => void }) {
  const [result, setResult] = useState<Page<Deal> | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [clientId, setClientId] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<Deal | null | undefined>(undefined);
  useEffect(() => { api<Page<Client>>('/api/clients?pageSize=50').then(response => setClients(response.data)).catch(() => setClients([])); }, []);
  const load = useCallback(() => {
    setBusy(true); setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    if (stage) params.set('stage', stage);
    if (clientId) params.set('clientId', clientId);
    api<Page<Deal>>(`/api/deals?${params}`).then(setResult).catch(cause => setError(cause.message)).finally(() => setBusy(false));
  }, [page, search, stage, clientId, refresh]);
  useEffect(load, [load]);
  const save = async (values: { title: string; valueInCents: number; clientId: number; stage: Stage }) => {
    if (editing === undefined) return;
    await api<Deal>(editing ? `/api/deals/${editing.id}` : '/api/deals', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(values) });
    setEditing(undefined); setRefresh(value => value + 1); notify({ kind: 'success', message: editing ? 'Negócio atualizado.' : 'Negócio criado.' });
  };
  const remove = async (deal: Deal) => {
    if (!window.confirm(`Excluir o negócio “${deal.title}”? Esta ação não pode ser desfeita.`)) return;
    try { await api(`/api/deals/${deal.id}`, { method: 'DELETE' }); notify({ kind: 'success', message: 'Negócio excluído.' }); setRefresh(value => value + 1); }
    catch (cause) { notify({ kind: 'error', message: cause instanceof Error ? cause.message : 'Não foi possível excluir o negócio.' }); }
  };
  const names = new Map(clients.map(client => [client.id, client.name]));
  return <>
    <PageHeader eyebrow="VENDAS" title="Negócios" detail="Acompanhe oportunidades, valores e próximos passos." action={<button className="button primary" onClick={() => setEditing(null)}>＋ <span>Novo negócio</span></button>} />
    <section className="panel">
      <div className="filters-toolbar">
        <label className="search-box"><span aria-hidden="true">⌕</span><input name="search" placeholder="Buscar negócios…" aria-label="Buscar negócios" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
        <label className="filter-select"><span>Etapa</span><select name="stage" aria-label="Filtrar por etapa" value={stage} onChange={event => { setStage(event.target.value); setPage(1); }}><option value="">Todas</option>{stageOrder.map(item => <option key={item} value={item}>{stageLabels[item]}</option>)}</select></label>
        <label className="filter-select"><span>Cliente</span><select name="clientId" aria-label="Filtrar por cliente" value={clientId} onChange={event => { setClientId(event.target.value); setPage(1); }}><option value="">Todos</option>{clients.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
      </div>
      {busy ? <Loading /> : error ? <ErrorState message={error} /> : result?.data.length ? <div className="table-wrap"><table><thead><tr><th>Negócio</th><th>Cliente</th><th>Etapa</th><th>Valor</th><th className="actions-heading">Ações</th></tr></thead><tbody>{result.data.map(deal => <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
        <td data-label="Negócio"><strong>{deal.title}</strong></td><td data-label="Cliente">{names.get(deal.clientId) ?? '—'}</td><td data-label="Etapa"><span className={`stage-badge stage-${deal.stage}`}>{stageLabels[deal.stage]}</span></td><td data-label="Valor" className="amount">{money(deal.valueInCents)}</td>
        <td data-label="Ações"><div className="row-actions"><button className="icon-button" aria-label={`Editar ${deal.title}`} onClick={() => setEditing(deal)}>Editar</button><button className="icon-button danger-action" aria-label={`Excluir ${deal.title}`} onClick={() => void remove(deal)}>Excluir</button></div></td>
      </tr>)}</tbody></table></div> : <div className="empty-state"><strong>Nenhum negócio encontrado</strong><span>{search || stage || clientId ? 'Ajuste os filtros e tente novamente.' : 'Cadastre um negócio para visualizar oportunidades.'}</span></div>}
      {result && <Pager page={page} totalPages={result.pagination.totalPages} onChange={setPage} />}
    </section>
    {editing !== undefined && <Modal title={editing ? 'Editar negócio' : 'Novo negócio'} onClose={() => setEditing(undefined)}>{clients.length ? <DealForm initial={editing ?? undefined} clients={clients} onSave={save} onCancel={() => setEditing(undefined)} /> : <div className="empty-state"><strong>Cadastre um cliente antes de criar negócios.</strong></div>}</Modal>}
  </>;
}

function DashboardPage() {
  const [metrics, setMetrics] = useState<Dashboard | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<Dashboard>('/api/dashboard'), api<Page<Deal>>('/api/deals?pageSize=4'), api<Page<Client>>('/api/clients?pageSize=50')])
      .then(([summary, dealList, clientList]) => { setMetrics(summary); setDeals(dealList.data); setClients(clientList.data); })
      .catch(cause => setError(cause.message));
  }, []);
  const names = new Map(clients.map(client => [client.id, client.name]));
  return <>
    <PageHeader eyebrow="RESUMO" title="Visão geral" detail="Indicadores e atividades da sua operação comercial." />
    {error ? <ErrorState message={error} /> : !metrics ? <Loading /> : <>
      <div className="metrics-grid">
        <article className="metric-card" data-testid="metric" data-metric="totalClients"><span className="metric-label">Total de clientes</span><strong>{metrics.totalClients}</strong><span className="metric-note">Relacionamentos cadastrados</span></article>
        <article className="metric-card" data-testid="metric" data-metric="openDeals"><span className="metric-label">Negócios abertos</span><strong>{metrics.openDeals}</strong><span className="metric-note">Oportunidades em andamento</span></article>
        <article className="metric-card" data-testid="metric" data-metric="pipelineValueInCents"><span className="metric-label">Valor do pipeline</span><strong className="metric-money">{money(metrics.pipelineValueInCents)}</strong><span className="metric-note">Negócios ainda não fechados</span></article>
      </div>
      <section className="panel overview-panel"><div className="section-heading"><div><h2>Negócios recentes</h2><p>Atividade comercial cadastrada</p></div><NavLink className="text-link" to="/negocios">Ver todos <span aria-hidden="true">→</span></NavLink></div>
        {deals.length ? <div className="table-wrap"><table><thead><tr><th>Negócio</th><th>Cliente</th><th>Etapa</th><th>Valor</th></tr></thead><tbody>{deals.map(deal => <tr key={deal.id}><td data-label="Negócio"><strong>{deal.title}</strong></td><td data-label="Cliente">{names.get(deal.clientId) ?? '—'}</td><td data-label="Etapa"><span className={`stage-badge stage-${deal.stage}`}>{stageLabels[deal.stage]}</span></td><td data-label="Valor" className="amount">{money(deal.valueInCents)}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum negócio cadastrado.</div>}
      </section>
    </>}
  </>;
}

function PipelinePage({ notify }: { notify: (toast: Toast) => void }) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [dealPage, clientPage] = await Promise.all([api<Page<Deal>>('/api/deals?pageSize=50'), api<Page<Client>>('/api/clients?pageSize=50')]);
      setDeals(dealPage.data); setClients(clientPage.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o pipeline.'); }
    finally { setLoading(false); }
  }, [refresh]);
  useEffect(() => { void reload(); }, [reload]);
  const names = new Map(clients.map(client => [client.id, client.name]));
  const move = async (deal: Deal, stage: Stage) => {
    if (deal.stage === stage || saving === deal.id) return;
    setSaving(deal.id);
    try {
      const updated = await api<Deal>(`/api/deals/${deal.id}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
      setDeals(current => current.map(item => item.id === deal.id ? updated : item));
      notify({ kind: 'success', message: `Negócio movido para ${stageLabels[stage]}.` });
    } catch (cause) { notify({ kind: 'error', message: cause instanceof Error ? cause.message : 'Não foi possível alterar a etapa.' }); }
    finally { setSaving(null); setDragging(null); }
  };
  const drop = (stage: Stage, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData('text/plain')) || dragging;
    const deal = deals.find(item => item.id === id);
    if (deal) void move(deal, stage);
  };
  return <>
    <PageHeader eyebrow="ACOMPANHAMENTO" title="Pipeline" detail="Arraste os cartões entre etapas para atualizar os negócios." />
    {loading ? <Loading /> : error ? <ErrorState message={error} /> : <div className="pipeline-grid">{stageOrder.map(stage => {
      const items = deals.filter(deal => deal.stage === stage);
      const sum = items.reduce((total, deal) => total + deal.valueInCents, 0);
      return <section className={`pipeline-column column-${stage}`} key={stage} onDragOver={event => event.preventDefault()} onDrop={event => drop(stage, event)} aria-label={`Coluna ${stageLabels[stage]}`}>
        <header className="column-header"><div><span className="column-dot" /><h2>{stageLabels[stage]}</h2><span className="column-count">{items.length}</span></div><strong>{money(sum)}</strong></header>
        <div className="column-cards">{items.length ? items.map(deal => <article className={`deal-card${dragging === deal.id ? ' is-dragging' : ''}`} key={deal.id} data-testid="deal-card" data-id={deal.id} draggable onDragStart={event => { setDragging(deal.id); event.dataTransfer.setData('text/plain', String(deal.id)); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDragging(null)}>
          <div className="deal-card-title"><span className="drag-handle" aria-hidden="true">⠿</span><strong>{deal.title}</strong></div>
          <span className="deal-card-client">{names.get(deal.clientId) ?? 'Cliente não encontrado'}</span>
          <div className="deal-card-footer"><b>{money(deal.valueInCents)}</b><label className="sr-only" htmlFor={`stage-${deal.id}`}>Etapa de ${deal.title}</label><select id={`stage-${deal.id}`} aria-label={`Alterar etapa de ${deal.title}`} value={deal.stage} disabled={saving === deal.id} onChange={event => void move(deal, event.target.value as Stage)}>{stageOrder.map(item => <option key={item} value={item}>{stageLabels[item]}</option>)}</select></div>
        </article>) : <div className="column-empty">Solte um negócio aqui</div>}</div>
      </section>;
    })}</div>}
    {!loading && !error && !deals.length && <div className="empty-state pipeline-empty"><strong>O pipeline está vazio</strong><span>Crie um negócio para começar a acompanhar suas oportunidades.</span></div>}
  </>;
}

export default function App() {
  const { toast, setToast } = useToast();
  const notify = (next: Toast) => setToast(next);
  const navigate = useNavigate();
  useEffect(() => { document.title = 'CRMBench Modelo'; }, []);
  return <Shell toast={toast}><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/clientes" element={<ClientsPage notify={notify} />} />
    <Route path="/negocios" element={<DealsPage notify={notify} />} />
    <Route path="/pipeline" element={<PipelinePage notify={notify} />} />
    <Route path="*" element={<section className="not-found"><h1>Página não encontrada</h1><button className="button primary" onClick={() => navigate('/')}>Voltar ao início</button></section>} />
  </Routes></Shell>;
}
