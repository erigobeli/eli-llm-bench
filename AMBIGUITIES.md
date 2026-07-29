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

### 2026-07-29 — paginação visível com o seed oficial

- **Versão afetada:** rascunho compacto anterior ao congelamento.
- **Requisitos:** `REQ-UI-CLIENT-FLOW` e `REQ-UI-DEAL-FLOW`.
- **Texto anterior:** a aplicação escolhia o tamanho da página e podia ocultar
  os controles quando todos os registros coubessem na primeira página.
- **Texto novo:** as duas listagens exibem exatamente quatro registros por
  página e solicitam `pageSize=4`; controles acessíveis Anterior e Próxima
  ficam visíveis e funcionais com o seed oficial na primeira abertura.
- **Evidência:** o piloto DeepSeek implementou paginação funcional com dez
  itens por página, mas ela não aparecia na demonstração porque o seed possui
  cinco clientes e oito negócios.
- **Neutralidade:** a regra é explícita e idêntica para todos os participantes
  futuros; o avaliador deixou de criar registros artificiais para revelar os
  controles.

### 2026-07-29 — interação do pipeline

- **Versão afetada:** rascunho compacto anterior ao congelamento.
- **Requisito:** `REQ-PIPELINE-PERSISTENCE`.
- **Texto anterior:** exigia mudar a etapa pela interface, sem restringir o
  controle, mas a primeira versão do avaliador procurava apenas um `select`.
- **Texto novo:** select, botões, drag-and-drop e interações visuais
  equivalentes são válidos para o check geral de persistência; drag-and-drop
  possui um requisito adicional e pontuação própria.
- **Evidência:** o piloto Haiku implementou drag-and-drop funcional, revelando
  a suposição indevida do avaliador.
- **Neutralidade:** a pontuação continua dependendo da persistência observada no
  SQLite e depois do restart, não do componente escolhido.

### 2026-07-29 — neutralidade dos fluxos visuais

- **Versão afetada:** rascunho compacto anterior ao congelamento.
- **Requisitos:** `REQ-UI-CLIENT-FLOW`, `REQ-UI-DEAL-FLOW` e
  `REQ-UI-FEEDBACK`.
- **Texto anterior:** os comportamentos eram públicos, mas a primeira versão do
  avaliador pressupunha textos exatos, tamanho fixo de página, feedback
  personalizado e uma forma específica de mostrar negócios relacionados.
- **Texto novo:** os mesmos comportamentos permanecem exigidos, aceitando
  paginação com tamanho escolhido pela aplicação e controles ocultos enquanto
  só existe uma página, validação nativa ou personalizada e navegação ou detalhe
  para os negócios relacionados. Confirmações visíveis podem usar diálogo
  semântico ou modal personalizado.
- **Evidência:** o primeiro piloto entregou os comportamentos, mas foi reprovado
  por diferenças legítimas de interface e por buscas com debounce.
- **Neutralidade:** o avaliador passou a observar o efeito verificável, sem
  exigir a estrutura usada pela aplicação de referência.

### 2026-07-29 — caixa do e-mail

- **Versão afetada:** rascunho compacto anterior ao congelamento.
- **Requisito:** `REQ-CLIENT-CREATE`.
- **Texto anterior:** campos normalizados, sem definir se normalização alterava
  a caixa do e-mail.
- **Texto novo:** espaços externos são removidos e comparações ignoram
  maiúsculas; preservar ou converter a caixa é válido.
- **Evidência:** o primeiro piloto preservou o e-mail em maiúsculas, manteve
  unicidade case-insensitive e foi reprovado por uma expectativa não declarada.
- **Neutralidade:** a API continua obrigada a validar, persistir e comparar o
  e-mail corretamente, sem impor uma escolha cosmética de armazenamento.

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
