# Protocolo de Execução do Eli LLM Bench

**Status:** rascunho inicial — não congelado.

Este documento define como uma execução acontece. O `CONTRACT.md` define o que o
participante precisa entregar; `scoring.json` define quanto cada verificação vale;
o avaliador privado define como cada comportamento é verificado.

## 1. Princípios

- Todos os participantes usam o mesmo ambiente e a mesma versão do benchmark.
- Nenhuma intervenção humana ocorre durante a sessão.
- O provider é fixado e fallback é desabilitado.
- O modelo conhece os limites antes de começar.
- Testes externos e implementação de referência permanecem privados na temporada.
- Tempo, custo e tokens são métricas; não atribuem pontos diretamente.

## 2. Estados do resultado

### Entrega

- `1P`: todos os checks críticos ficaram `passed` na primeira avaliação.
- `2P`: ao menos um check crítico ficou `failed` ou `skipped`, uma recuperação foi
  executada e todos os críticos ficaram `passed` depois. A penalidade vem de
  `scoring.json`.
- `FAIL`: depois da recuperação, ao menos um check crítico continua `failed` ou
  `skipped`.

Para recuperação e status de entrega, check crítico só é considerado atendido
quando seu estado é `passed`. Tanto `failed` quanto `skipped` significam núcleo não
comprovado. Falha de infraestrutura externa, quando confirmada, segue a classificação
`INVALID` em vez de ser atribuída ao participante.

### Publicação

- `COMPLETE`: automáticos e juízes concluídos.
- `PARTIAL`: automáticos válidos, mas não foi possível obter dois julgamentos
  válidos. Fica fora do leaderboard até o juízo terminar.
- `INVALID`: falha de infraestrutura comprometeu a comparabilidade.

`FAIL` é publicado no ranking. Reprovação não é escondida.

### Encerramento da sessão

`terminationReason` recebe um dos valores:

- `completed`
- `turn_limit`
- `time_limit`
- `cost_limit`
- `infra_invalid`
- `user_cancelled`

O corte de limite é imediato. O modelo não recebe aviso para “ir terminando”. O que
estiver no workspace é preservado e, salvo invalidação de infraestrutura, avaliado.

## 3. Limites

Os valores oficiais vêm de `config/benchmark.json` e são injetados em destaque no
prompt de construção e no de recuperação.

Enquanto qualquer teto obrigatório estiver `null`, o futuro runner deve recusar
uma execução real. O limite financeiro se aplica ao participante; juízes têm custo
medido separadamente.

## 4. Pré-voo

Antes de gastar:

1. Verificar versões de Windows, Node, npm e OpenCode.
2. Verificar espaço em disco e porta necessária.
3. Confirmar acesso ao provider e modelo exato.
4. Confirmar que fallback está desabilitado.
5. Validar hashes de contrato, prompts, scoring e seed.
6. Confirmar limites não nulos.
7. Pré-aquecer o cache do npm de forma padronizada, fora do cronômetro.

O procedimento exato de pré-aquecimento será congelado antes do piloto 1.

## 5. Execução do participante

1. Criar `E:\DATA\04-PROJETOS\eli-llm-bench\workspaces\<run-id>\project`.
2. Copiar apenas os artefatos permitidos.
3. Montar o prompt final: envelope `build.md` + contrato integral + limites.
4. Registrar o hash do texto exato enviado.
5. Iniciar uma nova sessão do OpenCode.
6. Cronometrar com relógio monotônico até o encerramento da sessão.
7. Registrar timestamps UTC, turnos, chamadas de ferramenta, tokens e custo.
8. Preservar um snapshot de fontes com hash reprodutível.
9. Criar uma cópia descartável para avaliação.

O hash de fontes exclui artefatos gerados, incluindo `node_modules`, `.data`,
`dist`, cobertura, logs e caches. Algoritmo, ordenação e normalização ainda serão
congelados.

## 6. Medição de tempo

O runner usa um relógio monotônico para durações e UTC apenas para timestamps.

Campos principais:

- `buildRound1Ms`: primeira sessão do participante.
- `recoveryMs`: segunda mensagem, se houver.
- `buildTotalMs`: soma das sessões do participante.
- `evaluationTotalMs`: instalação oficial, avaliações e juízes.
- `benchmarkTotalMs`: tempo de ponta a ponta.

O leaderboard mostra `buildTotalMs`. O tempo de avaliação fica no relatório.

O cronômetro do participante inclui comandos executados pelo agente, inclusive
`npm install`; por isso o cache do npm precisa ser pré-aquecido de forma idêntica.

## 7. Medição de custo e uso

O custo é separado:

- `participant`: chamadas do agente participante.
- `judging`: chamadas dos juízes e reservas.
- `total`: soma dos dois.

O leaderboard mostra somente `participant`. O limite financeiro oficial se aplica
somente ao participante e pode ser implementado com uma chave dedicada do
OpenRouter por execução. Nenhuma chave, hash sensível ou segredo é publicado.

