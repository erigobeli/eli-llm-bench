# Protocolo de Execução do Eli LLM Bench v1

Este protocolo define uma execução oficial simples, reproduzível e com um único
prompt.

## 1. Unidade comparada

Cada linha do ranking representa:

```text
modelo + provider + OpenCode + reasoning + versão do benchmark
```

Execuções com harness, provider ou versão diferentes não são tratadas como a
mesma configuração.

## 2. Limites oficiais

- tempo máximo: 60 minutos;
- turnos máximos: 150;
- custo máximo do participante: US$ 8;
- fallback de provider: desligado;
- reasoning oficial: `high` ou o equivalente mais próximo disponível.

O modelo conhece os limites. Ao atingir qualquer teto, a sessão é encerrada sem
aviso adicional e o projeto existente é avaliado como foi entregue.

## 3. Preparação

1. Confirmar Windows, Node, npm e OpenCode nas versões registradas.
2. Confirmar acesso ao modelo e fallback desligado.
3. Criar um workspace limpo a partir de `workspaces/_template`.
4. Copiar o seed oficial e conferir seu SHA-256.
5. Montar `prompt.txt` com `prompts/build.md` e `CONTRACT.md`.
6. Registrar hashes do prompt, contrato, seed e scoring.
7. Registrar o instante inicial com relógio monotônico.

O cache npm pode ser pré-aquecido antes do instante inicial. Nenhum arquivo do
projeto pode ser criado nesse pré-aquecimento.

## 4. Execução

O participante recebe uma única mensagem: o conteúdo integral de `prompt.txt`.
Não há prompt de correção, continuação ou autoavaliação na nota oficial.

O OpenCode é iniciado com plugins externos desligados, permissões automáticas no
workspace, provider fixado e fallback desligado.

Intervenção do operador invalida a execução, exceto o corte automático por limite
ou o cancelamento de uma falha comprovadamente externa ao participante.

## 5. Encerramento

`terminationReason` registra:

- `completed`: o agente encerrou normalmente;
- `turn_limit`: atingiu 150 turnos;
- `time_limit`: atingiu 60 minutos;
- `cost_limit`: atingiu US$ 8;
- `infra_invalid`: falha externa comprovada;
- `user_cancelled`: cancelamento manual.

Tempo total é a diferença de relógio entre o envio do prompt e o encerramento da
sessão. Tempo e custo são metadados: não alteram a nota.

Custo, turnos, ferramentas e tokens são extraídos do `opencode export`. O custo
publicado é o valor efetivamente cobrado do participante no OpenRouter.

## 6. Avaliação

O avaliador trabalha sobre uma cópia descartável do projeto e nunca importa
código da referência.

Ele:

1. instala dependências;
2. recria o banco duas vezes em `DB_PATH` isolado;
3. executa testes do participante;
4. compila e inicia a aplicação;
5. verifica API, persistência, interface e responsividade;
6. encerra e inicia o servidor durante o teste do pipeline;
7. atribui pontos conforme `scoring.json`;
8. gera `evaluation.json` e `report.md`.

Estados de check:

- `passed`: recebe todos os pontos;
- `failed`: recebe zero;
- `skipped`: não pôde ser executado por dependência física e recebe zero.

Não existe nota parcial dentro de um check. Os 20 checks somam 100 pontos.

## 7. Artefatos

Cada avaliação grava em:

```text
internal/evaluator/.artifacts/<run-id>/evaluation.json
internal/evaluator/.artifacts/<run-id>/report.md
```

Um run nunca sobrescreve outro.

O relatório usa `title`, `passText` e `failText` do `scoring.json` para explicar o
resultado em linguagem simples. Não há juiz de IA.

## 8. Resultado e publicação

O resultado público contém:

- modelo, provider, harness e reasoning;
- versão do benchmark;
- nota de 0 a 100;
- tempo, custo, turnos e tokens;
- motivo do encerramento;
- resultado de cada check;
- link do projeto gerado;
- link opcional do vídeo.

Correções pedidas depois da nota podem aparecer no vídeo, mas nunca alteram o
resultado oficial.

## 9. Validação do benchmark

Antes de qualquer execução paga:

1. a referência deve obter 100/100 três vezes consecutivas;
2. os três relatórios precisam ser idênticos nos estados e pontos;
3. um piloto de baixo custo precisa exercitar pelo menos uma falha;
4. contrato, scoring e avaliador são congelados na tag `v1.0.0`.

Qualquer mudança pontuada depois do congelamento cria uma nova versão do
benchmark e não é misturada silenciosamente ao ranking anterior.
