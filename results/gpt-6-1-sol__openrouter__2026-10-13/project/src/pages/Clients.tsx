import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, BriefcaseBusiness, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, useDebounced, useResource } from '../api';
import { ClientForm, DeleteDialog, Empty, Loading, LoadError, PageHeader, Pagination, SearchField } from '../components';
import type { Client, Page } from '../../shared/types';

export default function Clients() {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Client | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const resource = useResource(signal => api<Page<Client>>(`/clients?page=${page}&pageSize=4&search=${encodeURIComponent(debounced)}`, { signal }), [page, debounced]);
  useEffect(() => { if (resource.data && page > 1 && page > resource.data.pagination.totalPages) setPage(Math.max(1, resource.data.pagination.totalPages)); }, [resource.data, page]);
  function saved() { setForm(null); resource.refresh(); }
  return <>
    <PageHeader title="Clientes" description="Organize seus contatos e acompanhe cada relacionamento." action={<button className="button primary" onClick={() => setForm('new')}><Plus size={17} />Novo cliente</button>} />
    <section className="panel"><div className="toolbar"><SearchField value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Buscar nome, e-mail ou empresa" /><span className="result-count"><Users size={16} />{resource.data?.pagination.total ?? '—'} clientes</span></div>
      {resource.loading ? <Loading /> : resource.error ? <LoadError error={resource.error} retry={resource.refresh} /> : resource.data?.data.length ? <table className="data-table client-table"><thead><tr><th>Cliente</th><th>E-mail</th><th>Empresa</th><th className="actions-heading">Ações</th></tr></thead><tbody>{resource.data.data.map(client => <tr key={client.id} data-testid="client-row" data-id={client.id}>
        <td data-label="Cliente"><div className="identity"><span className="avatar">{client.name.charAt(0).toUpperCase()}</span><strong>{client.name}</strong></div></td><td data-label="E-mail"><a className="email" href={`mailto:${client.email}`}>{client.email}</a></td><td data-label="Empresa">{client.company || <span className="muted">Não informada</span>}</td>
        <td data-label="Ações"><div className="row-actions"><Link className="button text small related-link" to={`/negocios?clientId=${client.id}`} aria-label={`Ver negócios de ${client.name}`}><BriefcaseBusiness size={15} />Ver negócios</Link><button className="icon-button" aria-label={`Editar cliente ${client.name}`} title="Editar cliente" onClick={() => setForm(client)}><Pencil size={16} /></button><button className="icon-button delete-action" aria-label={`Excluir cliente ${client.name}`} title="Excluir cliente" onClick={() => setDeleting(client)}><Trash2 size={16} /></button></div></td>
      </tr>)}</tbody></table> : <Empty title="Nenhum cliente encontrado" description={search ? 'Tente buscar por outro nome, e-mail ou empresa.' : 'Adicione um cliente para começar seu cadastro.'} />}
      {!resource.loading && !resource.error && resource.data && <Pagination pagination={resource.data.pagination} onPage={setPage} />}
    </section><p className="page-note">Clientes com negócios relacionados não podem ser excluídos.</p>
    {form && <ClientForm client={form === 'new' ? undefined : form} onClose={() => setForm(null)} onSaved={saved} />}
    {deleting && <DeleteDialog kind="clients" id={deleting.id} title={deleting.name} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); resource.refresh(); }} />}
  </>;
}
