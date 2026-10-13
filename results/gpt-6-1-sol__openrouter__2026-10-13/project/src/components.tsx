import { createContext, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, LoaderCircle, Search, Trash2, X } from 'lucide-react';
import { api, message } from './api';
import { stages, stageLabels, type Client, type Deal, type Page, type Stage } from '../shared/types';

export const FeedbackContext = createContext<(text: string, kind?: 'success' | 'error') => void>(() => {});
export const useFeedback = () => useContext(FeedbackContext);
export function Notice({ text, kind = 'error', onClose }: { text: string; kind?: 'success' | 'error'; onClose?: () => void }) {
  if (!text) return null;
  return <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
    {kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
    <span>{text}</span>{onClose && <button className="icon-button" aria-label="Fechar mensagem" onClick={onClose}><X size={16} /></button>}
  </div>;
}
export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}
export function Loading({ text = 'Carregando registros…' }: { text?: string }) {
  return <div className="state" role="status"><LoaderCircle className="spin" size={22} /><span>{text}</span></div>;
}
export function Empty({ title = 'Nenhum registro encontrado', description = 'Ajuste a busca ou adicione um novo registro.' }: { title?: string; description?: string }) {
  return <div className="state empty"><Inbox size={30} /><strong>{title}</strong><span>{description}</span></div>;
}
export function LoadError({ error, retry }: { error: string; retry: () => void }) {
  return <div className="load-error"><Notice text={error} /><button className="button" onClick={retry}>Tentar novamente</button></div>;
}
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const id = useId();
  return <div className="search-field"><label className="sr-only" htmlFor={id}>Buscar</label><Search size={17} /><input id={id} name="search" type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
