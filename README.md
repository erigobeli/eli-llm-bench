# Eli LLM Bench

Benchmark público para comparar modelos de IA programando o mesmo Mini CRM com
OpenCode e OpenRouter.

Cada modelo começa em um diretório praticamente vazio, recebe exatamente um
prompt e precisa entregar uma aplicação funcional. Depois, uma suíte externa
instala, compila, inicia e testa o projeto sem pedir ajuda ao modelo.

O objetivo é responder de forma simples:

- quanto do sistema realmente funciona;
- quanto tempo o modelo levou;
- quanto custou no OpenRouter;
- quantos turnos e tokens foram usados;
- como o resultado se compara aos modelos anteriores.

Em uma frase, a pergunta do Eli LLM Bench é:

> **Quanto custa e quanto demora para um modelo construir o mesmo aplicativo
> funcional, com um único prompt e requisitos verificáveis?**

Ele não pretende determinar qual é a melhor IA para programar qualquer tipo de
projeto. O resultado mede uma tarefa específica, executada com uma configuração
específica.

## Ranking

<!-- leaderboard:start -->

| # | Modelo | Provider | Raciocínio | Nota | Tempo | Custo | Vídeo |
|---:|---|---|---|---:|---:|---:|---|
| 1 | [anthropic/claude-opus-5](./results/claude-opus-5__openrouter__2026-07-29/report.md) | openrouter | high | 100/100 | 44m 52s | US$ 4.04 | — |
| 2 | [anthropic/claude-sonnet-5](./results/claude-sonnet-5__openrouter__2026-07-29/report.md) | openrouter | high | 96/100 | 11m 15s | US$ 1.46 | — |
| 3 | [anthropic/claude-opus-4.8](./results/claude-opus-4-8__openrouter__2026-07-29/report.md) | openrouter | high | 96/100 | 11m 20s | US$ 2.54 | — |

<!-- leaderboard:end -->

`Custo` é somente o valor cobrado pela criação do projeto. `Tempo` vai do envio
do prompt ao encerramento da sessão. `Vídeo` aponta para a demonstração publicada
no YouTube. Clique no nome do modelo para abrir o relatório completo da execução.

## O desafio

O modelo precisa construir um Mini CRM em português do Brasil com:

- nome **CRMBench Modelo** no navegador e na interface;
- cadastro, edição e exclusão de clientes;
- cadastro, edição e exclusão de negócios;
- busca e paginação visível com 4 registros por página nas listagens;
- filtros de negócios e visualização dos negócios de cada cliente;
- quatro etapas comerciais em um pipeline;
- mudança de etapa persistida no SQLite, incluindo drag-and-drop;
- três indicadores calculados a partir do banco;
- interface responsiva com visual de CRM empresarial;
- API, validações, build e uma pequena suíte de testes.

Não há login, Docker, IA dentro do produto nem serviço externo. O escopo foi
deliberadamente mantido pequeno para que o benchmark seja sustentável em vários
lançamentos de modelos.

O [CONTRACT.md](./CONTRACT.md) é o contrato do desafio. Ele descreve o que deve
ser entregue, a stack permitida, as proibições e os comportamentos verificáveis.
Esse mesmo contrato é inserido integralmente no prompt de todos os participantes.

## Como a nota é calculada

A nota vai de 0 a 100 e é totalmente objetiva. Não existe juiz de IA na v1.

O [scoring.json](./scoring.json) publica os 22 checks, seus pesos e o requisito
correspondente. O código do avaliador fica privado durante a temporada, mas ele
só pode pontuar comportamentos anunciados no contrato e no scoring.

Os checks cobrem:

| Área | Pontos |
|---|---:|
| Instalação e execução | 14 |
| API de clientes | 18 |
| API de negócios | 23 |
| Indicadores | 8 |
| Pipeline | 17 |
| Fluxos da interface | 15 |
| Testes e documentação | 5 |
| **Total** | **100** |

Cada check passa e recebe todos os seus pontos, falha e recebe zero, ou fica
`skipped` quando uma dependência física não funcionou. Por exemplo: sem a
aplicação iniciar, não existe evidência possível de que o CRUD visual funciona.

No pipeline, os 17 pontos são graduais: 6 verificam as colunas e cartões, 6
verificam se alguma interação visual muda e persiste a etapa, e 5 exigem
especificamente drag-and-drop persistente. Assim, botões ou select funcionais
recebem parte dos pontos, mas não substituem a experiência de arrastar cartões.

