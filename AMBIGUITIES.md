# Registro de Ambiguidades

Este arquivo registra mudanças motivadas por ambiguidades reais encontradas na
referência, no avaliador ou nos pilotos.

Cada entrada deve conter:

- Data.
- Versão afetada.
- Requisito.
- Texto anterior.
- Texto novo.
- Evidência que revelou a ambiguidade.
- Por que a mudança não favorece uma implementação específica.

## Entradas

### 2026-07-29 — endpoint dos indicadores

- **Versão afetada:** rascunho compacto anterior ao congelamento.
- **Requisito:** `REQ-METRICS-ACCURACY`.
- **Texto anterior:** `GET /api/metrics`.
- **Texto novo:** `GET /api/dashboard`.
- **Evidência:** um bloqueador de privacidade do navegador interceptou
  `/api/metrics` como se fosse telemetria e devolveu HTTP 499, embora o endpoint
  respondesse 200 fora do navegador.
- **Neutralidade:** a mudança preserva o mesmo JSON e a mesma regra de pontuação;
  apenas evita um nome conhecido por falsos positivos de bloqueadores.

Discussões anteriores ao primeiro congelamento permanecem no histórico do Git e
não são resultados de benchmark.