export function Pagination({ pagination, onPage }: { pagination: Page<unknown>['pagination']; onPage: (page: number) => void }) {
  const { page, pageSize, total, totalPages } = pagination;
  return <footer className="pagination"><span>{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total} registros` : '0 registros'}<span className="per-page"> · 4 por página</span></span>
    <div><button className="button small" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Anterior"><ChevronLeft size={15} /><span>Anterior</span></button><span className="page-number">{page} / {Math.max(totalPages, 1)}</span><button className="button small" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Próxima"><span>Próxima</span><ChevronRight size={15} /></button></div>
  </footer>;
}
export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`stage-badge ${stage}`}><span />{stageLabels[stage]}</span>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previouslyFocused?.focus(); };
  }, []);
  return <dialog ref={dialog} className="modal" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target === dialog.current) {
      const bounds = dialog.current!.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }
  }}><div className="modal-heading"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
export function ClientForm({ client, onClose, onSaved }: { client?: Client; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const notify = useFeedback();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const company = String(form.get('company') || '').trim();
    if (name.length < 2 || name.length > 80) { setError('Nome deve ter de 2 a 80 caracteres.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Informe um e-mail válido.'); return; }
    setSaving(true);
    try {
      await api(`/clients${client ? `/${client.id}` : ''}`, { method: client ? 'PATCH' : 'POST', body: JSON.stringify({ name, email, company: company || null }) });
      notify(client ? 'Cliente atualizado com sucesso.' : 'Cliente criado com sucesso.'); onSaved();
    } catch (reason) { setError(message(reason)); } finally { setSaving(false); }
  }
  return <Modal title={client ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}><form onSubmit={submit} noValidate>
    <div className="form-body"><p className="form-hint">Campos com * são obrigatórios.</p><Notice text={error} />
      <label htmlFor="client-name">Nome *</label><input id="client-name" name="name" required maxLength={80} defaultValue={client?.name} autoFocus placeholder="Nome do cliente" />
      <label htmlFor="client-email">E-mail *</label><input id="client-email" name="email" required type="email" defaultValue={client?.email} placeholder="nome@empresa.com.br" />
      <label htmlFor="client-company">Empresa</label><input id="client-company" name="company" defaultValue={client?.company || ''} placeholder="Nome da empresa (opcional)" />
    </div><div className="modal-actions"><button type="button" className="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar cliente'}</button></div>
  </form></Modal>;
}
function parseMoney(input: string) {
  let value = input.trim();
  if (value.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(value)) return NaN;
    value = value.replaceAll('.', '').replace(',', '.');
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return NaN;
  const [whole, decimal = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : NaN;
}
export function DealForm({ deal, clients, initialClientId, onClose, onSaved }: { deal?: Deal; clients: Client[]; initialClientId?: string; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const notify = useFeedback();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const valueInCents = parseMoney(String(form.get('valueInCents') || ''));
    const clientId = Number(form.get('clientId'));
    const stage = String(form.get('stage'));
    if (title.length < 2 || title.length > 120) { setError('Título deve ter de 2 a 120 caracteres.'); return; }
    if (!Number.isSafeInteger(valueInCents) || valueInCents < 0) { setError('Informe um valor válido, não negativo, com até duas casas decimais.'); return; }
    if (!clientId) { setError('Selecione um cliente.'); return; }
    setSaving(true);
    try {
      await api(`/deals${deal ? `/${deal.id}` : ''}`, { method: deal ? 'PATCH' : 'POST', body: JSON.stringify({ title, valueInCents, clientId, stage }) });
      notify(deal ? 'Negócio atualizado com sucesso.' : 'Negócio criado com sucesso.'); onSaved();
    } catch (reason) { setError(message(reason)); } finally { setSaving(false); }
  }
  return <Modal title={deal ? 'Editar negócio' : 'Novo negócio'} onClose={onClose}><form onSubmit={submit} noValidate>
    <div className="form-body"><p className="form-hint">Campos com * são obrigatórios. Valores em reais.</p><Notice text={error} />
      <label htmlFor="deal-title">Título *</label><input id="deal-title" name="title" required maxLength={120} defaultValue={deal?.title} autoFocus placeholder="Título do negócio" />
      <label htmlFor="deal-value">Valor (R$) *</label><input id="deal-value" name="valueInCents" inputMode="decimal" required defaultValue={deal ? (deal.valueInCents / 100).toFixed(2).replace('.', ',') : ''} placeholder="0,00" />
      <label htmlFor="deal-client">Cliente *</label><select id="deal-client" name="clientId" required defaultValue={deal?.clientId || initialClientId || ''}><option value="">Selecione um cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
      {!clients.length && <p className="field-hint">Cadastre um cliente antes de criar um negócio.</p>}
      <label htmlFor="deal-stage">Etapa *</label><select id="deal-stage" name="stage" defaultValue={deal?.stage || 'new'}>{stages.map(stage => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select>
    </div><div className="modal-actions"><button type="button" className="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar negócio'}</button></div>
  </form></Modal>;
}
export function DeleteDialog({ kind, id, title, onClose, onDeleted }: { kind: 'clients' | 'deals'; id: number; title: string; onClose: () => void; onDeleted: () => void }) {
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const notify = useFeedback();
  const label = kind === 'clients' ? 'cliente' : 'negócio';
  async function remove() {
    setDeleting(true); setError('');
    try { await api(`/${kind}/${id}`, { method: 'DELETE' }); notify(`${kind === 'clients' ? 'Cliente' : 'Negócio'} excluído com sucesso.`); onDeleted(); }
    catch (reason) { setError(message(reason)); } finally { setDeleting(false); }
  }
  return <Modal title={`Excluir ${label}`} onClose={onClose}><div className="confirm-body"><div className="delete-symbol"><Trash2 size={24} /></div><p>Deseja excluir <strong>{title}</strong>?</p><p className="muted">Esta ação não pode ser desfeita.</p><Notice text={error} /></div><div className="modal-actions"><button className="button" disabled={deleting} onClick={onClose}>Cancelar</button><button className="button danger" onClick={remove} disabled={deleting}>{deleting ? 'Excluindo…' : `Excluir ${label}`}</button></div></Modal>;
}
