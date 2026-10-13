import { useState } from 'react';
import { GripVertical, Plus, Columns3, Pencil } from 'lucide-react';
import { allRecords, api, message, money, useResource } from '../api';
import { DealForm, Empty, Loading, LoadError, PageHeader, useFeedback } from '../components';
import { stages, stageLabels, type Client, type Deal, type Stage } from '../../shared/types';

export default function Pipeline() {
  const resource = useResource(async signal => {
    const [deals, clients] = await Promise.all([allRecords<Deal>('/deals', signal), allRecords<Client>('/clients', signal)]);
    return { deals, clients };
  }, []);
  const [form, setForm] = useState<Deal | 'new' | null>(null);
  const [moving, setMoving] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const notify = useFeedback();
  async function move(id: number, stage: Stage) {
    const deal = resource.data?.deals.find(item => item.id === id);
    if (!deal || deal.stage === stage || moving !== null) return;
    setMoving(id);
    try { await api(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) }); notify(`“${deal.title}” movido para ${stageLabels[stage]}.`); resource.refresh(); }
    catch (error) { notify(message(error), 'error'); } finally { setMoving(null); }
  }
  const deals = resource.data?.deals || [];
  return <>
    <PageHeader title="Pipeline" description="Acompanhe e mova seus negócios entre as etapas comerciais." action={<button className="button primary" onClick={() => setForm('new')} disabled={resource.loading || !!resource.error}><Plus size={17} />Novo negócio</button>} />
    <div className="pipeline-summary"><span><Columns3 size={16} /><strong>{deals.length}</strong> negócios no pipeline</span><span>Em aberto: <strong>{money(deals.filter(deal => deal.stage !== 'won').reduce((sum, deal) => sum + deal.valueInCents, 0))}</strong></span></div>
    <p className="pipeline-help">Arraste um cartão para outra coluna ou use o seletor de etapa.</p>
    {resource.loading ? <section className="panel"><Loading text="Carregando pipeline…" /></section> : resource.error ? <LoadError error={resource.error} retry={resource.refresh} /> : <div className="pipeline-board">{stages.map(stage => {
      const stageDeals = deals.filter(deal => deal.stage === stage);
      return <section key={stage} className={`pipeline-column ${stage}${over === stage ? ' drag-over' : ''}`} aria-label={stageLabels[stage]} onDragOver={event => { if (moving === null) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(stage); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null); }} onDrop={event => {
        event.preventDefault(); const id = Number(event.dataTransfer.getData('text/plain')); setOver(null); setDragging(null); if (Number.isSafeInteger(id)) void move(id, stage);
      }}><header className="column-heading"><div><span className="column-dot" /><h2>{stageLabels[stage]}</h2><span className="column-count">{stageDeals.length}</span></div><p>{money(stageDeals.reduce((sum, deal) => sum + deal.valueInCents, 0))}</p></header>
        <div className="column-cards">{stageDeals.length ? stageDeals.map(deal => <article key={deal.id} className={`deal-card${dragging === deal.id ? ' dragging' : ''}`} draggable={moving === null} data-testid="deal-card" data-id={deal.id} onDragStart={event => { event.dataTransfer.setData('text/plain', String(deal.id)); event.dataTransfer.effectAllowed = 'move'; setDragging(deal.id); }} onDragEnd={() => { setDragging(null); setOver(null); }}>
          <div className="card-top"><span className="drag-handle" title="Arraste para mover"><GripVertical size={17} /></span><button className="icon-button" aria-label={`Editar negócio ${deal.title}`} title="Editar negócio" onClick={() => setForm(deal)}><Pencil size={14} /></button></div><h3>{deal.title}</h3><p className="card-client">{resource.data?.clients.find(client => client.id === deal.clientId)?.name || `Cliente #${deal.clientId}`}</p><strong className="card-value">{money(deal.valueInCents)}</strong>
          <label className="sr-only" htmlFor={`move-${deal.id}`}>Etapa de {deal.title}</label><select id={`move-${deal.id}`} name="stage" aria-label={`Etapa de ${deal.title}`} value={deal.stage} disabled={moving !== null} onChange={event => void move(deal.id, event.target.value as Stage)}>{stages.map(item => <option key={item} value={item}>{stageLabels[item]}</option>)}</select>
        </article>) : <div className="column-empty"><Empty title="Sem negócios" description="Solte um cartão nesta etapa." /></div>}</div>
      </section>;
    })}</div>}
    {form && <DealForm deal={form === 'new' ? undefined : form} clients={resource.data?.clients || []} onClose={() => setForm(null)} onSaved={() => { setForm(null); resource.refresh(); }} />}
  </>;
}
