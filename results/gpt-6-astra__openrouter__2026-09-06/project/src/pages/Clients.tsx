import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { Client, Page } from "../../shared/types";
import {
  ClientForm,
  DeleteDialog,
  LoadState,
  PageHeader,
  Pagination,
  SearchField,
} from "../components";
import { date, useResource } from "../lib";

export function Clients() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [revision, setRevision] = useState(0);
  const result = useResource<Page<Client>>(
    `/api/clients?${new URLSearchParams({ search, page: String(page), pageSize: "4" })}`,
    revision,
  );
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  function query(search: string, page: number) {
    setParams(
      {
        ...(search ? { search } : {}),
        ...(page > 1 ? { page: String(page) } : {}),
      },
      { replace: true },
    );
  }
  useEffect(() => {
    if (
      !result.loading &&
      result.data &&
      page > Math.max(1, result.data.pagination.totalPages)
    )
      query(search, Math.max(1, result.data.pagination.totalPages));
  }, [result.data, result.loading, page]);
  function saved() {
    setEditing(null);
    query("", 1);
    setRevision((n) => n + 1);
  }
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Organize seus contatos e acompanhe cada relacionamento."
        action={
          <button
            className="button button-primary"
            onClick={() => setEditing("new")}
          >
            <Plus size={17} />
            Novo cliente
          </button>
        }
      />
      <section className="panel" aria-label="Lista de clientes">
        <div className="panel-toolbar">
          <div className="section-title">
            <Users size={18} />
            <h2>Todos os clientes</h2>
            {result.data && (
              <span className="count">{result.data.pagination.total}</span>
            )}
          </div>
          <SearchField
            value={search}
            onChange={(value) => query(value, 1)}
            placeholder="Buscar nome, e-mail ou empresa"
          />
        </div>
        <LoadState
          loading={result.loading}
          error={result.error}
          empty={!result.data?.data.length}
          onRetry={result.retry}
        >
          <table className="data-table client-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>E-mail</th>
                <th>Empresa</th>
                <th>Cadastrado em</th>
                <th className="actions-heading">Ações</th>
              </tr>
            </thead>
            <tbody>
              {result.data?.data.map((client) => (
                <tr
                  key={client.id}
                  data-testid="client-row"
                  data-id={client.id}
                >
                  <td data-label="Cliente">
                    <div className="record-name">
                      <span className="avatar">
                        {client.name.slice(0, 2).toUpperCase()}
                      </span>
                      <strong>{client.name}</strong>
                    </div>
                  </td>
                  <td data-label="E-mail">
                    <a className="email-link" href={`mailto:${client.email}`}>
                      {client.email}
                    </a>
                  </td>
                  <td data-label="Empresa">
                    {client.company || (
                      <span className="muted">Não informada</span>
                    )}
                  </td>
                  <td data-label="Cadastrado em" className="date-cell">
                    {date(client.createdAt)}
                  </td>
                  <td data-label="Ações">
                    <div className="row-actions">
                      <Link
                        className="related-link"
                        to={`/negocios?clientId=${client.id}`}
                        aria-label={`Ver negócios de ${client.name}`}
                      >
                        Ver negócios
                        <ArrowUpRight size={13} />
                      </Link>
                      <button
                        className="icon-button"
                        title="Editar cliente"
                        aria-label={`Editar ${client.name}`}
                        onClick={() => setEditing(client)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-icon"
                        title="Excluir cliente"
                        aria-label={`Excluir ${client.name}`}
                        onClick={() => setDeleting(client)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </LoadState>
        {!result.loading && !result.error && result.data && (
          <Pagination
            pagination={result.data.pagination}
            onPage={(value) => query(search, value)}
          />
        )}
      </section>
      {editing && (
        <ClientForm
          client={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {deleting && (
        <DeleteDialog
          kind="clients"
          record={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setRevision((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
