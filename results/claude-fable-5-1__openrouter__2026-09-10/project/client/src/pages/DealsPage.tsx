import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { STAGES, STAGE_LABELS, type Client, type Deal, type Paginated, type Stage } from "../../../shared/types";
import { ApiError, api, fetchAllClients } from "../api";
import { formatCents, formatDate } from "../format";
import { DealForm } from "../components/DealForm";
import { ConfirmDialog, Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from "../components/ui";

const PAGE_SIZE = 4;

type ModalState = { kind: "create" } | { kind: "edit"; deal: Deal } | { kind: "delete"; deal: Deal } | null;

function isStage(v: string | null): v is Stage {
  return v !== null && (STAGES as readonly string[]).includes(v);
}

export function DealsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("busca") ?? "";
  const stageParam = params.get("stage");
  const stage: Stage | "" = isStage(stageParam) ? stageParam : "";
  const clientIdRaw = Number(params.get("clientId"));
  const clientId = Number.isInteger(clientIdRaw) && clientIdRaw > 0 ? clientIdRaw : "";
  const page = Math.max(1, Number(params.get("pagina")) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [result, setResult] = useState<Paginated<Deal> | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [deleting, setDeleting] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    document.title = "Negócios · CRMBench Modelo";
  }, []);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const loadClients = useCallback(async () => {
    try {
      setClients(await fetchAllClients());
      setClientsError(null);
    } catch (err) {
      setClientsError(err instanceof ApiError ? err.message : "Erro ao carregar clientes.");
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listDeals({
        search: search || undefined,
        stage: stage || undefined,
        clientId: clientId || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setResult(res);
      if (res.pagination.totalPages > 0 && page > res.pagination.totalPages) {
        updateParams({ pagina: String(res.pagination.totalPages) });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar negócios.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stage, clientId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateParams(next: Record<string, string | undefined>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: true });
  }

  function handleSearch(ev: FormEvent) {
    ev.preventDefault();
    updateParams({ busca: searchInput.trim(), pagina: undefined });
  }

  function clearFilters() {
    setSearchInput("");
    updateParams({ busca: undefined, stage: undefined, clientId: undefined, pagina: undefined });
  }

  async function confirmDelete(deal: Deal) {
    setDeleting(true);
    try {
      await api.deleteDeal(deal.id);
      notify("success", `Negócio "${deal.title}" excluído.`);
      setModal(null);
      await load();
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Erro ao excluir negócio.");
      setModal(null);
    } finally {
      setDeleting(false);
    }
  }

  const deals = result?.data ?? [];
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const hasFilters = Boolean(search || stage || clientId);
  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : undefined;

  return (
    <>
      <PageHeader
        title="Negócios"
        description={
          selectedClient
            ? `Exibindo negócios do cliente ${selectedClient.name}.`
            : "Oportunidades comerciais com valor, etapa e cliente."
        }
        action={
          <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: "create" })}>
            Novo negócio
          </button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <form className="search-form filters" onSubmit={handleSearch} role="search">
            <div className="filter">
              <label htmlFor="deal-search" className="sr-only">
                Buscar negócios
              </label>
              <input
                id="deal-search"
                name="search"
                type="search"
                placeholder="Buscar por título"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="filter">
              <label htmlFor="deal-stage-filter" className="sr-only">
                Filtrar por etapa
              </label>
              <select
                id="deal-stage-filter"
                name="stage"
                value={stage}
                onChange={(e) => updateParams({ stage: e.target.value, pagina: undefined })}
              >
                <option value="">Todas as etapas</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter">
              <label htmlFor="deal-client-filter" className="sr-only">
                Filtrar por cliente
              </label>
              <select
                id="deal-client-filter"
                name="clientId"
                value={clientId === "" ? "" : String(clientId)}
                onChange={(e) => updateParams({ clientId: e.target.value, pagina: undefined })}
              >
                <option value="">Todos os clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn">
              Buscar
            </button>
            {hasFilters && (
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                Limpar filtros
              </button>
            )}
          </form>
        </div>

        {clientsError && <ErrorState message={clientsError} onRetry={loadClients} />}
        {loading && <LoadingState label="Carregando negócios…" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && result && deals.length === 0 && (
          <EmptyState
            title={hasFilters ? "Nenhum negócio encontrado" : "Nenhum negócio cadastrado"}
            description={
              hasFilters ? "Ajuste a busca ou os filtros para ver outros registros." : "Crie o primeiro negócio para começar."
            }
            action={
              hasFilters ? (
                <button type="button" className="btn btn-sm" onClick={clearFilters}>
                  Limpar filtros
                </button>
              ) : (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setModal({ kind: "create" })}>
                  Novo negócio
                </button>
              )
            }
          />
        )}
        {!loading && !error && result && deals.length > 0 && (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Etapa</th>
                  <th scope="col" className="num">
                    Valor
                  </th>
                  <th scope="col">Atualizado</th>
                  <th scope="col" className="actions-col">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} data-testid="deal-row" data-id={d.id}>
                    <td data-label="Título">
                      <strong>{d.title}</strong>
                    </td>
                    <td data-label="Cliente">
                      <Link to={`/negocios?clientId=${d.clientId}`} className="link">
                        {clientName.get(d.clientId) ?? `Cliente #${d.clientId}`}
                      </Link>
                    </td>
                    <td data-label="Etapa">
                      <span className={`stage-badge stage-${d.stage}`}>{STAGE_LABELS[d.stage]}</span>
                    </td>
                    <td data-label="Valor" className="num">
                      {formatCents(d.valueInCents)}
                    </td>
                    <td data-label="Atualizado">{formatDate(d.updatedAt)}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: "edit", deal: d })}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger-ghost"
                          onClick={() => setModal({ kind: "delete", deal: d })}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && !error && (
          <Pagination pagination={result.pagination} onChange={(p) => updateParams({ pagina: String(p) })} />
        )}
      </section>

      {modal?.kind === "create" && (
        <Modal title="Novo negócio" onClose={() => setModal(null)}>
          <DealForm
            clients={clients}
            defaultClientId={clientId || undefined}
            onCancel={() => setModal(null)}
            onSaved={(saved) => {
              notify("success", `Negócio "${saved.title}" criado.`);
              setModal(null);
              void load();
            }}
          />
        </Modal>
      )}
      {modal?.kind === "edit" && (
        <Modal title="Editar negócio" onClose={() => setModal(null)}>
          <DealForm
            deal={modal.deal}
            clients={clients}
            onCancel={() => setModal(null)}
            onSaved={(saved) => {
              notify("success", `Negócio "${saved.title}" atualizado.`);
              setModal(null);
              void load();
            }}
          />
        </Modal>
      )}
      {modal?.kind === "delete" && (
        <ConfirmDialog
          title="Excluir negócio"
          message={`Deseja excluir o negócio "${modal.deal.title}"? Esta ação não pode ser desfeita.`}
          busy={deleting}
          onCancel={() => setModal(null)}
          onConfirm={() => confirmDelete(modal.deal)}
        />
      )}
    </>
  );
}
