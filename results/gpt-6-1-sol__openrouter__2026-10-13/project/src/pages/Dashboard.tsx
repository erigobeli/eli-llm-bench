import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CircleDollarSign, Plus, Users } from 'lucide-react';
import { allRecords, api, money, shortDate, useResource } from '../api';
import { Empty, Loading, LoadError, PageHeader, StageBadge } from '../components';
import { stages, stageLabels, type Client, type Deal, type Metrics } from '../../shared/types';

export default function Dashboard() {
  const resource = useResource(async signal => {
    const [metrics, clients, deals] = await Promise.all([api<Metrics>('/dashboard', { signal }), allRecords<Client>('/clients', signal), allRecords<Deal>('/deals', signal)]);
    return { metrics, clients, deals };
  }, []);
  const data = resource.data;
  return <>
    <PageHeader title="Visão geral" description="Os principais números da sua operação comercial." action={<Link to="/negocios" className="button primary"><Plus size={17} />Gerenciar negócios</Link>} />
    {resource.loading ? <section className="panel"><Loading text="Carregando indicadores…" /></section> : resource.error ? <LoadError error={resource.error} retry={resource.refresh} /> : data && <>
      <div className="metrics-grid"><div className="metric-card" data-testid="metric" data-metric="totalClients"><div><span>Total de clientes</span><Users size={19} /></div><strong>{data.metrics.totalClients}</strong><Link to="/clientes">Ver clientes <ArrowRight size={14} /></Link></div><div className="metric-card" data-testid="metric" data-metric="openDeals"><div><span>Negócios abertos</span><BriefcaseBusiness size={19} /></div><strong>{data.metrics.openDeals}</strong><span className="metric-caption">Em negociação</span></div><div className="metric-card" data-testid="metric" data-metric="pipelineValueInCents"><div><span>Valor do pipeline aberto</span><CircleDollarSign size={19} /></div><strong>{money(data.metrics.pipelineValueInCents)}</strong><span className="metric-caption">Soma das oportunidades em aberto</span></div></div>
      <section className="panel overview-pipeline"><div className="panel-heading"><div><h2>Distribuição por etapa</h2><p>Volume e valor dos negócios no pipeline</p></div><Link className="button text small" to="/pipeline">Abrir pipeline <ArrowRight size={15} /></Link></div><div className="stage-summary-grid">{stages.map(stage => {
        const deals = data.deals.filter(deal => deal.stage === stage);
        return <div className={`stage-summary ${stage}`} key={stage}><div><span className="column-dot" /><span>{stageLabels[stage]}</span><strong>{deals.length}</strong></div><p>{money(deals.reduce((sum, deal) => sum + deal.valueInCents, 0))}</p><div className="bar-track"><div style={{ width: `${data.deals.length ? deals.length / data.deals.length * 100 : 0}%` }} /></div></div>;
      })}</div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Negócios recentes</h2><p>Últimas oportunidades cadastradas</p></div><Link className="button text small" to="/negocios">Ver todos <ArrowRight size={15} /></Link></div>{data.deals.length ? <table className="data-table recent-table"><thead><tr><th>Negócio</th><th>Cliente</th><th>Valor</th><th>Etapa</th><th>Criado em</th></tr></thead><tbody>{[...data.deals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(deal => <tr key={deal.id}><td data-label="Negócio"><Link className="record-link" to={`/negocios?clientId=${deal.clientId}`}>{deal.title}</Link></td><td data-label="Cliente">{data.clients.find(client => client.id === deal.clientId)?.name}</td><td className="money" data-label="Valor">{money(deal.valueInCents)}</td><td data-label="Etapa"><StageBadge stage={deal.stage} /></td><td data-label="Criado em" className="muted">{shortDate(deal.createdAt)}</td></tr>)}</tbody></table> : <Empty title="Nenhum negócio cadastrado" description="Adicione um negócio na tela Negócios." />}</section>
    </>}
  </>;
}
