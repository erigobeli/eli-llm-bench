import { useState, type FormEvent } from "react";
import { STAGES, STAGE_LABELS, type Client, type Deal, type Stage } from "../../../shared/types";
import { ApiError, api, type DealInput } from "../api";
import { centsToInput, parseCurrencyInput } from "../format";
import { FieldError } from "./ui";

interface DealFormProps {
  deal?: Deal | null;
  clients: Client[];
  defaultClientId?: number;
  onSaved: (deal: Deal) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<"title" | "value" | "clientId" | "stage" | "form", string>>;

export function DealForm({ deal, clients, defaultClientId, onSaved, onCancel }: DealFormProps) {
  const [title, setTitle] = useState(deal?.title ?? "");
  const [value, setValue] = useState(deal ? centsToInput(deal.valueInCents) : "");
  const [clientId, setClientId] = useState<string>(
    deal ? String(deal.clientId) : defaultClientId ? String(defaultClientId) : "",
  );
  const [stage, setStage] = useState<Stage>(deal?.stage ?? "new");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function validate(): DealInput | null {
    const next: Errors = {};
    const t = title.trim();
    if (t.length < 2 || t.length > 120) next.title = "Informe um título com 2 a 120 caracteres.";
    const cents = parseCurrencyInput(value);
    if (cents === null) next.value = "Informe um valor válido, maior ou igual a zero (ex.: 1.500,00).";
    const cid = Number(clientId);
    if (!clientId || !Number.isInteger(cid) || cid < 1) next.clientId = "Selecione um cliente.";
    if (!STAGES.includes(stage)) next.stage = "Selecione uma etapa válida.";
    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return { title: t, valueInCents: cents as number, clientId: cid, stage };
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const input = validate();
    if (!input) return;
    setBusy(true);
    try {
      const saved = deal ? await api.updateDeal(deal.id, input) : await api.createDeal(input);
      onSaved(saved);
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : "Erro inesperado ao salvar." });
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
        <label htmlFor="deal-title">Título *</label>
        <input
          id="deal-title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoFocus
          aria-invalid={Boolean(errors.title)}
        />
        <FieldError message={errors.title} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="deal-value">Valor (R$) *</label>
          <input
            id="deal-value"
            name="valueInCents"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(errors.value)}
          />
          <FieldError message={errors.value} />
        </div>
        <div className="field">
          <label htmlFor="deal-stage">Etapa *</label>
          <select id="deal-stage" name="stage" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <FieldError message={errors.stage} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="deal-client">Cliente *</label>
        <select
          id="deal-client"
          name="clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          aria-invalid={Boolean(errors.clientId)}
        >
          <option value="">Selecione…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` — ${c.company}` : ""}
            </option>
          ))}
        </select>
        <FieldError message={errors.clientId} />
        {clients.length === 0 && <span className="field-hint">Cadastre um cliente antes de criar negócios.</span>}
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Salvando…" : deal ? "Salvar alterações" : "Criar negócio"}
        </button>
      </div>
    </form>
  );
}