O avaliador também gera um `report.md` automático, em linguagem acessível,
explicando o que funcionou e o que falhou. Evidência técnica aparece somente
quando ajuda a entender o problema.

## Como uma execução oficial funciona

1. Uma pasta limpa é criada a partir do template local.
2. O modelo, provider e raciocínio são selecionados no OpenCode.
3. O fallback de provider permanece desligado.
4. O conteúdo de `prompt.txt` é enviado uma única vez.
5. O agente trabalha sozinho até concluir ou atingir um limite.
6. A sessão exportada fornece tempo, custo, turnos, ferramentas e tokens.
7. O avaliador testa uma cópia descartável do projeto.
8. A nota e o relatório são publicados com o código gerado.

Não há prompt de correção na nota oficial. Se uma correção for pedida depois para
o vídeo, ela não altera o resultado.

Configuração da v1:

- Windows 11 x64;
- OpenCode;
- OpenRouter;
- reasoning `high` ou equivalente mais próximo;
- sem fallback;
- limite técnico de 60 minutos, 150 turnos e US$ 8;
- um único prompt.

Tempo e custo são metadados e não mudam a nota. Consulte
[RUN_PROTOCOL.md](./RUN_PROTOCOL.md) para as regras completas.

## Receita para executar um modelo

Os comandos abaixo pressupõem a estrutura local do operador, com `public/`,
`internal/` e `workspaces/` dentro de `eli-llm-bench/`. Substitua `<run-id>` por
um identificador único, por exemplo
`claude-haiku__subscription__2026-07-29`.

### 1. Preparar o workspace

Abra o PowerShell na raiz local do projeto:

```powershell
cd C:\caminho\para\eli-llm-bench
```

Atualize o template com o contrato, os limites e o seed vigentes:

```powershell
.\internal\runner\prepare-template.ps1
```

Crie a pasta da nova execução sem alterar o `_template`:

```powershell
Copy-Item -Recurse .\workspaces\_template .\workspaces\<run-id>
```

Imediatamente antes de abrir o agente, execute o pré-voo:

```powershell
.\internal\runner\preflight.ps1
```

O pré-voo encerra apenas um servidor residual pertencente aos workspaces do
benchmark. Se outro programa estiver usando a porta `3000`, ele interrompe o
procedimento para que o conflito seja resolvido antes de consumir tokens.

### 2. Criar a aplicação com o OpenCode

Entre na pasta vazia em que o modelo deve construir a aplicação:

```powershell
cd .\workspaces\<run-id>\project
opencode --pure --auto
```

Dentro do OpenCode:

1. Use `/model` e selecione o modelo e o provider exatos.
2. Selecione raciocínio `high`, ou o equivalente mais próximo disponível.
3. Confirme que o fallback de provider está desligado.
4. Copie todo o conteúdo de `..\prompt.txt` e envie uma única vez.
5. Não envie correções nem intervenha até a sessão terminar ou atingir um
   limite.

Ao final, exporte a sessão antes de fechar o OpenCode. A exportação será usada
para registrar tempo, custo, tokens, turnos e chamadas de ferramentas.

### 3. Gerar a nota

Volte à raiz e execute novamente o pré-voo para remover um servidor que tenha
ficado aberto:

```powershell
cd C:\caminho\para\eli-llm-bench
.\internal\runner\preflight.ps1
```

Entre no avaliador privado e teste o projeto gerado:

```powershell
cd .\internal\evaluator
npm run evaluate -- --project ..\..\workspaces\<run-id>\project --run-id <run-id>
```

Esse comando instala, prepara o banco, compila, inicia e testa uma cópia
descartável do projeto. O código produzido pelo modelo não é modificado. O
resultado fica em:

```text
internal/evaluator/.artifacts/<run-id>/
├── evaluation.json
└── report.md
```

`evaluation.json` contém a pontuação por check. `report.md` apresenta o
resultado em linguagem mais simples para uso no vídeo e na publicação.

### 4. Publicar o resultado e atualizar o ranking

Você não pede a outra IA para dar a nota. O comando do passo anterior executa o
avaliador determinístico e já produz a nota e a explicação de cada check.

Depois da avaliação, o operador monta:

```text
public/results/<run-id>/
├── result.json
├── report.md
├── screenshots/
└── project/
```

O `result.json` combina a nota do `evaluation.json` com tempo, custo, tokens,
turnos e configuração extraídos da sessão exportada do OpenCode. Seu formato é
definido por [`schemas/result.schema.json`](./schemas/result.schema.json).

