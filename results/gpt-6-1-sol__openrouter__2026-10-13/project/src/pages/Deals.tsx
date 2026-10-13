import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, BriefcaseBusiness, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { allRecords, api, money, useDebounced, useResource } from '../api';
import { DealForm, DeleteDialog, Empty, Loading, LoadError, PageHeader, Pagination, SearchField, StageBadge } from '../components';
import { stages, stageLabels, type Client, type Deal, type Page } from '../../shared/types';

export default function Deals() {
  const [params, setParams] = useSearchParams();
  const clientId = params.get('clientId') || '';
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const debounced = useDebounced(search);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Deal | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const clients = useResource(signal => allRecords<Client>('/clients', signal), []);
  const query = new URLSearchParams({ page: String(page), pageSize: '4', search: debounced });
  if (stage) query.set('stage', stage);
  if (clientId) query.set('clientId', clientId);
  const resource = useResource(signal => api<Page<Deal>>(`/deals?${query}`, { signal }), [page, debounced, stage, clientId]);
  useEffect(() => { if (resource.data && page > 1 && page > resource.data.pagination.totalPages) setPage(Math.max(1, resource.data.pagination.totalPages)); }, [resource.data, page]);
  const name = (id: number) => clients.data?.find(client => client.id === id)?.name || `Cliente #${id}`;
  function changeClient(value: string) { setPage(1); setParams(value ? { clientId: value } : {}); }
  function clearFilters() { setSearch(''); setStage(''); changeClient(''); }
  return <>
    <PageHeader title="Negócios" description="Gerencie oportunidades, valores e etapas da sua operação." action={<button className="button primary" onClick={() => setForm('new')} disabled={clients.loading || !!clients.error}><Plus size={17} />Novo negócio</button>} />
    {clients.error && <LoadError error={clients.error} retry={clients.refresh} />}
    <section className="panel"><div className="toolbar deals-toolbar"><SearchField value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Buscar pelo título do negócio" /><div className="filter-field"><label htmlFor="stage-filter">Etapa</label><select id="stage-filter" name="stage" value={stage} onChange={event => { setStage(event.target.value); setPage(1); }}><option value="">Todas as etapas</option>{stages.map(item => <option key={item} value={item}>{stageLabels[item]}</option>)}</select></div><div className="filter-field"><label htmlFor="client-filter">Cliente</label><select id="client-filter" name="clientId" value={clientId} onChange={event => changeClient(event.target.value)}><option value="">Todos os clientes</option>{clients.data?.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div></div>
      <div className="list-meta"><span><BriefcaseBusiness size={15} />{resource.data?.pagination.total ?? '—'} negócios</span>{(search || stage || clientId) && <button className="button text small" onClick={clearFilters}><X size={14} />Limpar filtros</button>}</div>
      {resource.loading ? <Loading /> : resource.error ? <LoadError error={resource.error} retry={resource.refresh} /> : resource.data?.data.length ? <table className="data-table deal-table"><thead><tr><th>Negócio</th><th>Cliente</th><th>Valor</th><th>Etapa</th><th className="actions-heading">Ações</th></tr></thead><tbody>{resource.data.data.map(deal => <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
        <td data-label="Negócio"><strong>{deal.title}</strong></td><td data-label="Cliente">{name(deal.clientId)}</td><td data-label="Valor" className="money">{money(deal.valueInCents)}</td><td data-label="Etapa"><StageBadge stage={deal.stage} /></td><td data-label="Ações"><div className="row-actions"><button className="icon-button" aria-label={`Editar negócio ${deal.title}`} title="Editar negócio" onClick={() => setForm(deal)}><Pencil size={16} /></button><button className="icon-button delete-action" aria-label={`Excluir negócio ${deal.title}`} title="Excluir negócio" onClick={() => setDeleting(deal)}><Trash2 size={16} /></button></div></td>
      </tr>)}</tbody></table> : <Empty title="Nenhum negócio encontrado" description={search || stage || clientId ? 'Ajuste os filtros para encontrar outros negócios.' : 'Crie um negócio e comece a acompanhar sua evolução.'} />}
      {!resource.loading && !resource.error && resource.data && <Pagination pagination={resource.data.pagination} onPage={setPage} />}
    </section>
    {form && <DealForm deal={form === 'new' ? undefined : form} clients={clients.data || []} initialClientId={clientId} onClose={() => setForm(null)} onSaved={() => { setForm(null); resource.refresh(); }} />}
    {deleting && <DeleteDialog kind="deals" id={deleting.id} title={deleting.title} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); resource.refresh(); }} />}
  </>;
}
