import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Client, Paginated } from "../../../shared/types";
import { ApiError, api } from "../api";
import { formatDate } from "../format";
import { ClientForm } from "../components/ClientForm";
import { ConfirmDialog, Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from "../components/ui";

const PAGE_SIZE = 4;

type ModalState = { kind: "create" } | { kind: "edit"; client: Client } | { kind: "delete"; client: Client } | null;

export function ClientsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("busca") ?? "";
  const page = Math.max(1, Number(params.get("pagina")) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [result, setResult] = useState<Paginated<Client> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [deleting, setDeleting] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    document.title = "Clientes · CRMBench Modelo";
  }, []);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listClients({ search: search || undefined, page, pageSize: PAGE_SIZE });
      setResult(res);
      if (res.pagination.totalPages > 0 && page > res.pagination.totalPages) {
        updateParams({ pagina: String(res.pagination.totalPages) });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

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

  function clearSearch() {
    setSearchInput("");
    updateParams({ busca: undefined, pagina: undefined });
  }

  async function confirmDelete(client: Client) {
    setDeleting(true);
    try {
      await api.deleteClient(client.id);
      notify("success", `Cliente "${client.name}" excluído.`);
      setModal(null);
      await load();
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Erro ao excluir cliente.");
      setModal(null);
    } finally {
      setDeleting(false);
    }
  }

  const clients = result?.data ?? [];

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes e acesso aos negócios relacionados."
        action={
          <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: "create" })}>
            Novo cliente
          </button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <form className="search-form" onSubmit={handleSearch} role="search">
            <label htmlFor="client-search" className="sr-only">
              Buscar clientes
            </label>
            <input
              id="client-search"
              name="search"
              type="search"
              placeholder="Buscar por nome, e-mail ou empresa"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn">
              Buscar
            </button>
            {search && (
              <button type="button" className="btn btn-ghost" onClick={clearSearch}>
                Limpar
              </button>
            )}
          </form>
        </div>

        {loading && <LoadingState label="Carregando clientes…" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && result && clients.length === 0 && (
          <EmptyState
            title={search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            description={search ? `Não há resultados para "${search}".` : "Crie o primeiro cliente para começar."}
            action={
              search ? (
                <button type="button" className="btn btn-sm" onClick={clearSearch}>
                  Limpar busca
                </button>
              ) : (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setModal({ kind: "create" })}>
                  Novo cliente
                </button>
              )
            }
          />
        )}
        {!loading && !error && result && clients.length > 0 && (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Empresa</th>
                  <th scope="col">Criado em</th>
                  <th scope="col" className="actions-col">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} data-testid="client-row" data-id={c.id}>
                    <td data-label="Nome">
                      <strong>{c.name}</strong>
                    </td>
                    <td data-label="E-mail">{c.email}</td>
                    <td data-label="Empresa">{c.company ?? <span className="muted">—</span>}</td>
                    <td data-label="Criado em">{formatDate(c.createdAt)}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <Link className="btn btn-sm" to={`/negocios?clientId=${c.id}`}>
                          Ver negócios
                        </Link>
                        <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: "edit", client: c })}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger-ghost"
                          onClick={() => setModal({ kind: "delete", client: c })}
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
        <Modal title="Novo cliente" onClose={() => setModal(null)}>
          <ClientForm
            onCancel={() => setModal(null)}
            onSaved={(saved) => {
              notify("success", `Cliente "${saved.name}" criado.`);
              setModal(null);
              void load();
            }}
          />
        </Modal>
      )}
      {modal?.kind === "edit" && (
        <Modal title="Editar cliente" onClose={() => setModal(null)}>
          <ClientForm
            client={modal.client}
            onCancel={() => setModal(null)}
            onSaved={(saved) => {
              notify("success", `Cliente "${saved.name}" atualizado.`);
              setModal(null);
              void load();
            }}
          />
        </Modal>
      )}
      {modal?.kind === "delete" && (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Deseja excluir o cliente "${modal.client.name}"? Esta ação não pode ser desfeita. Clientes com negócios relacionados não podem ser excluídos.`}
          busy={deleting}
          onCancel={() => setModal(null)}
          onConfirm={() => confirmDelete(modal.client)}
        />
      )}
    </>
  );
}