Antes de publicar, revise se o projeto e o relatório não contêm chaves, cookies,
arquivos `.env`, caminhos pessoais ou logs brutos. Em seguida, dentro de
`public/`, execute:

```powershell
node .\scripts\update-ranking.mjs
```

O script lê todos os `results/*/result.json`, considera somente resultados
`COMPLETE`, ordena por nota, custo e tempo e reescreve exclusivamente a seção
delimitada do ranking neste README. Ele não cria a nota e não chama uma IA.

Na primeira execução oficial, a montagem do `result.json` será conferida
manualmente contra a exportação do OpenCode. Depois de conhecermos o formato
real dessa exportação, essa conversão poderá ser automatizada sem alterar a
metodologia nem a pontuação.

## O que o resultado não prova

Este benchmark possui limitações deliberadas:

- usa uma única tarefa: construir um Mini CRM full-stack em Node e React;
- mede o conjunto `modelo + OpenCode + provider + configuração`, não o modelo
  isoladamente;
- uma execução oficial por configuração não estima toda a variação possível
  entre tentativas;
- não mede manutenção de grandes bases existentes, outras linguagens, algoritmos
  ou todos os tipos de trabalho de programação;
- o acabamento visual é demonstrado, mas não recebe pontos subjetivos;
- soluções publicadas podem influenciar modelos futuros, embora cada execução
  comece limpa e os testes externos permaneçam privados;
- somente resultados produzidos pela mesma versão do contrato e do avaliador
  devem ser comparados diretamente.

O ranking deve ser interpretado dentro desse recorte. Ele mostra qualidade
funcional, custo e tempo para esta tarefa — não uma capacidade universal.

## Aplicação de referência

Existe uma aplicação de referência privada que implementa o mesmo contrato. Ela
não participa do ranking, não é entregue aos modelos e não ensina o avaliador a
reconhecer uma arquitetura específica.

Sua função é testar o próprio benchmark: se uma implementação conhecida como
correta não atingir 100/100, o defeito está no contrato ou no avaliador. A
referência compacta atingiu **100/100 em três execuções limpas consecutivas**
antes do primeiro teste oficial.

Pilotos com implementações independentes ajudaram a remover do avaliador
suposições sobre textos, paginação e componentes específicos. Eles são usados
somente para calibrar o instrumento e não aparecem no ranking oficial.

## Transparência

Ficam públicos:

- contrato, prompt, seed, scoring, limites e schemas;
- nota e resultado de cada check;
- tempo, custo, tokens e motivo do encerramento;
- relatório em linguagem simples;
- código produzido em cada execução oficial;
- link do vídeo, quando existir.

Ficam privados durante a temporada:

- implementação dos testes externos;
- aplicação de referência;
- logs brutos que possam conter informações sensíveis.

Assim, o público sabe exatamente o que foi exigido e quanto cada comportamento
vale, sem entregar ao participante o código das asserções.

## Estrutura do repositório público

```text
eli-llm-bench/
├── README.md
├── CONTRACT.md
├── RUN_PROTOCOL.md
├── AMBIGUITIES.md
├── CHANGELOG.md
├── LICENSE
├── scoring.json
├── prompts/
│   └── build.md
├── assets/
│   └── seed-data.json
├── config/
│   └── benchmark.json
├── schemas/
│   ├── result.schema.json
│   └── scoring.schema.json
└── results/
    └── <run-id>/
        ├── result.json
        ├── report.md
        └── project/
```

Na máquina do operador, `public/`, `internal/` e `workspaces/` são pastas irmãs.
Somente `public/` é enviado a este repositório. `workspaces/` é temporário; o
código de uma execução oficial só é publicado depois de copiado para
`results/<run-id>/project/` e revisado.

## Status

- [x] Escopo compacto definido.
- [x] Contrato, seed, prompt e 22 checks objetivos preparados.
- [x] Avaliador externo implementado.
- [x] Aplicação de referência validada três vezes em 100/100.
- [x] Piloto barato do fluxo compacto.
- [ ] Primeiras execuções oficiais.
- [ ] Tag pública `v1.0.0`.

## Origem

A principal inspiração metodológica foi o
[llm-coding-benchmark](https://github.com/akitaonrails/llm-coding-benchmark), de
Fábio Akita: comparar agentes fazendo todos construírem o mesmo sistema real.

O Eli LLM Bench aplica esse princípio a um desenho próprio: Mini CRM em Node e
React, 22 verificações externas valendo 100 pontos, um único prompt e publicação
de custo, tempo, uso e código produzido.

## Licença

Distribuído sob a [licença MIT](./LICENSE).
