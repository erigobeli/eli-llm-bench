# Guia de execução do Eli LLM Bench

Este é o passo a passo operacional para criar uma aplicação participante no
OpenCode e, depois, pedir ao Codex que avalie, publique e atualize o ranking.

> A nota oficial considera somente o projeto produzido a partir da primeira
> mensagem. Não corrija arquivos manualmente e não envie outro prompt antes da
> avaliação.

## Receita pronta: GPT-6 Astra

Nesta execução, use:

```text
Run ID: gpt-6-astra__openrouter__2026-09-06
Modelo: gpt-6-astra
Provider: OpenRouter
Harness: OpenCode
Reasoning: high
```

### 1. Preparar uma cópia limpa

Abra o PowerShell na raiz local do benchmark:

```powershell
cd <caminho-do-repositorio>\eli-llm-bench
```

Atualize o template com a versão vigente do contrato, do prompt e do seed:

```powershell
.\internal\runner\prepare-template.ps1
```

Crie uma cópia exclusiva para o Astra:

```powershell
Copy-Item -Recurse .\workspaces\_template .\workspaces\gpt-6-astra__openrouter__2026-09-06
```

Execute o pré-voo imediatamente antes de iniciar o teste:

```powershell
.\internal\runner\preflight.ps1
```

Se o pré-voo disser que a porta `3000` pertence a outro programa, encerre esse
programa e execute o pré-voo novamente. Não comece o teste com a porta ocupada.

### 2. Abrir o OpenCode no diretório correto

```powershell
cd .\workspaces\gpt-6-astra__openrouter__2026-09-06\project
opencode --pure --auto
```

O OpenCode deve ser aberto dentro de `project`. O arquivo `prompt.txt` fica um
nível acima apenas para não fazer parte do código que o modelo deve entregar.

### 3. Configurar e iniciar o modelo

Dentro do OpenCode:

1. Use `/model`.
2. Selecione no OpenRouter exatamente o modelo `gpt-6-astra`.
3. Selecione o nível de raciocínio `high`.
4. Confirme que não existe fallback para outro modelo ou provider.
5. Abra `..\prompt.txt`, copie todo o conteúdo e envie como uma única mensagem.
6. A partir do envio, não mande novas mensagens, não altere arquivos e não
   execute comandos dentro do projeto.
7. Espere o agente declarar que terminou.

Anote ou tire uma captura do custo exibido pelo OpenCode/OpenRouter. Não feche
nem apague a sessão: ela será usada para extrair tempo, custo, tokens, turnos e
chamadas de ferramentas.

### 4. O que fazer quando terminar

Não é necessário rodar o avaliador por conta própria. Abra o Codex na raiz
`<caminho-do-repositorio>\eli-llm-bench` e envie o texto abaixo:

```text
A execução do Eli LLM Bench terminou. Avalie e publique este resultado.

Run ID: gpt-6-astra__openrouter__2026-09-06
Modelo exato: gpt-6-astra
Harness: OpenCode
Provider: OpenRouter
Reasoning: high
Diretório do projeto:
<caminho-do-repositorio>\eli-llm-bench\workspaces\gpt-6-astra__openrouter__2026-09-06\project

Faça todo o pós-processamento até o fim:

1. Não altere nem corrija o projeto participante.
2. Execute o pré-voo e encerre somente processos residuais do benchmark.
3. Localize e exporte a sessão exata do OpenCode. Extraia e confira início,
   fim, tempo ativo, custo, tokens, turnos e chamadas de ferramentas.
4. Execute o avaliador determinístico usando o run ID acima.
5. Confira a nota, o relatório e as evidências de todos os checks. A nota deve
   vir do avaliador e do scoring.json, não de julgamento da IA.
6. Se houver possível falso negativo ou falha do avaliador, não corrija o
   participante. Investigue o avaliador e valide qualquer ajuste contra a
   aplicação de referência, que deve continuar em 100/100.
7. Crie public/results/<run-id>/ com result.json, report.md, screenshots úteis
   e uma cópia fiel e sanitizada do projeto.
8. Não publique chaves, cookies, .env, banco temporário, node_modules, builds,
   caches, caminhos pessoais ou a exportação bruta da sessão.
9. Valide o result.json pelo schema, atualize o ranking e confira todo o diff.
10. Antes de commit e push, mostre o resultado final e peça minha confirmação.
11. Depois da minha autorização, faça commit e push e me entregue as URLs do
    relatório e do código. Coloque a aplicação para rodar localmente e me passe
    também a URL de demonstração e o comando para encerrá-la.

Não peça confirmação durante a avaliação. Pare apenas antes de commit/push ou
se faltar a sessão correta, houver risco de segredo, falha de infraestrutura ou
alguma inconsistência capaz de tornar o resultado injusto.
```

## Receita reutilizável para modelos futuros

Crie o `run-id` neste formato:

```text
<modelo>__<provider>__AAAA-MM-DD
```

Use letras minúsculas, números e hífens no nome do modelo. Exemplos:

```text
gpt-6-astra__openrouter__2026-09-06
modelo-novo__openrouter__2026-10-15
```

Depois repita a sequência:

```powershell
cd <caminho-do-repositorio>\eli-llm-bench
.\internal\runner\prepare-template.ps1
Copy-Item -Recurse .\workspaces\_template .\workspaces\<run-id>
.\internal\runner\preflight.ps1
cd .\workspaces\<run-id>\project
opencode --pure --auto
```

No OpenCode, escolha o modelo, use `high` ou o equivalente disponível, cole o
conteúdo integral de `..\prompt.txt` uma vez e aguarde. Ao final, substitua os
campos do pedido pronto acima e envie-o ao Codex.

## Se quiser avaliar manualmente

O comando determinístico é:

```powershell
cd <caminho-do-repositorio>\eli-llm-bench\internal\evaluator
npm run evaluate -- --project ..\..\workspaces\<run-id>\project --run-id <run-id>
```

Os artefatos privados ficam em:

```text
internal/evaluator/.artifacts/<run-id>/
```

Rodar o avaliador não modifica o projeto participante e não atualiza sozinho o
ranking público.