Também são registrados:

- Turnos.
- Chamadas de ferramenta.
- Tokens de entrada.
- Tokens de saída.
- Tokens de raciocínio.
- Tokens em cache.

### 7.1 Fonte das métricas do OpenCode

O OpenCode 1.18.9 foi verificado no ambiente oficial. O comando
`opencode export <session-id>` devolve JSON por sessão e, em cada mensagem do
assistente, expõe `cost`, `modelID`, `providerID` e a quebra de `tokens` em
`input`, `output`, `reasoning`, `cache.read` e `cache.write`.

Para uma execução:

- custo e tokens são a soma das mensagens do assistente daquela sessão;
- `turns` é a quantidade dessas mensagens do assistente;
- `toolCalls` é a quantidade de partes com `type: "tool"`;
- `opencode stats` serve para conferência humana, não como fonte oficial, pois
  agrega múltiplas sessões.

Se o provider não preencher custo no export, o runner registra essa ausência e usa
o consumo da chave dedicada do OpenRouter antes/depois da execução. A origem da
medição fica explícita no resultado; custo não é estimado a partir de tabela de
preços quando um valor faturado estiver disponível.

## 8. Avaliação

O avaliador trabalha numa cópia descartável do snapshot.

Cada verificação recebe:

- `passed`: executou e passou.
- `failed`: executou e falhou.
- `skipped`: uma dependência física impediu a execução; vale zero.

Dependências só existem quando a execução é fisicamente impossível sem o requisito
anterior. Falha em um CRUD não pode bloquear outro CRUD independente.

## 9. Recuperação

Todo check público marcado como `critical: true` cujo estado seja diferente de
`passed` dispara recuperação. Check não crítico `failed` ou `skipped` perde pontos,
mas, sozinho, preserva `1P`.

A recuperação:

- Usa a mesma sessão do OpenCode.
- Recebe `recovery.md`.
- Recebe apenas falhas sanitizadas.
- Não recebe código de teste, stack do framework, seletor privado nem pontos.
- Acontece no máximo uma vez.

O sanitizador usa whitelist, redação de segredos e limites. Se não puder confirmar
uma evidência segura, degrada a falha para `phase`, `code` e `expected`, marca
revisão manual e nunca fica silencioso.

## 10. Juízes

Dois juízes de famílias diferentes recebem dossiê anonimizado e sanitizado.

- JSON fora do schema: uma tentativa de reparo de formato.
- Nova falha de formato: substituir pelo juiz reserva.
- Âncora inválida: descartar apenas a observação órfã.
- Divergência acima do limiar: chamar terceiro juiz.
- Menos de dois julgamentos válidos: publicar como `PARTIAL`, sem nota final e
  fora do leaderboard.

Âncoras aceitas: requirement, file, screenshot e check. Comportamento precisa
referenciar uma evidência resolvível.

## 11. Publicação

### 11.1 Relatório editorial

Cada execução válida publica um `report.md` voltado também a quem não é
desenvolvedor. Ele é montado automaticamente a partir dos resultados estruturados,
sem uma terceira IA e sem recalcular a nota.

O relatório apresenta, nesta ordem:

1. Resultado em uma frase: nota, `1P`/`2P`/`FAIL` e encerramento.
2. O que funcionou, agrupado por área e descrito em linguagem comum.
3. O que falhou ou não pôde ser testado, incluindo a consequência para o usuário.
4. O que aconteceu na recuperação, quando houver.
5. Justificativa dos dois juízes para os 20 pontos subjetivos.
6. Tempo, custo, tokens, turnos e chamadas de ferramenta.
7. Apêndice técnico curto, somente quando necessário para sustentar uma conclusão.

Cada check automático fornece um `summary` público. Falhas podem incluir até cinco
detalhes técnicos sanitizados. Cada juiz fornece resumo, pontos fortes, pontos a
melhorar e justificativa da própria nota, todos vinculados a evidências.

O relatório não pode ocultar falhas nem transformar uma inferência em fato. Se a
narrativa contradizer `result.json`, os dados estruturados prevalecem e a publicação
fica bloqueada até a correção do relatório.

O sistema privado escreve no repositório público e cria commit local, sem push.
O responsável revisa e publica manualmente.

O código publicado exclui dependências, banco, build, cobertura, caches, segredos e
logs brutos. Todas as saídas públicas e todos os dossiês passam pelo mesmo
sanitizador.

## 12. Pilotos e congelamento

Pilotos não entram no ranking. Servem para calibrar limites, dependências, falhas de
infraestrutura, juízes e acoplamento do avaliador.

Pesos iniciais são justificados antes do piloto 1. Só mudam após piloto por defeito
metodológico documentado, nunca para produzir uma classificação “mais intuitiva”.

Depois dos pilotos, uma tag Git congela contrato, prompts, scoring, seed, ambiente
e protocolo.
