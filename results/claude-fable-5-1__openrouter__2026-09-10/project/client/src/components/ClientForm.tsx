import { useState, type FormEvent } from "react";
import type { Client } from "../../../shared/types";
import { ApiError, api, type ClientInput } from "../api";
import { FieldError } from "./ui";

interface ClientFormProps {
  client?: Client | null;
  onSaved: (client: Client) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<"name" | "email" | "company" | "form", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClientForm({ client, onSaved, onCancel }: ClientFormProps) {
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [company, setCompany] = useState(client?.company ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function validate(): ClientInput | null {
    const next: Errors = {};
    const n = name.trim();
    const e = email.trim();
    const c = company.trim();
    if (n.length < 2 || n.length > 80) next.name = "Informe um nome com 2 a 80 caracteres.";
    if (!EMAIL_RE.test(e)) next.email = "Informe um e-mail válido.";
    if (c.length > 120) next.company = "Empresa deve ter no máximo 120 caracteres.";
    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return { name: n, email: e, company: c ? c : null };
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const input = validate();
    if (!input) return;
    setBusy(true);
    try {
      const saved = client ? await api.updateClient(client.id, input) : await api.createClient(input);
      onSaved(saved);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro inesperado ao salvar.";
      if (err instanceof ApiError && err.status === 409) setErrors({ email: message });
      else setErrors({ form: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {errors.form && (
        <div className="form-error" role="alert">
          {errors.form}
        </div>
      )}
      <div className="field">
        <label htmlFor="client-name">Nome *</label>
        <input
          id="client-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoFocus
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "client-name-error" : undefined}
        />
        <span id="client-name-error">
          <FieldError message={errors.name} />
        </span>
      </div>
      <div className="field">
        <label htmlFor="client-email">E-mail *</label>
        <input
          id="client-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "client-email-error" : undefined}
        />
        <span id="client-email-error">
          <FieldError message={errors.email} />
        </span>
      </div>
      <div className="field">
        <label htmlFor="client-company">Empresa</label>
        <input
          id="client-company"
          name="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={120}
          aria-invalid={Boolean(errors.company)}
        />
        <FieldError message={errors.company} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Salvando…" : client ? "Salvar alterações" : "Criar cliente"}
        </button>
      </div>
    </form>
  );
}
